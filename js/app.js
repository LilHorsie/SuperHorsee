"use strict";

const appState = {
    currentTab: 'hdb-section',
    hdbData: [],
    mallData: [],
    searchQuery: "",
    hdbSortDesc: true,
    sortByDistance: false,
    lastUpdated: new Date()
};

// --- Map Setup ---
let map;
let markerLayerGroup;
// Define Singapore SVY21 Projection for Proj4
proj4.defs("EPSG:3414","+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs");

const API = {
    // If you are testing locally and the GitHub URL still fails, change these to your local file paths!
    HDB_STATIC: "https://raw.githubusercontent.com/lilhorsie/SuperHorsee/main/data/HDBCarparkInformation.json",
    MALL_STATIC: "https://raw.githubusercontent.com/lilhorsie/SuperHorsee/main/data/compiled_all_singapore_shopping_malls_carpark.json",
    HDB_LIVE: "https://api.data.gov.sg/v1/transport/carpark-availability"
};

const elements = {
    tabs: document.querySelectorAll('.tabs .tab-btn'),
    contents: document.querySelectorAll('.tab-content'),
    searchInput: document.getElementById('searchInput'),
    clearBtn: document.getElementById('clearBtn'),
    nearMeBtn: document.getElementById('nearMeBtn'),
    noResultsMsg: document.getElementById('noResults'),
    hdbBody: document.getElementById('hdbGridBody'),
    mallBody: document.getElementById('mallTableBody'),
    themeToggle: document.getElementById('themeToggle'),
    sortHdb: document.getElementById('sortHdb'),
    toastContainer: document.getElementById('toastContainer'),
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdatedText: document.getElementById('lastUpdatedText')
};

const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2500);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast(`📋 Copied: ${text}`));
}

function getAvailabilityBadge(availableLots) {
    if (availableLots === "N/A") return `<span class="badge badge-gray">N/A</span>`;
    const lots = parseInt(availableLots);
    if (lots === 0) return `<span class="badge badge-red">Full</span>`;
    if (lots < 10) return `<span class="badge badge-red">Almost Full (${lots})</span>`;
    if (lots <= 50) return `<span class="badge badge-orange">Filling (${lots})</span>`;
    return `<span class="badge badge-green">Available (${lots})</span>`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

// --- Initialize Interactive Map ---
function initMap() {
    map = L.map('map').setView([1.3521, 103.8198], 11); 
    // Clean, Monotone Map Tile
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(map);
    markerLayerGroup = L.layerGroup().addTo(map);
}

window.panToMap = function(lat, lng, title) {
    if (lat && lng) {
        map.setView([lat, lng], 16);
        showToast(`📍 Panning map to ${title}`);
    } else {
        showToast(`❌ Location data unavailable for ${title}`);
    }
};

async function initApp() {
    initMap(); 
    showToast("🔄 Loading data...");
    
    try {
        const [hdbInfoRes, mallRes] = await Promise.all([ fetch(API.HDB_STATIC), fetch(API.MALL_STATIC) ]);
        const hdbInfo = await hdbInfoRes.json();
        const mallDataRaw = await mallRes.json();

        // Parse HDB Data
        appState.hdbData = hdbInfo.map(carpark => {
            let lat = null, lng = null;
            const x = parseFloat(carpark.x_coord);
            const y = parseFloat(carpark.y_coord);
            
            if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
                const wgs84 = proj4("EPSG:3414", "EPSG:4326", [x, y]);
                lng = wgs84[0];
                lat = wgs84[1];
            }

            return {
                number: carpark.car_park_no.trim(),
                address: carpark.address,
                searchStr: cleanText(`${carpark.car_park_no} ${carpark.address}`),
                lat: lat,
                lng: lng,
                type: carpark.car_park_type,
                available: "N/A", total: "N/A", moto: null, heavy: null
            };
        });

        // Parse Mall Data with Bulletproof Coordinate Fallbacks
        appState.mallData = mallDataRaw.map(mall => {
            let lat = mall.latitude || mall.lat || null;
            let lng = mall.longitude || mall.lng || null;

            // Fallback: Convert SVY21 x/y if Lat/Lng is missing
            if (!lat && !lng && mall.x_coord && mall.y_coord) {
                const x = parseFloat(mall.x_coord);
                const y = parseFloat(mall.y_coord);
                if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
                    const wgs84 = proj4("EPSG:3414", "EPSG:4326", [x, y]);
                    lng = wgs84[0];
                    lat = wgs84[1];
                }
            }

            return { 
                ...mall, 
                searchStr: cleanText(mall.mall_name || ''),
                lat: lat,
                lng: lng
            };
        });

        await fetchLiveHdbData(); 
        renderCurrentTab();
        setInterval(updateTimeAgo, 60000); 
        setInterval(fetchLiveHdbData, 300000); 

    } catch (error) {
        console.error(error);
        showToast("❌ Failed to load static data.");
    }
}

async function fetchLiveHdbData(isManual = false) {
    if (isManual) {
        elements.refreshBtn.classList.add('spinning');
        showToast("🔄 Refreshing live availability...");
    }
    try {
        const hdbLiveRes = await fetch(API.HDB_LIVE);
        const hdbLive = await hdbLiveRes.json();
        const liveAvailability = hdbLive.items[0].carpark_data;

        appState.hdbData.forEach(carpark => {
            const match = liveAvailability.find(a => a.carpark_number.trim() === carpark.number);
            if (match) {
                const carLot = match.carpark_info.find(x => x.lot_type === "C");
                const motoLot = match.carpark_info.find(x => x.lot_type === "M");
                const heavyLot = match.carpark_info.find(x => x.lot_type === "Y");

                carpark.total = carLot ? carLot.total_lots : "N/A";
                carpark.available = carLot ? carLot.lots_available : "N/A";
                carpark.moto = motoLot ? { a: motoLot.lots_available, t: motoLot.total_lots } : null;
                carpark.heavy = heavyLot ? { a: heavyLot.lots_available, t: heavyLot.total_lots } : null;
            }
        });

        appState.lastUpdated = new Date();
        updateTimeAgo();
        if (appState.currentTab === 'hdb-section') renderCurrentTab();
        if (isManual) showToast("✅ Live data updated!");
    } catch (error) {
        if (isManual) showToast("❌ Failed to refresh live data.");
    } finally {
        if (isManual) elements.refreshBtn.classList.remove('spinning');
    }
}

function updateTimeAgo() {
    const now = new Date();
    const diffMins = Math.floor((now - appState.lastUpdated) / 60000);
    elements.lastUpdatedText.textContent = diffMins === 0 ? "Last updated: Just now" : `Last updated: ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
}

elements.refreshBtn.addEventListener('click', () => fetchLiveHdbData(true));

elements.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    elements.themeToggle.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
});

elements.sortHdb.addEventListener('click', () => {
    appState.hdbSortDesc = !appState.hdbSortDesc;
    appState.sortByDistance = false; 
    renderCurrentTab();
    showToast(`↕️ Sorted by ${appState.hdbSortDesc ? 'Highest' : 'Lowest'} Availability`);
});

elements.nearMeBtn.addEventListener('click', () => {
    if (!navigator.geolocation) return showToast("❌ Geolocation is not supported by your browser.");

    showToast("📍 Locating you...");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            
            // Calculate distance for HDBs
            appState.hdbData.forEach(carpark => {
                carpark.distance = (carpark.lat && carpark.lng) 
                    ? calculateDistance(userLat, userLon, carpark.lat, carpark.lng) 
                    : Infinity;
            });

            // Calculate distance for Malls
            appState.mallData.forEach(mall => {
                mall.distance = (mall.lat && mall.lng) 
                    ? calculateDistance(userLat, userLon, mall.lat, mall.lng) 
                    : Infinity;
            });

            appState.sortByDistance = true;
            elements.searchInput.value = "";
            appState.searchQuery = ""; 
            
            map.setView([userLat, userLon], 14);
            L.circleMarker([userLat, userLon], { color: '#ef4444', radius: 8, fillOpacity: 1 }).addTo(markerLayerGroup).bindPopup("<b>📍 You are here</b>").openPopup();

            renderCurrentTab();
            showToast("✅ Showing nearest locations!");
        },
        () => showToast("❌ Unable to retrieve your location.")
    );
});

elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        elements.contents.forEach(c => c.classList.remove('active'));
        appState.currentTab = tab.getAttribute('data-target');
        document.getElementById(appState.currentTab).classList.add('active');
        
        elements.searchInput.value = ""; 
        appState.searchQuery = "";
        appState.sortByDistance = false;
        map.setView([1.3521, 103.8198], 11); 
        renderCurrentTab();
    });
});

function renderCurrentTab() {
    const query = appState.searchQuery;
    let hasResults = false;
    
    // WIPES the map clean every time rendering happens
    markerLayerGroup.clearLayers();

    if (appState.currentTab === 'hdb-section') {
        let filtered = appState.hdbData.filter(item => item.searchStr.includes(query));
        
        filtered.sort((a, b) => {
            if (appState.sortByDistance && a.distance !== undefined) return a.distance - b.distance;
            const valA = a.available === "N/A" ? -1 : parseInt(a.available);
            const valB = b.available === "N/A" ? -1 : parseInt(b.available);
            return appState.hdbSortDesc ? valB - valA : valA - valB;
        });

        hasResults = filtered.length > 0;
        const displayData = filtered.slice(0, 50); 
        
        elements.hdbBody.innerHTML = displayData.map(h => {
            const safeAddr = h.address ? h.address.replace(/'/g, "\\'") : '';
            return `
            <div class="carpark-card" onclick="panToMap(${h.lat}, ${h.lng}, '${safeAddr}')" title="Click to view on map">
                <div class="card-header">
                    <h3>${h.number}</h3>
                    ${getAvailabilityBadge(h.available)}
                </div>
                <div class="card-body">
                    <p class="address">${h.address}</p>
                    <div class="vehicle-tags">
                        <span class="v-tag car">🚗 ${h.available}/${h.total}</span>
                        ${h.moto ? `<span class="v-tag moto">🏍️ ${h.moto.a}/${h.moto.t}</span>` : ''}
                        ${h.heavy ? `<span class="v-tag heavy">🚛 ${h.heavy.a}/${h.heavy.t}</span>` : ''}
                    </div>
                    ${appState.sortByDistance && h.distance !== Infinity ? `<p class="distance">📍 ${h.distance.toFixed(2)} km away</p>` : ''}
                </div>
            </div>
        `}).join("");

        // Draw HDB Blue Pins
        displayData.forEach(h => {
            if (h.lat && h.lng) {
                const marker = L.circleMarker([h.lat, h.lng], {
                    radius: 6,
                    fillColor: h.available === "N/A" || h.available === "0" ? "#ef4444" : "#4F46E5",
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(markerLayerGroup);

                marker.bindPopup(`
                    <div style="font-family: Inter, sans-serif; font-size: 13px;">
                        <strong style="color: #4F46E5; font-size: 15px;">${h.number}</strong><br>
                        ${h.address}<br><br>
                        <strong>Type:</strong> ${h.type}<br>
                        <strong>Available:</strong> ${h.available} / ${h.total} Lots
                    </div>
                `);
            }
        });

    } else if (appState.currentTab === 'mall-section') {
        let filtered = appState.mallData.filter(item => item.searchStr.includes(query));
        
        if (appState.sortByDistance) {
            filtered.sort((a, b) => a.distance - b.distance);
        }

        hasResults = filtered.length > 0;
        const displayData = filtered.slice(0, 100);

        elements.mallBody.innerHTML = displayData.map(m => {
            const pricing = m.pricing || {};
            const wkdayBef = pricing.weekdays_before_5pm || 'N/A';
            const wkdayAft = pricing.weekdays_after_5pm || 'N/A';
            const sat = pricing.saturdays || 'N/A';
            
            const safeName = m.mall_name ? m.mall_name.replace(/'/g, "\\'") : 'Unknown Mall'; 
            
            return `
            <tr onclick="panToMap(${m.lat}, ${m.lng}, '${safeName}')" title="Click to view on map">
                <td>
                    <strong>${m.mall_name || 'Unknown'}</strong>
                    ${appState.sortByDistance && m.distance !== Infinity ? `<br><span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">📍 ${m.distance.toFixed(2)} km away</span>` : ''}
                </td>
                <td>${m.total_carpark_lots || 'N/A'}</td>
                <td>${wkdayBef}</td>
                <td>${wkdayAft}</td>
                <td>${sat}</td>
            </tr>
        `}).join("");

        // Draw Mall Green Pins Safely
        displayData.forEach(m => {
            if (m.lat && m.lng) {
                const marker = L.circleMarker([m.lat, m.lng], {
                    radius: 7,
                    fillColor: "#10B981", 
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(markerLayerGroup);

                const pricing = m.pricing || {};
                const wkdayBef = pricing.weekdays_before_5pm || 'N/A';
                const wkdayAft = pricing.weekdays_after_5pm || 'N/A';
                const sat = pricing.saturdays || 'N/A';

                marker.bindPopup(`
                    <div style="font-family: Inter, sans-serif; font-size: 13px;">
                        <strong style="color: #10B981; font-size: 15px;">${m.mall_name || 'Unknown Mall'}</strong><br>
                        <strong>Total Lots:</strong> ${m.total_carpark_lots || 'N/A'}<br><br>
                        <strong>Weekday (< 5PM):</strong> ${wkdayBef}<br>
                        <strong>Weekday (> 5PM):</strong> ${wkdayAft}<br>
                        <strong>Weekends:</strong> ${sat}
                    </div>
                `);
            }
        });
    }

    hasResults ? elements.noResultsMsg.classList.add('hidden') : elements.noResultsMsg.classList.remove('hidden');
}

elements.searchInput.addEventListener('input', (e) => {
    appState.searchQuery = cleanText(e.target.value);
    renderCurrentTab();
});

elements.clearBtn.addEventListener('click', () => {
    elements.searchInput.value = "";
    appState.searchQuery = "";
    appState.sortByDistance = false;
    map.setView([1.3521, 103.8198], 11); 
    renderCurrentTab();
});

window.onload = initApp;
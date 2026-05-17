"use strict";

const appState = {
    currentTab: 'hdb-section',
    hdbData: [],
    mallData: [],
    searchQuery: "",
    hdbSortDesc: true,
    map: null,
    mapMarkers: [],
    currentMapFilter: "all"
};

const API = {
    HDB_STATIC: "https://raw.githubusercontent.com/lilhorsie/SuperHorsee/main/data/HDBCarparkInformation.json",
    MALL_STATIC: "https://raw.githubusercontent.com/lilhorsie/SuperHorsee/main/data/compiled_all_singapore_shopping_malls_carpark.json",
    HDB_LIVE: "https://api.data.gov.sg/v1/transport/carpark-availability"
};

const elements = {
    tabs: document.querySelectorAll('.tab-btn'),
    contents: document.querySelectorAll('.tab-content'),
    searchInput: document.getElementById('searchInput'),
    clearBtn: document.getElementById('clearBtn'),
    noResultsMsg: document.getElementById('noResults'),
    hdbBody: document.getElementById('hdbTableBody'),
    mallBody: document.getElementById('mallTableBody'),
    themeToggle: document.getElementById('themeToggle'),
    sortHdb: document.getElementById('sortHdb'),
    toastContainer: document.getElementById('toastContainer'),
    backToTop: document.getElementById('backToTop'),
    globalSearchContainer: document.getElementById('globalSearchContainer'),
    mapFilter: document.getElementById('mapFilter'),
    mapTabBtn: document.getElementById('mapTabBtn')
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

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        elements.backToTop.classList.remove('hidden');
    } else {
        elements.backToTop.classList.add('hidden');
    }
});

elements.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`📋 Copied: ${text}`);
    });
}

function getAvailabilityBadge(availableLots) {
    if (availableLots === "N/A") return `<span class="badge badge-gray">N/A</span>`;
    const lots = parseInt(availableLots);
    if (lots === 0) return `<span class="badge badge-red">Full (0)</span>`;
    if (lots < 20) return `<span class="badge badge-orange">Filling (${lots})</span>`;
    return `<span class="badge badge-green">Available (${lots})</span>`;
}

function convertSVY21ToLatLng(N, E) {
    const doubleLineN = parseFloat(N);
    const doubleLineE = parseFloat(E);
    
    const latOrigin = 1.366666;
    const lonOrigin = 103.833333;
    const falseNorth = 38744.572;
    const falseEast = 28001.642;
    
    const radFactor = Math.PI / 180.0;
    const latOriginRad = latOrigin * radFactor;
    
    const semiMajor = 6378137.0;
    const flattening = 1.0 / 298.257223563;
    const semiMinor = semiMajor * (1.0 - flattening);
    const scaleFactor = 1.0;
    
    const eSquared = (2.0 * flattening) - (flattening * flattening);
    const ePrimeSquared = eSquared / (1.0 - eSquared);
    
    const M_Prime = (doubleLineN - falseNorth) / scaleFactor;
    
    const n = (semiMajor - semiMinor) / (semiMajor + semiMinor);
    const n2 = n * n;
    const n3 = n * n * n;
    
    const alpha = ((semiMajor + semiMinor) / 2.0) * (1.0 + (3.0 / 4.0) * n2 + (15.0 / 64.0) * n4());
    function n4() { return n3 * n; }
    
    const beta = (3.0 / 2.0) * n - (27.0 / 32.0) * n3;
    const gamma = (21.0 / 16.0) * n2 - (55.0 / 32.0) * n4();
    const delta = (151.0 / 96.0) * n3;
    
    const mu = M_Prime / alpha;
    const phi1Rad = mu + beta * Math.sin(2.0 * mu) + gamma * Math.sin(4.0 * mu) + delta * Math.sin(6.0 * mu);
    
    const sinPhi1 = Math.sin(phi1Rad);
    const cosPhi1 = Math.cos(phi1Rad);
    const tanPhi1 = Math.tan(phi1Rad);
    
    const rho1 = semiMajor * (1.0 - eSquared) / Math.pow(1.0 - eSquared * sinPhi1 * sinPhi1, 1.5);
    const nu1 = semiMajor / Math.sqrt(1.0 - eSquared * sinPhi1 * sinPhi1);
    
    const x = doubleLineE - falseEast;
    const D = x / (nu1 * scaleFactor);
    const D2 = D * D;
    const D3 = D2 * D;
    const D4 = D3 * D;
    const D5 = D4 * D;
    const D6 = D5 * D;
    
    const latRad = phi1Rad - (nu1 * tanPhi1 / rho1) * (D2 / 2.0 - (5.0 + 3.0 * tanPhi1 * tanPhi1 + 10.0 * (nu1 / rho1 - 1.0) - 9.0 * ePrimeSquared * cosPhi1 * cosPhi1) * D4 / 24.0 + (61.0 + 90.0 * tanPhi1 * tanPhi1 + 45.0 * Math.pow(tanPhi1, 4)) * D6 / 720.0);
    const lonRad = (D - (1.0 + 2.0 * tanPhi1 * tanPhi1 + ePrimeSquared * cosPhi1 * cosPhi1) * D3 / 6.0 + (5.0 + 28.0 * tanPhi1 * tanPhi1 + 24.0 * Math.pow(tanPhi1, 4) + 6.0 * ePrimeSquared * cosPhi1 * cosPhi1) * D5 / 120.0) / cosPhi1;
    
    return {
        lat: latRad / radFactor,
        lng: lonOrigin + (lonRad / radFactor)
    };
}

function initMapEngine() {
    if (appState.map) return;
    
    appState.map = L.map('map').setView([1.3521, 103.8198], 12);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(appState.map);
}

function getVisualArtwork(type) {
    const cleanType = (type || '').toUpperCase();
    let label = "🏢 MSCP";
    let bg = "linear-gradient(135deg, #6366F1, #4F46E5)";
    
    if (cleanType.includes("BASEMENT")) {
        label = "🚇 BASEMENT";
        bg = "linear-gradient(135deg, #4B5563, #1F2937)";
    } else if (cleanType.includes("SURFACE")) {
        label = "🚗 SURFACE";
        bg = "linear-gradient(135deg, #10B981, #059669)";
    }
    
    return `<div class="map-card-img" style="background:${bg};color:white;font-weight:bold;font-size:0.8rem;letter-spacing:1px;">${label}</div>`;
}

function plotDensityMarkers() {
    if (!appState.map) return;
    
    appState.mapMarkers.forEach(m => appState.map.removeLayer(m));
    appState.mapMarkers = [];
    
    const filterValue = appState.currentMapFilter;
    
    appState.hdbData.forEach(carpark => {
        if (!carpark.lat || !carpark.lng) return;
        
        const available = carpark.available === "N/A" ? -1 : parseInt(carpark.available);
        
        if (filterValue === "available" && available <= 20) return;
        if (filterValue === "filling" && (available <= 0 || available > 20)) return;
        if (filterValue === "full" && available !== 0) return;
        
        let color = "#10B981"; 
        let weight = 1;
        let opacity = 0.4;
        
        if (available === 0) {
            color = "#EF4444"; 
            opacity = 0.7;
        } else if (available < 20 && available > 0) {
            color = "#F59E0B"; 
            opacity = 0.6;
        }
        
        const densityCircle = L.circleMarker([carpark.lat, carpark.lng], {
            radius: available === 0 ? 9 : Math.min(14, 7 + (available / 35)),
            fillColor: color,
            fillOpacity: opacity,
            color: color,
            weight: weight
        });
        
        const descriptionCard = `
            <div class="map-card">
                ${getVisualArtwork(carpark.type)}
                <h3>${carpark.number}</h3>
                <p>${carpark.address}</p>
                <div class="map-card-meta">
                    <span>Total Lots: <b>${carpark.total}</b></span>
                    <span>Available: <b style="color:${color}">${carpark.available}</b></span>
                </div>
            </div>
        `;
        
        densityCircle.bindPopup(descriptionCard, { closeButton: false, offset: L.point(0, -2) });
        
        densityCircle.on('mouseover', function() {
            this.openPopup();
        });
        
        densityCircle.addTo(appState.map);
        appState.mapMarkers.push(densityCircle);
    });
}

async function initApp() {
    showToast("🔄 Testing data connections...");
    try {

        const hdbInfoRes = await fetch(API.HDB_STATIC);
        if (!hdbInfoRes.ok) throw new Error(`HDB Map Data Error: ${hdbInfoRes.status} (Check your GitHub raw link)`);
        const hdbInfo = await hdbInfoRes.json();


        const mallRes = await fetch(API.MALL_STATIC);
        if (!mallRes.ok) throw new Error(`Mall Data Error: ${mallRes.status} (Check your GitHub raw link)`);
        const mallDataRaw = await mallRes.json();


        const hdbLiveRes = await fetch(API.HDB_LIVE);
        if (!hdbLiveRes.ok) throw new Error(`Live API Error: ${hdbLiveRes.status} (Data.gov.sg might be down)`);
        const hdbLive = await hdbLiveRes.json();

  
        if (!hdbLive.items || hdbLive.items.length === 0) {
            throw new Error("Live API connected, but returned empty data.");
        }
        const liveAvailability = hdbLive.items[0].carpark_data;

  
        appState.hdbData = hdbInfo.map(carpark => {
            const number = carpark.car_park_no.trim();
            const match = liveAvailability.find(a => a.carpark_number.trim() === number);
            const carLot = match ? match.carpark_info.find(x => x.lot_type === "C") : null;
            
            let coords = { lat: null, lng: null };
            if (carpark.x_coord && carpark.y_coord && parseFloat(carpark.x_coord) !== 0) {
                coords = convertSVY21ToLatLng(carpark.y_coord, carpark.x_coord);
            }

            return {
                number: number,
                address: carpark.address,
                type: carpark.car_park_type || "MULTI-STOREY CAR PARK",
                total: carLot ? carLot.total_lots : "N/A",
                available: carLot ? carLot.lots_available : "N/A",
                lat: coords.lat,
                lng: coords.lng,
                searchStr: cleanText(`${number} ${carpark.address}`)
            };
        });

        appState.mallData = mallDataRaw.map(mall => ({
            ...mall,
            searchStr: cleanText(mall.mall_name)
        }));

        renderCurrentTab();
        showToast("✅ All systems go! Data loaded.");

    } catch (error) {
        console.error(error);
        showToast(`❌ ${error.message}`);
    }
}

elements.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    elements.themeToggle.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
});

elements.sortHdb.addEventListener('click', () => {
    appState.hdbSortDesc = !appState.hdbSortDesc;
    renderCurrentTab();
    showToast(`↕️ Sorted by ${appState.hdbSortDesc ? 'Highest' : 'Lowest'} Availability`);
});

elements.mapFilter.addEventListener('change', (e) => {
    appState.currentMapFilter = e.target.value;
    plotDensityMarkers();
});

elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        elements.contents.forEach(c => c.classList.remove('active'));
        
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        appState.currentTab = targetId;
        
        if (targetId === 'map-section') {
            elements.globalSearchContainer.classList.add('hidden');
            initMapEngine();
 
            setTimeout(() => {
                appState.map.invalidateSize();
                plotDensityMarkers();
            }, 450); 
            
        } else {
            elements.globalSearchContainer.classList.remove('hidden');
            elements.searchInput.value = ""; 
            appState.searchQuery = "";
            renderCurrentTab();
        }
    });
});

function renderCurrentTab() {
    const query = appState.searchQuery;
    let hasResults = false;

    if (appState.currentTab === 'hdb-section') {
        let filtered = appState.hdbData.filter(item => item.searchStr.includes(query));
        filtered.sort((a, b) => {
            const valA = a.available === "N/A" ? -1 : parseInt(a.available);
            const valB = b.available === "N/A" ? -1 : parseInt(b.available);
            return appState.hdbSortDesc ? valB - valA : valA - valB;
        });

        hasResults = filtered.length > 0;
        const displayData = query ? filtered : filtered.slice(0, 100); 
        
        elements.hdbBody.innerHTML = displayData.map(h => `
            <tr onclick="copyToClipboard('${h.address}')" title="Click to copy address">
                <td><strong>${h.number}</strong></td>
                <td>${h.address}</td>
                <td>${h.total}</td>
                <td>${getAvailabilityBadge(h.available)}</td>
            </tr>
        `).join("");
    } 
    else if (appState.currentTab === 'mall-section') {
        const filtered = appState.mallData.filter(item => item.searchStr.includes(query));
        hasResults = filtered.length > 0;

        elements.mallBody.innerHTML = filtered.map(m => `
            <tr onclick="copyToClipboard('${m.mall_name}')" title="Click to copy mall name">
                <td><strong>${m.mall_name}</strong></td>
                <td>${m.total_carpark_lots || 'N/A'}</td>
                <td>${m.pricing.weekdays_before_5pm}</td>
                <td>${m.pricing.weekdays_after_5pm}</td>
                <td>${m.pricing.saturdays}</td>
            </tr>
        `).join("");
    }

    if (appState.currentTab !== 'map-section') {
        hasResults ? elements.noResultsMsg.classList.add('hidden') : elements.noResultsMsg.classList.remove('hidden');
    } else {
        elements.noResultsMsg.classList.add('hidden');
    }
}

elements.searchInput.addEventListener('input', (e) => {
    appState.searchQuery = cleanText(e.target.value);
    renderCurrentTab();
});

elements.clearBtn.addEventListener('click', () => {
    elements.searchInput.value = "";
    appState.searchQuery = "";
    renderCurrentTab();
});

window.onload = initApp;
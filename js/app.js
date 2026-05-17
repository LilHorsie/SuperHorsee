"use strict";

const appState = {
    currentTab: 'hdb-section',
    hdbData: [],
    mallData: [],
    searchQuery: "",
    hdbSortDesc: true
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
    loadingMsg: document.getElementById('loadingMessage'),
    errorMsg: document.getElementById('errorMessage'),
    noResultsMsg: document.getElementById('noResults'),
    hdbBody: document.getElementById('hdbTableBody'),
    mallBody: document.getElementById('mallTableBody'),
    themeToggle: document.getElementById('themeToggle'),
    sortHdb: document.getElementById('sortHdb')
};

const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

function getAvailabilityBadge(availableLots) {
    if (availableLots === "N/A") return `<span class="badge badge-gray">N/A</span>`;
    const lots = parseInt(availableLots);
    if (lots === 0) return `<span class="badge badge-red">Full (0)</span>`;
    if (lots < 20) return `<span class="badge badge-orange">Filling (${lots})</span>`;
    return `<span class="badge badge-green">Available (${lots})</span>`;
}

async function initApp() {
    try {
        const [hdbInfoRes, hdbLiveRes, mallRes] = await Promise.all([
            fetch(API.HDB_STATIC),
            fetch(API.HDB_LIVE),
            fetch(API.MALL_STATIC)
        ]);

        if (!hdbInfoRes.ok || !hdbLiveRes.ok || !mallRes.ok) throw new Error("Data fetch failed");

        const hdbInfo = await hdbInfoRes.json();
        const hdbLive = await hdbLiveRes.json();
        const mallDataRaw = await mallRes.json();
        
        const liveAvailability = hdbLive.items[0].carpark_data;

        appState.hdbData = hdbInfo.map(carpark => {
            const number = carpark.car_park_no.trim();
            const match = liveAvailability.find(a => a.carpark_number.trim() === number);
            const carLot = match ? match.carpark_info.find(x => x.lot_type === "C") : null;

            return {
                number: number,
                address: carpark.address,
                total: carLot ? carLot.total_lots : "N/A",
                available: carLot ? carLot.lots_available : "N/A",
                searchStr: cleanText(`${number} ${carpark.address}`)
            };
        });

        appState.mallData = mallDataRaw.map(mall => ({
            ...mall,
            searchStr: cleanText(mall.mall_name)
        }));

        elements.loadingMsg.classList.add('hidden');
        renderCurrentTab();

    } catch (error) {
        console.error(error);
        elements.loadingMsg.classList.add('hidden');
        elements.errorMsg.textContent = "Failed to load application data. Please try again later.";
        elements.errorMsg.classList.remove('hidden');
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
});

elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        elements.contents.forEach(c => c.classList.remove('active'));
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        appState.currentTab = targetId;
        elements.searchInput.value = ""; 
        appState.searchQuery = "";
        renderCurrentTab();
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
            <tr>
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
            <tr>
                <td><strong>${m.mall_name}</strong></td>
                <td>${m.total_carpark_lots || 'N/A'}</td>
                <td>${m.pricing.weekdays_before_5pm}</td>
                <td>${m.pricing.weekdays_after_5pm}</td>
                <td>${m.pricing.saturdays}</td>
            </tr>
        `).join("");
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
    renderCurrentTab();
});

window.onload = initApp;
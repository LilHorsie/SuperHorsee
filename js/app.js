"use strict";

// Application state management
const appState = {
    currentTab: 'hdb-section',
    hdbData: [],
    mallData: [],
    searchQuery: "",
    hdbSortDesc: true
};

// API endpoints and file paths
const API = {
    HDB_STATIC: "data/HDBCarparkInformation.json",
    HDB_LIVE: "https://api.data.gov.sg/v1/transport/carpark-availability",
    MALL_STATIC: "data/all_singapore_shopping_malls_carpark.json"
};

// Cached DOM elements for better performance
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

/**
 * function to normalize strings for search matching.
 * converts text to lowercase, removes special characters, and trims extra spaces
 * so that user searches match the data more reliably.
 */
const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Generates an HTML badge element representing the current availability status.
 * Returns different colors and text formats based on the number of available lots 
 * (e.g., Red for full, Orange for filling, Green for available).
 */
function getAvailabilityBadge(availableLots) {
    if (availableLots === "N/A") return `<span class="badge badge-gray">N/A</span>`;
    const lots = parseInt(availableLots);
    if (lots === 0) return `<span class="badge badge-red">Full (0)</span>`;
    if (lots < 20) return `<span class="badge badge-orange">Filling (${lots})</span>`;
    return `<span class="badge badge-green">Available (${lots})</span>`;
}

/**
 * Main initialization function that runs when the app first loads.
 * 1. Fetches static HDB info, live HDB availability, and static Mall data concurrently.
 * 2. Merges the live HDB availability data into the static HDB array.
 * 3. Prepares optimized search strings for both datasets.
 * 4. Hides the loading UI and triggers the initial page render.
 */
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

// Event Listener: Toggles the application's visual theme between light and dark mode.
elements.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    elements.themeToggle.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
});

// Event Listener: Toggles the sorting order (ascending vs. descending) for the HDB availability column.
elements.sortHdb.addEventListener('click', () => {
    appState.hdbSortDesc = !appState.hdbSortDesc;
    renderCurrentTab();
});

// Event Listeners: Handles navigation between the 'HDB' and 'Mall' tabs.
// It resets the search query when switching tabs to ensure a clean view.
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

/**
 * Core rendering engine for the UI.
 * 1. Checks which tab is currently active.
 * 2. Filters the respective data (HDB or Malls) based on the current search query.
 * 3. Applies sorting logic (if viewing the HDB tab).
 * 4. Generates HTML table rows and injects them into the DOM.
 * 5. Displays or hides the "No Results" message based on the filtered output.
 */
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
        // Optimization: Only render the first 20 results if there is no specific search query
        const displayData = query ? filtered : filtered.slice(0, 20); 
        
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

// Event Listener: Captures what the user types in the search bar, cleans it, and updates the view.
elements.searchInput.addEventListener('input', (e) => {
    appState.searchQuery = cleanText(e.target.value);
    renderCurrentTab();
});

// Event Listener: Clears the search box and resets the view to show all default data.
elements.clearBtn.addEventListener('click', () => {
    elements.searchInput.value = "";
    appState.searchQuery = "";
    renderCurrentTab();
});

// Bootstraps the application by running the initApp function once the window finishes loading.
window.onload = initApp;
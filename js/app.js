"use strict";

// Centralized application state to keep track of UI and data changes
const appState = {
    currentTab: 'hdb-section',
    hdbData: [],
    mallData: [],
    searchQuery: "",
    hdbSortDesc: true
};

// API endpoints and file paths for fetching carpark data
const API = {
    HDB_STATIC: "data/HDBCarparkInformation.json",
    HDB_LIVE: "https://api.data.gov.sg/v1/transport/carpark-availability",
    MALL_STATIC: "data/all_singapore_shopping_malls_carpark.json"
};

// Cached DOM elements to avoid repeatedly querying the DOM
const elements = {
    tabs: document.querySelectorAll('.tab-btn'),
    contents: document.querySelectorAll('.tab-content'),
    searchInput: document.getElementById('searchInput'),
    clearBtn: document.getElementById('clearBtn'),
    loadingMsg: document.getElementById('loadingMessage'),
    errorMsg: document.getElementById('errorMessage'),
    hdbBody: document.getElementById('hdbTableBody'),
    mallBody: document.getElementById('mallTableBody'),
    themeToggle: document.getElementById('themeToggle'),
    sortHdb: document.getElementById('sortHdb'),
    noResultsMsg: document.getElementById('noResults')
};

/**
 * Normalizes text to improve search accuracy.
 * Converts to lowercase, removes special characters, and strips extra whitespace.
 * * @param {string} text - The raw string to clean.
 * @returns {string} The cleaned, normalized string.
 */
const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Generates an HTML badge element indicating the availability status of a carpark.
 * Applies different CSS classes (colors) based on the number of available lots.
 * * @param {string|number} availableLots - The number of lots available, or "N/A".
 * @returns {string} An HTML string containing the appropriate status badge.
 */
function getAvailabilityBadge(availableLots) {
    if (availableLots === "N/A") return `<span class="badge badge-gray">N/A</span>`;
    
    const lots = parseInt(availableLots);
    if (lots === 0) return `<span class="badge badge-red">Full (0)</span>`;
    if (lots < 20) return `<span class="badge badge-orange">Filling (${lots})</span>`;
    return `<span class="badge badge-green">Available (${lots})</span>`;
}

/**
 * Initializes the application on load.
 * Fetches static HDB, live HDB, and static Mall data concurrently.
 * Merges the live availability data into the static HDB array, sets up
 * searchable strings, and triggers the initial UI render.
 */
async function initApp() {
    try {
        // Fetch all three data sources at the same time for better performance
        const [hdbInfoRes, hdbLiveRes, mallRes] = await Promise.all([
            fetch(API.HDB_STATIC),
            fetch(API.HDB_LIVE),
            fetch(API.MALL_STATIC)
        ]);

        // Throw an error if any of the network requests fail
        if (!hdbInfoRes.ok || !hdbLiveRes.ok || !mallRes.ok) throw new Error("Data fetch failed");

        // Parse the JSON responses
        const hdbInfo = await hdbInfoRes.json();
        const hdbLive = await hdbLiveRes.json();
        const mallDataRaw = await mallRes.json();
        
        // Extract the live data array from the API response structure
        const liveAvailability = hdbLive.items[0].carpark_data;

        // Map through static HDB data and attach live availability where possible
        appState.hdbData = hdbInfo.map(carpark => {
            const number = carpark.car_park_no.trim();
            const match = liveAvailability.find(a => a.carpark_number.trim() === number);
            // "C" denotes car parking lots (ignoring motorcycles/heavy vehicles)
            const carLot = match ? match.carpark_info.find(x => x.lot_type === "C") : null;

            return {
                number: number,
                address: carpark.address,
                total: carLot ? carLot.total_lots : "N/A",
                available: carLot ? carLot.lots_available : "N/A",
                searchStr: cleanText(`${number} ${carpark.address}`) // Cached search string
            };
        });

        // Map mall data and generate a searchable string for each entry
        appState.mallData = mallDataRaw.map(mall => ({
            ...mall,
            searchStr: cleanText(mall.mall_name)
        }));

        // Hide the loading message and display the data
        elements.loadingMsg.classList.add('hidden');
        renderCurrentTab();

    } catch (error) {
        console.error(error);
        elements.loadingMsg.classList.add('hidden');
        elements.errorMsg.textContent = "Failed to load application data. Please try again later.";
        elements.errorMsg.classList.remove('hidden');
    }
}

// EVENT LISTENER: Toggles the site's theme between dark and light modes
elements.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    elements.themeToggle.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
});

// EVENT LISTENER: Reverses the sorting order for the HDB availability column and re-renders
elements.sortHdb.addEventListener('click', () => {
    appState.hdbSortDesc = !appState.hdbSortDesc;
    renderCurrentTab();
});

// EVENT LISTENERS: Handles UI tab switching between "HDB" and "Malls"
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs, add to the clicked one
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Hide all content sections, show the target section
        elements.contents.forEach(c => c.classList.remove('active'));
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Update application state and clear search filters when switching tabs
        appState.currentTab = targetId;
        elements.searchInput.value = ""; 
        appState.searchQuery = "";
        
        renderCurrentTab();
    });
});

/**
 * Core rendering function that updates the UI based on the current state.
 * Filters data based on the search query, sorts HDB data, 
 * builds the HTML table rows, and toggles the "No Results" message.
 */
function renderCurrentTab() {
    const query = appState.searchQuery;
    let hasResults = false;

    if (appState.currentTab === 'hdb-section') {
        // Filter HDB data based on the user's search query
        let filtered = appState.hdbData.filter(item => item.searchStr.includes(query));
        
        // Sort the filtered results by available lots (ascending or descending)
        filtered.sort((a, b) => {
            const valA = a.available === "N/A" ? -1 : parseInt(a.available);
            const valB = b.available === "N/A" ? -1 : parseInt(b.available);
            return appState.hdbSortDesc ? valB - valA : valA - valB;
        });

        hasResults = filtered.length > 0;
        
        // Performance optimization: If no search query, limit render to top 100 results
        const displayData = query ? filtered : filtered.slice(0, 100); 
        
        // Generate and inject HTML for HDB table rows
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
        // Filter Mall data based on the user's search query
        const filtered = appState.mallData.filter(item => item.searchStr.includes(query));
        hasResults = filtered.length > 0;

        // Generate and inject HTML for Mall table rows
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

    // Toggle the visibility of the "No Results" fallback message
    hasResults ? elements.noResultsMsg.classList.add('hidden') : elements.noResultsMsg.classList.remove('hidden');
}

// EVENT LISTENER: Updates search query state and re-renders table on every keystroke
elements.searchInput.addEventListener('input', (e) => {
    appState.searchQuery = cleanText(e.target.value);
    renderCurrentTab();
});

// EVENT LISTENER: Clears the search input and resets the table view
elements.clearBtn.addEventListener('click', () => {
    elements.searchInput.value = "";
    appState.searchQuery = "";
    renderCurrentTab();
});

// Bootstraps the application once the window is fully loaded
window.onload = initApp;
# Singapore Carpark & Mall Pricing App 🚗

An interactive web application designed to help drivers in Singapore quickly check live HDB carpark availability and compare shopping mall parking rates. 

Finding parking in Singapore can be stressful and expensive. This application provides a centralized, easy-to-use platform to check real-time lot availability and compare complex mall pricing structures before starting a journey.
 
## UX
 
This website is built for drivers in Singapore who want to save time and money when looking for parking. By providing immediate access to live availability and pricing data, the project helps users make informed decisions on where to park.

**User Stories:**
- As a driver, I want to search for a specific shopping mall, so that I can compare its weekday and weekend parking rates before I visit.
- As a commuter, I want to search for an HDB carpark using its street address or carpark number, so that I can see exactly how many lots are currently available.
- As a user, I want the system to tell me if no results match my search or if the data fails to load, so that I am not left guessing if the app is broken.

## Features

### Existing Features
- **Live HDB Carpark Availability** - allows users to view real-time car lot availability by pulling data from a live API and matching it with specific HDB addresses.
- **Mall Pricing Directory** - allows users to view a comprehensive table of shopping mall carpark rates, broken down by weekdays, weekends, and public holidays.
- **Smart Search functionality** - allows users to filter large datasets instantly by typing the name of a mall, address, or carpark number.
- **Error Handling UI** - provides graceful, user-friendly error messages if the external API fails to respond or if a search yields no results.

### Features Left to Implement
- **Geolocation Integration** - to automatically find and display the nearest available carparks based on the user's current GPS location.
- **Favorites System** - to let users bookmark specific malls or HDB carparks for quicker access in the future.

## Technologies Used

- [HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML)
    - The project uses **HTML5** for building the semantic structure of the web pages, ensuring accessibility through tags like `<header>`, `<main>`, and `<section>`.
- [CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS)
    - The project uses **CSS3** (specifically Flexbox) to create a clean, responsive layout that adapts to different screen sizes.
- [JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
    - The project uses **JavaScript** to handle asynchronous API calls (`fetch`), parse JSON data, and dynamically update the DOM based on user search inputs.

## Testing

Extensive manual testing was conducted to ensure all user stories are fulfilled and the application handles edge cases gracefully.

1. **HDB Availability Search:**
    1. Go to the "Carpark Lot Availability" page.
    2. Try to search for an invalid address (e.g., "zzzz") and verify that the "No results found" message appears.
    3. Clear the search and verify the full list repopulates.
    4. Disconnect the internet or manipulate the API URL to force a failure, and verify the red error banner appears telling the user the data failed to load.
2. **Mall Pricing Search:**
    1. Go to the "Singapore Mall Carpark Pricing" page.
    2. Type "Vivo" and verify that the table filters down only to VivoCity.
    3. Hit the "Enter" key inside the search bar and verify it triggers the search function properly.

**Responsiveness:** The layout was tested using Chrome Developer Tools across various screen sizes (Mobile S, Tablet, Desktop). The tables use `overflow-x: auto` to ensure they can be scrolled horizontally on small mobile screens without breaking the page layout.

## Deployment

The project is currently configured as a local development build. Because it utilizes the JavaScript `fetch()` API to read local JSON data files, running the HTML files directly from the file system will result in CORS errors. 

**To run this code locally:**
1. Open the project folder in an IDE like Visual Studio Code.
2. Ensure you have a local web server running (such as the "Live Server" extension).
3. Launch `index.html` via the local server.

*Note for future deployment: If deploying to GitHub Pages, ensure file paths to the `data/`, `css/`, and `js/` folders remain strictly relative.*

## Credits

### Content
- The live carpark availability data was retrieved from the [Data.gov.sg Carpark Availability API](https://beta.data.gov.sg/collections/229/view).
- Static HDB locations and Mall Pricing data were provided as part of the PF1 assignment data set.

### Acknowledgements
- I received inspiration for the structural requirements of this project from the PF1 Full Stack Development Interactive Application Assignment brief.
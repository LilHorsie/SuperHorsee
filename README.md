# SG Parking Hub 🚗

An interactive web application designed to help drivers in Singapore quickly check live HDB carpark availability and compare shopping mall parking rates. 

Finding parking in Singapore can be stressful and expensive. This application provides a centralized, easy-to-use platform to check real-time lot availability and compare complex mall pricing structures before starting a journey.
 
## UX
 
This website is built for drivers in Singapore who want to save time and money when looking for parking. By providing immediate access to live availability and pricing data, the project helps users make informed decisions on where to park.

**User Stories:**
- As a driver, I want to search for a specific shopping mall, so that I can compare its weekday and weekend parking rates before I visit. It is also good to find malls that have HDB Carparks nearby as mall carparks might be pricier and crowded during peak hours.
- As a commuter, I want to search for an HDB carpark using its street address or carpark number, so that I can see exactly how many lots are currently available.
- As a user, I want the system to tell me if no results match my search or if the data fails to load, so that I am not left guessing if the app is broken.

## Features Implemented

### Existing Features
- **Live HDB Carpark Availability** - allows users to view real-time car lot availability by pulling data from a live API and matching it with specific HDB addresses.
- **Mall Pricing Directory** - allows users to view a comprehensive table of shopping mall carpark rates, broken down by weekdays, weekends, and public holidays.
- **Search functionality** - allows users to filter large datasets instantly by typing the name of a mall, address, or carpark number.
- **Geolocation Integration** - to automatically find and display the nearest available carparks based on the user's current GPS location.
- **Map View** - to allow user to view the carpark locations on a live interactive map 
- **Dark Mode** - allows user to adjust screen display mode to suit their preference

### Features Left to Implement
- **Favorites System** - to let users bookmark specific malls or HDB carparks for quicker access in the future.

## Technologies Used

- **Visual Studio**
    - Used as the primary Integrated Development Environment (IDE) to write, edit, and manage the project's code.
- **Google Chrome**
    - Used as the primary web browser for testing the application's functionality, debugging, and checking responsiveness via Chrome Developer Tools.

## Testing

Extended manual testing was conducted to ensure all user interactive options are working. 
Tests to ensure that the functions are working (eg GPS, auto-refresh, live data)


1. **HDB Availability Search:**
    1. Go to the "Carpark Lot Availability" page.
    2. Try to search for an invalid address (e.g., "zzzz") and verify that the "No results found" message appears.
    3. Clear the search and verify the full list repopulates.
    4. Disconnect the internet or manipulate the API URL to force a failure, and verify the red error banner appears telling the user the data failed to load.
2. **Mall Pricing Search:**
    1. Go to the "Singapore Mall Carpark Pricing" page.
    2. Type "Vivo" and verify that the table filters down only to VivoCity.
    3. Hit the "Enter" key inside the search bar and verify it triggers the search function properly.

## Deployment

The project is currently deployed and hosted live on GitHub Pages. You can view the live site here: [https://lilhorsie.github.io/SuperHorsee/](https://lilhorsie.github.io/SuperHorsee/).

**To run this code locally:**
1. Clone or download the repository, then open the project folder in an IDE like Visual Studio Code.
2. Ensure you have a local web server running (such as the "Live Server" extension) to prevent CORS errors when the `fetch()` API reads local JSON data files.
3. Launch `index.html` via the local server.

## Credits

### Content
- The live carpark availability data was retrieved from the [Data.gov.sg Carpark Availability API](https://data.gov.sg/datasets?topics=housing|transport&resultId=d_ca933a644e55d34fe21f28b8052fac63#GET/transport/carpark-availability).
- Static HDB carpark locations data was retrieved from the [Data.gov.sg Detailed Carpark Information](https://data.gov.sg/datasets/d_23f946fa557947f93a8043bbef41dd09/view).

### Acknowledgements
- I received inspiration for the structural requirements of this project from the PF1 Full Stack Development Interactive Application Assignment brief.

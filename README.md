# Event-Explorer

Event Explorer is a web application that helps users discover local events, get weather information for the event location, and find directions. The app integrates with Ticketmaster for event data, Google Maps for geolocation and directions, and OpenWeather for weather forecasts.

## Overview

Event Explorer provides a comprehensive solution for discovering and planning attendance at local events. Key features include:

- Search for events by location and category
- View detailed event information including venue details
- Get real-time weather forecasts for event locations
- Find nearby restaurants and points of interest
- Get directions to event venues

Built with Node.js, Express, and Pug templates, Event Explorer offers a seamless experience for event discovery and planning.

# Installation

Create a .env file in the root of the project and add your API keys:

TICKETMASTER_API_KEY=your_ticketmaster_key

GOOGLE_MAPS_KEY=your_google_maps_key

OPENWEATHER_KEY=your_openweather_key

PORT=3000

Install dependencies: npm init -y

npm install express pug axios dotenv express-session @googlemaps/google-maps-services-js

npm install --save-dev nodemon

Run the application: npm run dev


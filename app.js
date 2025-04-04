require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Client } = require('@googlemaps/google-maps-services-js');
const path = require('path');
const session = require('express-session');

const app = express();
const mapsClient = new Client({});

// Configuration
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Helper function to convert degrees to cardinal direction
function getWindDirection(degrees) {
  if (degrees === undefined) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((degrees % 360) / 45) % 8;
  return directions[index];
}

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Enhanced Ticketmaster API Fetching Function
async function fetchEvents(location, category = null) {
  try {
    if (!process.env.TICKETMASTER_API_KEY) {
      throw new Error('Ticketmaster API key not configured');
    }

    // Geocode location to get coordinates
    const geocode = await mapsClient.geocode({
      params: { 
        address: location, 
        key: process.env.GOOGLE_MAPS_KEY 
      },
      timeout: 5000
    });

    if (!geocode.data.results.length) {
      throw new Error('Location not found');
    }

    const { lat, lng } = geocode.data.results[0].geometry.location;
    const radius = 50; // Search within 50km

    // Ticketmaster API request with geo-point
    const response = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
      params: {
        apikey: process.env.TICKETMASTER_API_KEY,
        geoPoint: `${lat},${lng}`,
        radius: radius,
        unit: 'km',
        size: 50,
        classificationName: category || 'music',
        sort: 'date,asc'
      },
      timeout: 8000
    });

    if (!response.data._embedded?.events) {
      throw new Error('No events found in this location');
    }

    // Process and return events with enhanced data
    return response.data._embedded.events.map(event => {
      const venue = event._embedded?.venues?.[0];
      return {
        id: event.id,
        name: event.name,
        description: event.info || event.description || '',
        url: event.url,
        start: new Date(event.dates.start.dateTime || event.dates.start.localDate),
        end: event.dates.end ? new Date(event.dates.end.dateTime || event.dates.end.localDate) : null,
        is_free: event.priceRanges ? false : true,
        venue: {
          name: venue?.name || 'Venue not specified',
          address: venue?.address?.line1 || '',
          city: venue?.city?.name || '',
          state: venue?.state?.stateCode || '',
          postalCode: venue?.postalCode || '',
          country: venue?.country?.countryCode || '',
          lat: venue?.location?.latitude,
          lng: venue?.location?.longitude,
          fullAddress: [
            venue?.address?.line1,
            venue?.city?.name,
            venue?.state?.stateCode,
            venue?.postalCode
          ].filter(Boolean).join(', ')
        },
        image: event.images?.find(img => img.ratio === '16_9' && img.width > 600)?.url || 
               event.images?.[0]?.url || 
               '/images/default-event.jpg'
      };
    });

  } catch (error) {
    console.error('Ticketmaster API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    throw new Error(`Failed to fetch events: ${error.message}`);
  }
}

// Enhanced OpenWeatherMap Function with Wind Direction
async function fetchWeatherForecast(location) {
  try {
    // First try with city name
    let response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: location,
        appid: process.env.OPENWEATHER_KEY,
        units: 'metric'
      },
      timeout: 3000
    });

    // If city not found, try geocoding first
    if (response.data.cod === '404') {
      const geocode = await mapsClient.geocode({
        params: {
          address: location,
          key: process.env.GOOGLE_MAPS_KEY
        }
      });
      
      if (geocode.data.results.length) {
        const { lat, lng } = geocode.data.results[0].geometry.location;
        response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
          params: {
            lat: lat,
            lon: lng,
            appid: process.env.OPENWEATHER_KEY,
            units: 'metric'
          }
        });
      }
    }

    return {
      temp: Math.round(response.data.main.temp),
      feels_like: Math.round(response.data.main.feels_like),
      conditions: response.data.weather[0].main,
      description: response.data.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${response.data.weather[0].icon}@2x.png`,
      humidity: response.data.main.humidity,
      wind: response.data.wind.speed,
      windDeg: response.data.wind.deg, 
      rain: response.data.rain?.['1h'] || 0
    };

  } catch (error) {
    console.error('Weather API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      config: error.config
    });
    return null;
  }
}


async function fetchNearbyPlaces(lat, lng, type = 'restaurant') {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius: 1000, 
        type,
        key: process.env.GOOGLE_MAPS_KEY
      },
      timeout: 3000
    });

    return response.data.results?.map(place => ({
      id: place.place_id,
      name: place.name,
      rating: place.rating,
      price_level: place.price_level,
      address: place.vicinity,
      photo: place.photos?.[0]?.photo_reference,
      open_now: place.opening_hours?.open_now,
      geometry: place.geometry
    })) || [];

  } catch (error) {
    console.error('Places API Error:', error.message);
    return [];
  }
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Local Event Explorer',
    user: req.session.user 
  });
});

app.get('/events', async (req, res) => {
  try {
    const { location, category } = req.query;
    if (!location) throw new Error('Please enter a location');

    const events = await fetchEvents(location, category);
    const weather = await fetchWeatherForecast(location);

    res.render('events', {
      title: `Events in ${location}`,
      events,
      location,
      category,
      weather: weather ? {
        ...weather,
        windDirection: getWindDirection(weather.windDeg)
      } : null,
      mapsKey: process.env.GOOGLE_MAPS_KEY,
      user: req.session.user
    });

  } catch (error) {
    res.render('events', {
      title: 'Error',
      error: error.message,
      events: [],
      user: req.session.user
    });
  }
});

app.get('/event/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `https://app.ticketmaster.com/discovery/v2/events/${req.params.id}.json`,
      {
        params: {
          apikey: process.env.TICKETMASTER_API_KEY
        },
        timeout: 5000
      }
    );

    const event = response.data;
    const venue = event._embedded?.venues?.[0];
    
    
    const processedEvent = {
      id: event.id,
      name: event.name,
      description: event.info || event.description || '',
      url: event.url,
      start: new Date(event.dates.start.dateTime || event.dates.start.localDate),
      end: event.dates.end ? new Date(event.dates.end.dateTime || event.dates.end.localDate) : null,
      is_free: event.priceRanges ? false : true,
      image: event.images?.find(img => img.ratio === '16_9' && img.width > 600)?.url || 
             event.images?.[0]?.url || 
             '/images/default-event.jpg'
    };

    
    const processedVenue = {
      name: venue?.name || 'Venue not specified',
      address: venue?.address?.line1 || '',
      city: venue?.city?.name || '',
      state: venue?.state?.stateCode || '',
      postalCode: venue?.postalCode || '',
      country: venue?.country?.countryCode || '',
      lat: venue?.location?.latitude,
      lng: venue?.location?.longitude,
      fullAddress: [
        venue?.address?.line1,
        venue?.city?.name,
        venue?.state?.stateCode,
        venue?.postalCode
      ].filter(Boolean).join(', ')
    };

    
    let weather = null;
    let restaurants = [];
    
    if (processedVenue.lat && processedVenue.lng) {
      [weather, restaurants] = await Promise.all([
        fetchWeatherForecast(`${processedVenue.city},${processedVenue.state}`),
        fetchNearbyPlaces(processedVenue.lat, processedVenue.lng)
      ]);
    }

    res.render('event-details', {
      title: processedEvent.name,
      event: processedEvent,
      venue: processedVenue,
      weather: weather ? {
        ...weather,
        windDirection: getWindDirection(weather.windDeg)
      } : null,
      restaurants,
      mapsKey: process.env.GOOGLE_MAPS_KEY,
      user: req.session.user
    });

  } catch (error) {
    console.error('Event details error:', error);
    res.redirect('/events?error=' + encodeURIComponent('Event not found or API error'));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong!',
    user: req.session.user
  });
});

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you requested could not be found',
    user: req.session.user
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Configured APIs:', {
    ticketmaster: process.env.TICKETMASTER_API_KEY ? '✔️' : '',
    googleMaps: process.env.GOOGLE_MAPS_KEY ? '✔️' : '',
    openWeather: process.env.OPENWEATHER_KEY ? '✔️' : ''
  });
});
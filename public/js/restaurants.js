function renderRestaurants(restaurants) {
    const container = document.getElementById('restaurants-container');
    container.innerHTML = restaurants.map(r => `
      <div class="restaurant-card">
        ${r.photo ? `
          <img src="https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${r.photo}&key=${window.mapsKey}">
        ` : ''}
        <div class="restaurant-info">
          <h4>${r.name}</h4>
          <div class="rating">${'★'.repeat(Math.round(r.rating || 0))}</div>
          <p>${r.address}</p>
          <p>${'$'.repeat(r.price_level || 1)} • ${r.open_now ? 'Open Now' : 'Closed'}</p>
          <button class="btn btn-sm btn-outline-primary" 
            onclick="getDirections(${r.location.lat},${r.location.lng})">
            Directions
          </button>
        </div>
      </div>
    `).join('');
  }
  
  function getDirections(lat, lng) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  }
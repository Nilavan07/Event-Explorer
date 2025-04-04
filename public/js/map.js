function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 40.7128, lng: -74.0060 },
      zoom: 12
    });
  
    window.events.forEach(event => {
      if (event.venue?.lat) {
        new google.maps.Marker({
          position: { lat: event.venue.lat, lng: event.venue.lng },
          map,
          title: event.name,
          icon: {
            url: getCategoryIcon(event.category),
            scaledSize: new google.maps.Size(32, 32)
          }
        });
      }
    });
  }
  
  function getCategoryIcon(category) {
    const icons = {
      Music: '/images/music.png',
      Sports: '/images/sports.png',
      Food: '/images/food.png',
      default: '/images/event.png'
    };
    return icons[category] || icons.default;
  }
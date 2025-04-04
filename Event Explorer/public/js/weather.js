function renderWeather(forecast) {
    if (!forecast) return;
    
    const widget = document.getElementById('weather-widget');
    widget.innerHTML = `
      <div class="weather-current">
        <img src="${forecast.icon}" alt="${forecast.description}">
        <div>
          <h3>${Math.round(forecast.temp)}°C</h3>
          <p>${forecast.description}</p>
        </div>
      </div>
      <div class="weather-details">
        <p>Wind: ${forecast.wind} m/s 
          <button class="show-direction">Get Direction</button>
          <span class="wind-direction" style="display:none">
            ${forecast.windDirection}
          </span>
        </p>
        <p>Rain: ${forecast.rain ? forecast.rain + 'mm' : 'None'}</p>
      </div>
    `;
  
    
    widget.querySelector('.show-direction').addEventListener('click', function() {
      const directionElement = this.nextElementSibling;
      directionElement.style.display = directionElement.style.display === 'none' ? 'inline' : 'none';
    });
  }
  
  
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('weather-widget') && typeof currentWeather !== 'undefined') {
      renderWeather(currentWeather);
    }
  });
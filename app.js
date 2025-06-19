/**
 * Weather App - Main Application Script
 * 
 * This script handles all the functionality for the weather application including:
 * - Fetching weather data from OpenWeatherMap API
 * - Displaying current weather and forecast
 * - Handling user interactions
 * - Managing recent searches
 * - Unit conversion (Celsius/Fahrenheit)
 * - Geolocation functionality
 */

// OpenWeatherMap API configuration
const API_KEY = '1ee5a03d6f12986a544971e2e2264c02'; // Your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// DOM element references for efficient access
const cityInput = document.getElementById('cityInput');
const weatherInfo = document.getElementById('weatherInfo');
const searchBtn = document.getElementById('searchBtn');
const searchIcon = document.getElementById('searchIcon');
const searchText = document.getElementById('searchText');
const recentSearches = document.getElementById('recentSearches');
const recentList = document.getElementById('recentList');

// Application state management
let recentCities = []; // Array to store recently searched cities
let isLoading = false; // Flag to prevent multiple simultaneous requests
let currentUnit = 'celsius'; // Default temperature unit

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Focus on input field for immediate use
  cityInput.focus();
  
  // Load recent searches from localStorage
  loadRecentSearches();
  
  // Add location detection button
  addLocationButton();
  
  // Set up event listeners
  setupEventListeners();
  
  // Test API connection with a default city (optional)
  console.log('Weather App initialized with API key');
});

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
  // Handle Enter key press in input field
  cityInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      getWeather();
    }
  });
  
  // Handle search button click
  searchBtn.addEventListener('click', getWeather);
  
  // Clear error messages when user starts typing
  cityInput.addEventListener('input', function() {
    const errorMsg = document.querySelector('.error-message');
    if (errorMsg && this.value.trim()) {
      errorMsg.remove();
    }
  });
  
  // Handle offline/online status
  window.addEventListener('offline', () => {
    showMessage('You are offline. Please check your internet connection.', 'error');
  });
}

/**
 * Add location button to search input
 */
function addLocationButton() {
  const locationBtn = document.createElement('button');
  locationBtn.innerHTML = '<i class="bi bi-geo-alt"></i>';
  locationBtn.className = 'btn btn-sm btn-outline-light location-btn';
  locationBtn.onclick = getCurrentLocation;
  
  const cityInputContainer = document.querySelector('.mb-3');
  cityInputContainer.style.position = 'relative';
  cityInputContainer.appendChild(locationBtn);
}

/**
 * Load recent searches from localStorage
 */
function loadRecentSearches() {
  const savedSearches = localStorage.getItem('recentCities');
  if (savedSearches) {
    recentCities = JSON.parse(savedSearches);
    updateRecentSearchesDisplay();
  }
}

/**
 * Main function to fetch and display weather data
 * Handles API requests, error states, and UI updates
 */
async function getWeather() {
  // Get city name from input and remove whitespace
  const city = cityInput.value.trim();
  
  // Validate input - ensure city name is provided
  if (!city) {
    showMessage('Please enter a city name.', 'error');
    cityInput.focus();
    return;
  }
  
  // Prevent multiple simultaneous requests
  if (isLoading) return;
  
  // Set loading state and update UI
  setLoadingState(true);
  
  try {
    // Construct API URL with city name, API key, and metric units
    const apiUrl = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    
    // Make HTTP request to OpenWeatherMap API
    const response = await fetch(apiUrl);
    
    // Parse JSON response
    const data = await response.json();
    
    // Check if API returned successful response (status code 200)
    if (data.cod === 200) {
      // Display weather data
      displayWeatherData(data);
      // Fetch and display forecast
      fetchForecast(city);
      // Add city to recent searches
      addToRecentSearches(city);
      // Clear input field after successful search
      cityInput.value = '';
    } else {
      // Handle API error responses (city not found, etc.)
      const errorMessage = data.message || 'City not found. Please check the spelling and try again.';
      showMessage(errorMessage, 'error');
      // Clear weather display on error
      weatherInfo.innerHTML = '';
    }
  } catch (error) {
    console.error('Weather API Error:', error);
    
    // Check if there's a cached result for this city
    const cachedResult = localStorage.getItem(`weather_${city}`);
    if (cachedResult) {
      const parsedResult = JSON.parse(cachedResult);
      displayWeatherData(parsedResult);
      showMessage('Showing cached weather data due to connection issues.', 'error');
    } else {
      showMessage('Unable to fetch weather data. Please check your internet connection and try again.', 'error');
    }
  } finally {
    // Always reset loading state
    setLoadingState(false);
  }
}

/**
 * Display formatted weather data in the UI
 * @param {Object} data - Weather data object from API response
 */
function displayWeatherData(data) {
  // Store last weather data for unit conversion
  window.lastWeatherData = data;
  
  // Extract relevant data from API response
  const temperature = convertTemperature(data.main.temp, currentUnit);
  const description = data.weather[0].description;
  const cityName = data.name;
  const country = data.sys.country;
  const humidity = data.main.humidity;
  const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
  const pressure = data.main.pressure;
  const feelsLike = convertTemperature(data.main.feels_like, currentUnit);
  const visibility = data.visibility ? Math.round(data.visibility / 1000) : 'N/A';
  
  // Get appropriate weather icon based on condition
  const weatherIcon = getWeatherIcon(data.weather[0].main, data.weather[0].icon);
  
  // Get current time
  const currentTime = new Date().toLocaleString();
  
  // Build HTML structure for weather display
  const weatherHTML = `
    <div class="weather-info">
      <!-- City name and country -->
      <div class="city-name">
        <i class="bi bi-geo-alt"></i>
        ${cityName}, ${country}
        <button id="unitToggleBtn" class="btn btn-sm btn-outline-light ml-2" onclick="toggleTemperatureUnit()">°F</button>
      </div>
      
      <!-- Main temperature display with icon -->
      <div class="temperature">
        ${weatherIcon}
        ${temperature}°${currentUnit === 'celsius' ? 'C' : 'F'}
      </div>
      
      <!-- Weather condition description -->
      <div class="weather-description">
        ${description}
      </div>
      
      <!-- Additional weather details in grid layout -->
      <div class="weather-details">
        <!-- Feels like temperature -->
        <div class="detail-item">
          <div class="detail-label">
            <i class="bi bi-thermometer-half"></i> Feels Like
          </div>
          <div class="detail-value">${feelsLike}°${currentUnit === 'celsius' ? 'C' : 'F'}</div>
        </div>
        
        <!-- Humidity percentage -->
        <div class="detail-item">
          <div class="detail-label">
            <i class="bi bi-droplet"></i> Humidity
          </div>
          <div class="detail-value">${humidity}%</div>
        </div>
        
        <!-- Wind speed -->
        <div class="detail-item">
          <div class="detail-label">
            <i class="bi bi-wind"></i> Wind Speed
          </div>
          <div class="detail-value">${windSpeed} km/h</div>
        </div>
        
        <!-- Atmospheric pressure -->
        <div class="detail-item">
          <div class="detail-label">
            <i class="bi bi-speedometer2"></i> Pressure
          </div>
          <div class="detail-value">${pressure} hPa</div>
        </div>
      </div>
      
      <!-- Current time -->
      <div class="current-time">
        <i class="bi bi-clock"></i> Updated: ${currentTime}
      </div>
    </div>
  `;
  
  // Update the weather info container with new content
  weatherInfo.innerHTML = weatherHTML;
}

/**
 * Get appropriate weather icon based on weather condition
 * @param {string} main - Main weather condition (Clear, Clouds, Rain, etc.)
 * @param {string} icon - Icon code from API (used for day/night detection)
 * @returns {string} - HTML string with appropriate Bootstrap icon
 */
function getWeatherIcon(main, icon) {
  // Determine if it's day or night based on icon code
  const isDay = icon.includes('d');
  
  // Return appropriate icon based on weather condition
  switch (main.toLowerCase()) {
    case 'clear':
      return isDay ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    case 'clouds':
      return isDay ? '<i class="bi bi-cloud-sun"></i>' : '<i class="bi bi-cloud-moon"></i>';
    case 'rain':
      return '<i class="bi bi-cloud-rain"></i>';
    case 'drizzle':
      return '<i class="bi bi-cloud-drizzle"></i>';
    case 'thunderstorm':
      return '<i class="bi bi-cloud-lightning"></i>';
    case 'snow':
      return '<i class="bi bi-cloud-snow"></i>';
    case 'mist':
    case 'fog':
    case 'haze':
      return '<i class="bi bi-cloud-fog"></i>';
    default:
      return '<i class="bi bi-cloud"></i>';
  }
}

/**
 * Set loading state and update UI accordingly
 * @param {boolean} loading - Whether the app is in loading state
 */
function setLoadingState(loading) {
  isLoading = loading;
  
  if (loading) {
    // Show loading state in UI
    searchBtn.disabled = true;
    searchIcon.className = 'bi bi-arrow-clockwise';
    searchIcon.style.animation = 'spin 1s linear infinite';
    searchText.textContent = 'Loading...';
    
    // Show loading spinner in weather info area
    weatherInfo.innerHTML = '<div class="loading-spinner"></div>';
  } else {
    // Reset UI to normal state
    searchBtn.disabled = false;
    searchIcon.className = 'bi bi-search';
    searchIcon.style.animation = 'none';
    searchText.textContent = 'Get Weather';
  }
}

/**
 * Display success or error messages to the user
 * @param {string} message - Message text to display
 * @param {string} type - Message type ('success' or 'error')
 */
function showMessage(message, type) {
  // Create message element with appropriate styling
  const messageClass = type === 'error' ? 'error-message' : 'success-message';
  const iconClass = type === 'error' ? 'bi-exclamation-triangle' : 'bi-check-circle';
  
  const messageHTML = `
    <div class="${messageClass}">
      <i class="bi ${iconClass}"></i>
      ${message}
    </div>
  `;
  
  // Show error messages in weather info area
  if (type === 'error') {
    weatherInfo.innerHTML = messageHTML;
  }
}

/**
 * Add a city to the recent searches list
 * @param {string} city - City name to add to recent searches
 */
function addToRecentSearches(city) {
  // Convert to proper case for display
  const formattedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  
  // Remove city if it already exists (to avoid duplicates)
  recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
  
  // Add city to beginning of array
  recentCities.unshift(formattedCity);
  
  // Keep only last 5 searches
  if (recentCities.length > 5) {
    recentCities = recentCities.slice(0, 5);
  }
  
  // Save to localStorage
  localStorage.setItem('recentCities', JSON.stringify(recentCities));
  
  // Update the recent searches display
  updateRecentSearchesDisplay();
}

/**
 * Update the recent searches UI display
 */
function updateRecentSearchesDisplay() {
  // Show recent searches section if there are any cities
  if (recentCities.length > 0) {
    recentSearches.classList.remove('d-none');
    
    // Build HTML for recent searches list
    const recentHTML = recentCities.map(city => 
      `<div class="recent-item" onclick="searchRecentCity('${city}')">
        <i class="bi bi-clock"></i> ${city}
      </div>`
    ).join('');
    
    // Update the recent searches container
    recentList.innerHTML = recentHTML;
  } else {
    // Hide recent searches section if empty
    recentSearches.classList.add('d-none');
  }
}

/**
 * Search for weather using a city from recent searches
 * @param {string} city - City name from recent searches
 */
function searchRecentCity(city) {
  // Set the input value to the selected city
  cityInput.value = city;
  // Trigger weather search
  getWeather();
}

/**
 * Convert temperature between Celsius and Fahrenheit
 * @param {number} temp - Temperature value to convert
 * @param {string} unit - Target unit ('celsius' or 'fahrenheit')
 * @returns {number} Converted temperature
 */
function convertTemperature(temp, unit) {
  if (unit === 'fahrenheit') {
    return Math.round((temp * 9/5) + 32);
  }
  return Math.round(temp);
}

/**
 * Toggle temperature unit between Celsius and Fahrenheit
 */
function toggleTemperatureUnit() {
  currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  const unitToggleBtn = document.getElementById('unitToggleBtn');
  unitToggleBtn.textContent = currentUnit === 'celsius' ? '°F' : '°C';
  
  // Re-render last successful weather data if available
  if (window.lastWeatherData) {
    displayWeatherData(window.lastWeatherData);
  }
}

/**
 * Fetch 5-day forecast for a given city
 * @param {string} city - City name
 */
async function fetchForecast(city) {
  try {
    const apiUrl = `${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.cod === '200') {
      displayForecast(data.list);
    }
  } catch (error) {
    console.error('Forecast API Error:', error);
  }
}

/**
 * Display full week forecast
 * @param {Array} forecastList - List of forecast data points
 */
function displayForecast(forecastList) {
  // Group forecast by day
  const dailyForecast = {};
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  // Process forecast data
  forecastList.forEach(forecast => {
    const date = new Date(forecast.dt * 1000);
    const dayIndex = date.getDay();
    const day = days[dayIndex];
    
    if (!dailyForecast[day]) {
      dailyForecast[day] = {
        temps: [],
        icons: [],
        descriptions: []
      };
    }
    
    dailyForecast[day].temps.push(forecast.main.temp);
    dailyForecast[day].icons.push(forecast.weather[0].icon);
    dailyForecast[day].descriptions.push(forecast.weather[0].description);
  });
  
  // Create forecast HTML with full week
  const forecastHTML = days
    .map(day => {
      const data = dailyForecast[day] || { temps: [0, 0], icons: ['01d'], descriptions: ['clear sky'] };
      const minTemp = Math.round(Math.min(...data.temps));
      const maxTemp = Math.round(Math.max(...data.temps));
      const icon = getWeatherIcon(
        data.descriptions[Math.floor(data.descriptions.length / 2)].split(' ')[0], 
        data.icons[Math.floor(data.icons.length / 2)]
      );
      
      return `
        <div class="forecast-scroll-item">
          <div class="forecast-day">${day}</div>
          <div class="forecast-icon">${icon}</div>
          <div class="forecast-temp">
            <span class="min-temp">${minTemp}°</span>
            <span class="max-temp">${maxTemp}°</span>
          </div>
        </div>
      `;
    }).join('');
  
  // Add forecast to weather info
  const forecastContainer = document.createElement('div');
  forecastContainer.className = 'forecast-container-scroll';
  forecastContainer.innerHTML = `
    <div class="forecast-scroll-wrapper">
      ${forecastHTML}
    </div>
  `;
  weatherInfo.appendChild(forecastContainer);
}

/**
 * Get current location using Geolocation API
 */
function getCurrentLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        showMessage('Unable to get your location. Please enter a city manually.', 'error');
      }
    );
  } else {
    showMessage('Geolocation is not supported by your browser.', 'error');
  }
}

/**
 * Fetch weather by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function fetchWeatherByCoords(lat, lon) {
  try {
    const apiUrl = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.cod === 200) {
      displayWeatherData(data);
      fetchForecast(data.name);
      cityInput.value = data.name;
    }
  } catch (error) {
    console.error('Weather by Coordinates Error:', error);
    showMessage('Unable to fetch weather for your location.', 'error');
  }
}
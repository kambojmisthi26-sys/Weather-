/**
 * SkyPulse Weather Engine
 * Powered by Open-Meteo (No API Key Required)
 */

// State Management
const state = {
    currentUnit: 'metric', // 'metric' (°C, km/h) or 'imperial' (°F, mph)
    lastQuery: 'New Delhi',
    weatherData: null,
};

// DOM Elements
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const geoBtn = document.getElementById('geo-btn');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

const statusBox = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
const loader = document.querySelector('.loader');

const weatherDisplay = document.getElementById('weather-display');
const cityNameEl = document.getElementById('city-name');
const dateTimeEl = document.getElementById('date-time');
const weatherBadge = document.getElementById('weather-badge');
const weatherIcon = document.getElementById('weather-icon');
const tempDisplay = document.getElementById('temp-display');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const pressureEl = document.getElementById('pressure');
const bgGlow = document.querySelector('.background-glow');

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = cityInput.value.trim();
    if (query) {
        fetchCoordinatesAndWeather(query);
    }
});

geoBtn.addEventListener('click', fetchWeatherByLocation);

celsiusBtn.addEventListener('click', () => switchUnit('metric'));
fahrenheitBtn.addEventListener('click', () => switchUnit('imperial'));

// 1. Convert City Name to Coordinates (Geocoding API)
async function fetchCoordinatesAndWeather(cityName) {
    showLoading(`Searching weather for "${cityName}"...`);
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`City "${cityName}" not found. Please check spelling.`);
        }

        const { name, country, latitude, longitude } = geoData.results[0];
        state.lastQuery = cityName;
        await fetchWeatherData(latitude, longitude, `${name}, ${country || ''}`);
    } catch (err) {
        showError(err.message);
    }
}

// 2. Fetch Live Weather Data from Open-Meteo
async function fetchWeatherData(lat, lon, displayName) {
    try {
        const tempUnit = state.currentUnit === 'imperial' ? 'fahrenheit' : 'celsius';
        const windUnit = state.currentUnit === 'imperial' ? 'mph' : 'kmh';

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,weather_code&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&timezone=auto`;

        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error('Could not retrieve weather conditions.');

        const data = await res.json();
        renderWeather(data.current, displayName);
        hideStatus();
    } catch (err) {
        showError(err.message);
    }
}

// 3. Current Location Support (GPS)
function fetchWeatherByLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    showLoading('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
        async(pos) => {
            const { latitude, longitude } = pos.coords;
            await fetchWeatherData(latitude, longitude, 'Your Current Location');
        },
        () => {
            showError('Location access was denied or unavailable.');
        }
    );
}

// 4. Decode WMO Weather Codes to Human-Readable Conditions & Icons
function decodeWeatherCode(code) {
    const mapping = {
        0: { label: 'Clear sky', icon: '01d', theme: 'clear' },
        1: { label: 'Mainly clear', icon: '02d', theme: 'clear' },
        2: { label: 'Partly cloudy', icon: '03d', theme: 'clouds' },
        3: { label: 'Overcast', icon: '04d', theme: 'clouds' },
        45: { label: 'Foggy', icon: '50d', theme: 'clouds' },
        48: { label: 'Depositing rime fog', icon: '50d', theme: 'clouds' },
        51: { label: 'Light drizzle', icon: '09d', theme: 'drizzle' },
        53: { label: 'Moderate drizzle', icon: '09d', theme: 'drizzle' },
        55: { label: 'Dense drizzle', icon: '09d', theme: 'drizzle' },
        61: { label: 'Slight rain', icon: '10d', theme: 'rain' },
        63: { label: 'Moderate rain', icon: '10d', theme: 'rain' },
        65: { label: 'Heavy rain', icon: '10d', theme: 'rain' },
        71: { label: 'Slight snow', icon: '13d', theme: 'snow' },
        73: { label: 'Moderate snow', icon: '13d', theme: 'snow' },
        75: { label: 'Heavy snow', icon: '13d', theme: 'snow' },
        95: { label: 'Thunderstorm', icon: '11d', theme: 'thunderstorm' },
        96: { label: 'Thunderstorm with slight hail', icon: '11d', theme: 'thunderstorm' },
        99: { label: 'Thunderstorm with heavy hail', icon: '11d', theme: 'thunderstorm' }
    };

    return mapping[code] || { label: 'Partly cloudy', icon: '02d', theme: 'clouds' };
}

// 5. Render UI
function renderWeather(current, displayName) {
    const meta = decodeWeatherCode(current.weather_code);
    const tempSymbol = state.currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = state.currentUnit === 'metric' ? 'km/h' : 'mph';

    cityNameEl.textContent = displayName;
    dateTimeEl.textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    weatherBadge.textContent = meta.label;
    tempDisplay.textContent = `${Math.round(current.temperature_2m)}${tempSymbol}`;
    feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}${tempSymbol}`;
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windSpeedEl.textContent = `${current.wind_speed_10m} ${speedUnit}`;
    pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;

    weatherIcon.src = `https://openweathermap.org/img/wn/${meta.icon}@2x.png`;
    weatherIcon.alt = meta.label;

    updateDynamicTheme(meta.theme);
    weatherDisplay.classList.remove('hidden');
}

// 6. Unit Switching
function switchUnit(unit) {
    if (state.currentUnit === unit) return;
    state.currentUnit = unit;

    celsiusBtn.classList.toggle('active', unit === 'metric');
    fahrenheitBtn.classList.toggle('active', unit === 'imperial');

    fetchCoordinatesAndWeather(state.lastQuery);
}

// 7. Dynamic Glow Colors
function updateDynamicTheme(theme) {
    const colors = {
        clear: 'rgba(237, 137, 54, 0.35)',
        clouds: 'rgba(160, 174, 192, 0.25)',
        rain: 'rgba(49, 130, 206, 0.35)',
        drizzle: 'rgba(99, 179, 237, 0.3)',
        thunderstorm: 'rgba(128, 90, 213, 0.4)',
        snow: 'rgba(226, 232, 240, 0.35)',
    };

    bgGlow.style.background = colors[theme] || 'rgba(66, 153, 225, 0.25)';
}

// Helpers
function showLoading(msg) {
    weatherDisplay.classList.add('hidden');
    statusBox.classList.remove('hidden');
    loader.classList.remove('hidden');
    statusText.textContent = msg;
}

function showError(msg) {
    weatherDisplay.classList.add('hidden');
    statusBox.classList.remove('hidden');
    loader.classList.add('hidden');
    statusText.textContent = msg;
}

function hideStatus() {
    statusBox.classList.add('hidden');
}

// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
    fetchCoordinatesAndWeather('New Delhi');
});
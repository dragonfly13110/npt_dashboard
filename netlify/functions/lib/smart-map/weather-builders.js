function asLocations(payload) {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : [payload];
}

export function mergeDistrictWeather(
  points,
  weatherPayload,
  airQualityPayload
) {
  const weather = asLocations(weatherPayload);
  const airQuality = asLocations(airQualityPayload);
  const data = points.map((point, index) => {
    const currentWeather = weather[index]?.current;
    const currentAirQuality = airQuality[index]?.current;
    return {
      district: point.district,
      representativePoint: { lat: point.lat, lon: point.lon },
      temp: currentWeather?.temperature_2m ?? null,
      humidity: currentWeather?.relative_humidity_2m ?? null,
      windSpeed: currentWeather?.wind_speed_10m ?? null,
      weatherCode: currentWeather?.weather_code ?? null,
      weatherTime: currentWeather?.time ?? null,
      pm25: currentAirQuality?.pm2_5 ?? null,
      aqi: currentAirQuality?.european_aqi ?? null,
      airQualityTime: currentAirQuality?.time ?? null,
      weatherStatus: currentWeather ? 'ok' : 'unavailable',
      airQualityStatus: currentAirQuality ? 'ok' : 'unavailable',
    };
  });
  const availableWeather = data.some((row) => row.weatherStatus === 'ok');
  const availableAirQuality = data.some((row) => row.airQualityStatus === 'ok');
  return {
    data,
    meta: {
      status:
        availableWeather && availableAirQuality
          ? 'ok'
          : availableWeather || availableAirQuality
            ? 'partial'
            : 'unavailable',
      representativePoint: true,
      source: { weather: 'Open-Meteo', airQuality: 'Open-Meteo Air Quality' },
    },
  };
}

export const getCurrentWeather = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&forecast_days=1`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || !data.current) {
      return null;
    }

    return {
      temp: data.current.temperature_2m,
      precip: data.current.precipitation, // mm
      rain: data.current.rain, // mm
      code: data.current.weather_code, // WMO code
      wind: data.current.wind_speed_10m, // km/h
      isDay: data.current.is_day
    };
  } catch (error) {
    console.warn("Weather fetch failed:", error);
    return null;
  }
};

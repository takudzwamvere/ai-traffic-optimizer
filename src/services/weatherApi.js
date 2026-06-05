export const getCurrentWeather = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m,is_day&forecast_days=1`;

    // Abort after 5 s so a slow weather response never blocks the route search
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

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


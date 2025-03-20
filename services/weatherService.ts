import { fetchWeatherApi } from "openmeteo";

export const fetchWeatherData = async (startDate: string, endDate: string) => {
  const params = {
    latitude: 52.52,
    longitude: 13.41,
    daily: [
      "apparent_temperature_max",
      "temperature_2m_max",
      "sunrise",
      "sunset",
    ],
    timezone: "America/Los_Angeles",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    start_date: startDate,
    end_date: endDate,
  };
  const url = "https://api.open-meteo.com/v1/forecast";
  const responses = await fetchWeatherApi(url, params);

  // Helper function to form time ranges
  const range = (start: number, stop: number, step: number) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

  // Process first location. Add a for-loop for multiple locations or weather models
  const response = responses[0];

  // Attributes for timezone and location
  const utcOffsetSeconds = response.utcOffsetSeconds();
  const timezone = response.timezone();
  const timezoneAbbreviation = response.timezoneAbbreviation();
  const latitude = response.latitude();
  const longitude = response.longitude();

  const daily = response.daily()!;

  // Note: The order of weather variables in the URL query and the indices below need to match!
  const weatherData = {
    daily: {
      time: range(
        Number(daily.time()),
        Number(daily.timeEnd()),
        daily.interval()
      ).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
      apparentTemperatureMax: daily.variables(0)!.valuesArray()!,
      temperature2mMax: daily.variables(1)!.valuesArray()!,
      sunrise: daily.variables(2)!.valuesArray()!,
      sunset: daily.variables(3)!.valuesArray()!,
    },
  };

  // Format the weather data into a readable string
  let weatherSummary = "";

  for (let i = 0; i < weatherData.daily.time.length; i++) {
    // Get the day's weather data
    const dayTemp = weatherData.daily.temperature2mMax[i].toPrecision(2);
    const dayFeelsLike =
      weatherData.daily.apparentTemperatureMax[i].toPrecision(2);

    weatherSummary += `\n ${weatherData.daily.time[i]} ${dayTemp}°F (feels like ${dayFeelsLike}°F)`;
  }

  // If we have more days, calculate average
  if (weatherData.daily.time.length > 1) {
    // Calculate average temperature for the period
    const avgTemp =
      weatherData.daily.temperature2mMax.reduce((sum, temp) => sum + temp, 0) /
      weatherData.daily.temperature2mMax.length;

    weatherSummary += `\n The average temperature for the selected period is ${avgTemp.toFixed(
      1
    )}°F`;
  }

  return weatherSummary;
};

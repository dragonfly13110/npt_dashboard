import { generateForecast } from './forecast-disease-insect.js';

export const handler = async (event = {}) => {
  return generateForecast({
    ...event,
    httpMethod: event.httpMethod || 'POST',
  });
};

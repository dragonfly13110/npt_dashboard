import { schedule } from '@netlify/functions';
import { handler as forecastHandler } from './forecast-disease-insect.js';

// 06:00 Asia/Bangkok = 23:00 UTC.
export const handler = schedule('0 23 * * *', forecastHandler);

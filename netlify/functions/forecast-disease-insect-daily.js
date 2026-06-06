import { schedule } from '@netlify/functions';
import { handler as forecastHandler } from './forecast-disease-insect.js';

// Run every 15 minutes. The handler internally checks if today's forecast is already in Supabase.
// If yes, it exits early; if not, it runs and generates it (self-healing / retry mechanism).
export const handler = schedule('*/15 * * * *', forecastHandler);

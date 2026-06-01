// API Client Utility Configuration for Cloud Deployment
// Vite will look for the VITE_API_URL environment variable during the production build on Vercel.
// It falls back to localhost:5000 for local development.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

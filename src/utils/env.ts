export const ENV = {
    API_BASE_URL: import.meta.env.VITE_ADMIN_API_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  } as const;
  
  // Quick validation to help you debug during development
  if (!ENV.API_BASE_URL) {
    console.warn("⚠️ VITE_ADMIN_API_URL is missing from your .env file");
  }
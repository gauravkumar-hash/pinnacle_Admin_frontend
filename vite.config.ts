import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicDir = env.VITE_ENV === 'production' ? 'public' : 'public-staging'

  return {
    publicDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      watch: {
        usePolling: true, // Enables polling for file changes
      },
      middlewareMode: true,
      // Fallback to index.html for SPA routing
      middlewares: [
        (req, res, next) => {
          if (req.url === '/' || !req.url.includes('.')) {
            req.url = '/index.html';
          }
          next();
        },
      ],
    },
    build: {
      // Ensure SPA routing works after build
      rollupOptions: {
        input: 'index.html',
      },
    },
  }
})


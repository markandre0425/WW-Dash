import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Plugin to resolve figma:asset imports to placeholder data URIs
const figmaAssetPlugin = {
  name: 'figma-asset-resolver',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id.startsWith('figma:asset/')) {
      // Return a normalized, absolute module ID
      return { id: `\0${id}`, external: false }
    }
  },
  load(id: string) {
    if (id.startsWith('\0figma:asset/')) {
      // Return a placeholder gray image as a data URI
      const placeholderDataUri = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23cccccc%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'
      return `export default "${placeholderDataUri}"`
    }
  },
}

export default defineConfig({
  plugins: [
    figmaAssetPlugin,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    proxy: {
      '/api/coingecko': {
        target: 'https://api.coingecko.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },
    },
  },
  rollupOptions: {
    external: [],
  },
})

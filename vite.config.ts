import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        "astronaut-dashboard": resolve(root, 'pages/astronaut-dashboard/index.html'),
        "explorer-map": resolve(root, 'pages/explorer-map/index.html'),
        "mars-explorer": resolve(root, 'pages/mars-explorer/index.html'),
        "marswalk-hud": resolve(root, 'pages/marswalk-hud/index.html'),
        "sign-in": resolve(root, 'pages/sign-in/index.html'),
        "my-observations": resolve(root, 'pages/my-observations/index.html'),
        "submit-observation": resolve(root, 'pages/submit-observation/index.html'),
      },
    },
  },
})

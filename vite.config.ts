import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Se sirve desde https://xaaaaii7.github.io/leyenda/ en GitHub Pages,
// por eso la base es el nombre del repo en producción.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/leyenda/' : '/',
  plugins: [react()],
}))

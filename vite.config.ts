import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tsconfigPath from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: '/idea-book/', 
  plugins: [
    react(),
    tsconfigPath(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server:{
    proxy:{
      "/api": "http://localhost:3000",
    }
  }
})

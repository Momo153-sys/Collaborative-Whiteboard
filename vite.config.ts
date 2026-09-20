import { defineConfig } from "vite"
import path from "path"

import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import contentCollections from "@content-collections/vite"

const config = defineConfig({
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },

  plugins: [
    devtools(),
    contentCollections(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
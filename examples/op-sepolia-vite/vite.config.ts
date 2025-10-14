import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "evm-force-inclusion": path.resolve(__dirname, "../../dist/index.js"),
    },
  },
});

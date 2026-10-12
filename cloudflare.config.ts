import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "arturo-gallardo-web",
    "compatibilityDate": "2026-10-06",
    "domains": ["arturogallardo.com", "www.arturogallardo.com"],
    "observability": {
      "enabled": true
    },
    "assets": {
      "notFoundHandling": "single-page-application"
    }
  }
});

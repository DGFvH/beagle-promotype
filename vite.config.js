import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || "").replace(/\/$/, "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "inject-site-url",
        transformIndexHtml(html) {
          if (!siteUrl) {
            return html.replace(/\s*<meta property="og:url" content="%VITE_SITE_URL%\/" \/>\s*/g, "\n    ");
          }
          return html
            .replace(/%VITE_SITE_URL%/g, siteUrl)
            .replace(/content="\/og-image\.png"/g, `content="${siteUrl}/og-image.png"`);
        },
      },
    ],
  };
});

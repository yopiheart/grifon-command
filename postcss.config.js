/**
 * PostCSS pipeline for the Tailwind build that replaced the Play CDN
 * (`cdn.tailwindcss.com`) on 2026-07-25. Vite picks this up automatically and
 * runs it over `index.css`, which is where the `@tailwind base/components/
 * utilities` directives live.
 *
 * Until this file existed those three directives were unknown at-rules that got
 * dropped, and every utility class in the app came from the runtime CDN script.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

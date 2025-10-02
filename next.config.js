// next.config.js
const isNative = process.env.NATIVE === "true";

const withPWA = require("next-pwa")({
  dest: "public",
  // register SW only for web builds (not for native)
  register: !isNative,
  skipWaiting: true,
  clientsClaim: true,
  // disable when building for native OR in development
  disable: isNative || process.env.NODE_ENV === "development",
  runtimeCaching: [
    // navigations: network-first (web)
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Do not cache POST API routes
    {
      urlPattern: /^\/api\/.*$/i,
      handler: "NetworkOnly",
      method: "POST",
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 31536000 },
      },
    },
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "jsdelivr",
        expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
      },
    },
    {
      urlPattern: /^\/$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "start-url",
        expiration: { maxEntries: 1, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^.*$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "general-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
  ],
});

module.exports = withPWA({
  webpack: (config, { isServer }) => {
    if (!isServer) config.resolve.fallback = { fs: false };
    return config;
  },
});

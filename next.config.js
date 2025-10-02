// next.config.js
const withPWA = require("next-pwa")({
  dest: "public",
  register: false,
  skipWaiting: false,
  clientsClaim: false,
  disable: true, // IMPORTANT: completely disable next-pwa
});

module.exports = withPWA({
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }
    return config;
  },
});

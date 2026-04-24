// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Proxy /api requests to the FastAPI backend so the web app can use a
// same-origin URL (works behind Replit's preview iframe proxy).
const apiProxy = createProxyMiddleware({
  target: process.env.BACKEND_PROXY_TARGET || 'http://127.0.0.1:8001',
  changeOrigin: true,
  ws: true,
});

config.server = {
  ...(config.server || {}),
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api')) {
        return apiProxy(req, res, next);
      }
      return middleware(req, res, next);
    };
  },
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;

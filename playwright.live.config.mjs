// Dezelfde browsertests, maar op de live site. Gebruik: npm run test:live
// Werk je achter een proxy, dan gebruikt Playwright HTTPS_PROXY.
import basis from './playwright.config.mjs';

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;

export default {
  ...basis,
  webServer: undefined,
  use: {
    ...basis.use,
    baseURL: process.env.LIVE_URL || 'https://tuinman.denkwerf.com',
    ...(proxy ? { proxy: { server: proxy }, ignoreHTTPSErrors: true } : {})
  }
};

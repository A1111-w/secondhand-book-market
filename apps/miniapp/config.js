// Keep environment selection and externally deployed service origins in one auditable file.
// The production defaults use the reserved .invalid TLD so an unconfigured build fails closed.
const activeEnvironment = 'production';

const environments = Object.freeze({
  development: Object.freeze({
    apiBaseUrl: 'http://127.0.0.1:3000',
    paperSiteUrl: ''
  }),
  production: Object.freeze({
    apiBaseUrl: 'https://api.example.invalid',
    paperSiteUrl: ''
  })
});

const selected = environments[activeEnvironment];
const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const host = trimTrailingSlash(selected.apiBaseUrl);
const paperSiteUrl = trimTrailingSlash(selected.paperSiteUrl);

export { activeEnvironment, host, paperSiteUrl };

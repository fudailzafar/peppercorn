/** app.json, with the address the browser version runs under when it is part of the website (scripts/build-web.sh). */
module.exports = ({ config }) => {
  const baseUrl = process.env.WEB_BASE;
  return baseUrl ? { ...config, experiments: { ...config.experiments, baseUrl } } : config;
};

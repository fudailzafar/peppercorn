/** app.json, with what only a build knows: where the browser version runs (scripts/build-web.sh), and the version code. */
module.exports = ({ config }) => {
  const { WEB_BASE, VERSION_CODE } = process.env;
  return {
    ...config,
    ...(WEB_BASE ? { experiments: { ...config.experiments, baseUrl: WEB_BASE } } : {}),
    // Phones take only a higher one as an update.
    ...(VERSION_CODE ? { android: { ...config.android, versionCode: Number(VERSION_CODE) } } : {}),
  };
};

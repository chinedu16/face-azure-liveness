// next.config.js
// Default: server runtime (Vercel compatible). Opt-in static export when ENV set.
module.exports = () => {
  const enableStatic = process.env.NEXT_OUTPUT === 'export' || process.env.EXPORT_STATIC === 'true';
  const config = {};
  if (enableStatic) {
    config.output = 'export';
    config.images = { unoptimized: true };
  }
  return config;
};
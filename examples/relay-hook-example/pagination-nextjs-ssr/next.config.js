const path = require('path');

module.exports = {
  webpack(config, options) {
    config.resolve.alias['relay'] = path.join(
      __dirname,
      'src',
      '__generated__',
      'relay',
    );
    config.resolve.preferRelative = true;
    return config;
  },
  reactStrictMode: true,
  compiler: {
      styledComponents: true,
    relay: {
      src: './src',
      language: 'typescript', // or 'javascript`
      artifactDirectory: './__generated__/relay', // you can leave this undefined if you did not specify one in the `relay.json`
    },
  }
};
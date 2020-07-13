const path = require('path');

module.exports = {
  webpack(config, options) {
    config.resolve.alias['relay'] = path.join(
      __dirname,
      '__generated__',
      'relay',
    );
    return config;
  },
  experimental: {
    reactMode: 'concurrent',
  }
};

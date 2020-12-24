function fixAssets({ publicPath } = {}) {
  return {
    name: 'fix-assets-plugin',

    transform(code, filename) {
      code = code.replace(/\/assets\//g, `${publicPath}assets/`);

      return code;
    },
  };
}

async function build(config) {
  config.publicPath = '/auguri-natale-2020/';
  config.plugins.push(fixAssets(config));
  console.log(JSON.stringify(config, undefined, 2));
}

module.exports = { build };

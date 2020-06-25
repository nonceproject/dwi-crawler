const { logger } = require('jege/server');

const paths = require('./paths');

const log = logger('[dwi-crawler]');

exports.get = function get() {
  const processEnv = {
    BUILD_PATH: paths.build,
    DIST_PATH: paths.dist,
    ROOT_PATH: paths.root,
  };

  let envString = '';
  Object.keys(processEnv)
    .forEach((envKey) => {
      envString += `${envKey}: ${processEnv[envKey]}, `;
    });
  log('env.get(): %s', envString);

  return processEnv;
};

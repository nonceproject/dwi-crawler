const env = require('./env');

const processEnv = env.get();

const { argv } = require('yargs');
const { createLauncher, proc } = require('process-launch');
const { logger } = require('jege/server');
const path = require('path');

const log = logger('[dwi-crawler]');

const paths = {
  config: path.resolve(__dirname, '../config/config.json'),
  keywords: path.resolve(__dirname, '../config/keywords.txt'),
};

const processDefinitions = {
  crawlerDev: proc(
    'node',
    [
      './scripts/launch.js',
      ...argv._,
    ],
    {
      cwd: `./packages/crawler`,
      env: {
        CONFIG_PATH: paths.config,
        KEYWORDS_PATH: paths.keywords,
        NODE_ENV: 'development',
        ...processEnv,
      },
      stdio: 'inherit',
    },
  ),
  db: proc(
    'node',
    [
      './scripts/launch.js',
      '--db',
      ...argv._,
    ],
    {
      cwd: `./packages/crawler`,
      env: {
        NODE_ENV: 'development',
        ...processEnv,
      },
      stdio: 'inherit',
    },
  ),
};

const processGroupDefinitions = {
  default: ['crawlerDev'],
};

function launcher() {
  try {
    log('launcher(): argv: %j', argv);

    const Launcher = createLauncher({
      processDefinitions,
      processGroupDefinitions,
    });

    Launcher.run({
      process: argv.process,
      processGroup: argv.processGroup,
    });
  } catch (err) {
    log('launcher(): Error reading file', err);
  }
}

module.exports = launcher;

if (require.main === module) {
  launcher();
}

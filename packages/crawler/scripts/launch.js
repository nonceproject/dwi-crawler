const { argv } = require('yargs');
const { logger } = require('jege/server');

const babelRc = require('./.babelrc');
const { gulp } = require('./build');

const log = logger('[crawler]');

require('@babel/register')({
  ...babelRc,
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
});

function launch() {
  log('launch(): argv: %j', argv);

  if (argv.db) {
    const table = require('../infrastructure/table');
    return table();
  }

  if (process.env.NODE_ENV === 'production') {
    // const buildTask = gulp.task('build');
    // buildTask(() => {
    //   const serverProd = require('../src/server/index.production').default;
    //   serverProd();
    // });
  } else {
    const buildDevTask = gulp.task('build-dev');
    return buildDevTask(() => {
      log('launch(): build finished. launching...');
      const app = require('../src/app.ts').default;
      app();
    });
  }
  return 0;
}

if (require.main === module) {
  launch();
}

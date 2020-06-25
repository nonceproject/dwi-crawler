const babelRc = require('./.babelrc');
require('@babel/register')({
  ...babelRc,
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
});

const { buildLogger } = require('jege/server');
const chalk = require('chalk');
const del = require('del');
const gulp = require('gulp');
const path = require('path');

const buildLog = buildLogger('[crawler]');

const paths = {
  dist: process.env.DIST_PATH,
  root: process.env.ROOT_PATH,
  src: path.resolve(__dirname, '../src'),
};

gulp.task('clean', () => {
  const cleanPaths = [
    `${paths.build}/**/*`,
    `${paths.dist}/**/*`,
  ];

  buildLog('clean', 'cleanPaths: %j', cleanPaths);

  return del(cleanPaths, {
    force: true,
  });
});

gulp.task('build', gulp.series('clean'));

gulp.task('build-dev', gulp.series('clean'));

module.exports = {
  gulp,
};

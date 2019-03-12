'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = process.env.DEV === 'true' ? 'development' : 'production';
process.env.NODE_ENV = process.env.DEV === 'true' ? 'development' : 'production';
process.env.GENERATE_SOURCEMAP = process.env.DEV === 'true' ? 'true' : 'false';

// Is build the dll
const shouldBuildDll = process.env.BUILD_DLL === 'true';
// Is build the lib
const shouldBuildLib = process.env.BUILD_LIB === 'true';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const webpack = require('webpack');
const bfj = require('bfj');
const configFactory = require('../config/webpack.config');
const paths = require('../config/paths');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const printHostingInstructions = require('react-dev-utils/printHostingInstructions');
const FileSizeReporter = require('react-dev-utils/FileSizeReporter');
const printBuildError = require('react-dev-utils/printBuildError');

const measureFileSizesBeforeBuild = FileSizeReporter.measureFileSizesBeforeBuild;
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;
const useYarn = fs.existsSync(paths.yarnLockFile);

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Process CLI arguments
const argv = process.argv.slice(2);
const writeStatsJson = argv.indexOf('--stats') !== -1;

// Generate configuration
const config = configFactory('production');

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require('react-dev-utils/browsersHelper');
checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    // First, read the current file sizes in build directory.
    // This lets us display how much they changed later.
    return measureFileSizesBeforeBuild(paths.appBuild);
  })
  .then(previousFileSizes => {
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(shouldBuildDll ? path.resolve(__dirname, '../public/dll') : paths.appBuild);
    // Merge with the public folder
    !shouldBuildDll && copyPublicFolder();
    // Start the webpack build
    return build(previousFileSizes);
  })
  .then(
    ({ stats, previousFileSizes, warnings }) => {
      if (warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'));
        console.log(warnings.join('\n\n'));
        console.log(
          '\nSearch for the ' + chalk.underline(chalk.yellow('keywords')) + ' to learn more about each warning.',
        );
        console.log('To ignore, add ' + chalk.cyan('// eslint-disable-next-line') + ' to the line before.\n');
      } else {
        console.log(chalk.green('Compiled successfully.\n'));
      }

      console.log('File sizes after gzip:\n');
      printFileSizesAfterBuild(
        stats,
        previousFileSizes,
        paths.appBuild,
        WARN_AFTER_BUNDLE_GZIP_SIZE,
        WARN_AFTER_CHUNK_GZIP_SIZE,
      );
      console.log();

      const appPackage = require(paths.appPackageJson);
      const publicUrl = paths.publicUrl;
      const publicPath = config.output.publicPath;
      const buildFolder = path.relative(process.cwd(), paths.appBuild);
      printHostingInstructions(appPackage, publicUrl, publicPath, buildFolder, useYarn);
    },
    err => {
      console.log(chalk.red('Failed to compile.\n'));
      printBuildError(err);
      process.exit(1);
    },
  )
  .catch(err => {
    if (!/no such file or directory/.test(err.message)) {
      if (err && err.message) {
        console.log(err.message);
      }
      process.exit(1);
    }
  });

// Create the production build and print the deployment instructions.
function build(previousFileSizes) {
  const createlog = {
    build: 'Creating an optimized production build...',
    dll: 'Creating some dll...',
    lib: 'Creating some lib...',
  };
  console.log(shouldBuildDll ? createlog.dll : shouldBuildLib ? createlog.lib : createlog.build);

  let compiler = webpack(config);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      let messages;
      if (err) {
        if (!err.message) {
          return reject(err);
        }
        messages = formatWebpackMessages({
          errors: [err.message],
          warnings: [],
        });
      } else {
        messages = formatWebpackMessages(stats.toJson({ all: false, warnings: true, errors: true }));
      }
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new Error(messages.errors.join('\n\n')));
      }
      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n',
          ),
        );
        return reject(new Error(messages.warnings.join('\n\n')));
      }

      const resolveArgs = {
        stats,
        previousFileSizes,
        warnings: messages.warnings,
      };
      if (writeStatsJson) {
        return bfj
          .write(paths.appBuild + '/bundle-stats.json', stats.toJson())
          .then(() => resolve(resolveArgs))
          .catch(error => reject(new Error(error)));
      }
      return resolve(resolveArgs);
    });
  });
}

function copyPublicFolder() {
  // if no build dll and no build lib, copy public
  if (!shouldBuildDll && !shouldBuildLib) {
    fs.copySync(paths.appPublic, paths.appBuild, {
      dereference: true,
      filter: file => file !== paths.appHtml && !/\.js\.map/.test(file),
    });
    dllFilesAddRamdomId();
  }
  shouldBuildLib && copyPackage();
  shouldBuildLib && copyLibFiles();
}

/** If copy dll.js, add dll.jd randomId */
function dllFilesAddRamdomId() {
  const dllPath = paths.appBuild + '/dll';
  if (fs.existsSync(dllPath)) {
    const dllFiles = fs.readdirSync(dllPath);
    dllFiles.forEach(file => {
      // if file is dll_xxxxx.js, change name
      if (/^dll_.*\.js$/.test(file)) {
        const token = file.split('.');
        const nextFile = `${token[0]}${paths.randomId}.js`;
        fs.moveSync(path.resolve(dllPath, file), path.resolve(dllPath, nextFile));
        console.log(`move ${file} to ${nextFile}`);
      }
    });
  }
}

/** copy lib.copy array */
function copyLibFiles() {
  for (const k in paths.copyList) {
    const p = paths.copyList[k];
    if (fs.existsSync(p)) {
      fs.copySync(p, paths.appBuild + '/' + k, {
        dereference: true,
      });
    }
  }
  if (paths.libFile.delete && paths.libFile.delete.length > 0) {
    for (let i = 0; i < paths.libFile.delete.length; i++) {
      const deleteFilePath = path.resolve(paths.appBuild, paths.libFile.delete[i]);
      if (fs.existsSync(deleteFilePath)) {
        fs.removeSync(deleteFilePath);
      }
    }
  }
}

/** copy package.json and fix some keys */
function copyPackage() {
  let pkg = require('../package.json');
  pkg.main = 'index.js';
  pkg.types = 'index.d.ts';
  deleteKeys(pkg, [
    'scripts',
    'jest',
    'devDependencies',
    'private',
    'browserslist',
    'babel',
    'pre-commit',
    'babel-README',
  ]);

  if (process.env.copyDependencies) {
    pkg['copy-dependencies'] = { ...pkg.dependencies };
    pkg.dependencies = {};
  }

  // If .libconfig have gitURL, add package.json git urls
  if (paths.libFile.gitURL) {
    pkg = { ...pkg, ...getGithubURL(paths.libFile.gitURL) };
  }

  fs.writeJSONSync(path.resolve(__dirname, '../dist/package.json'), pkg, { spaces: 2 });
}

function deleteKeys(target, keys) {
  keys.forEach(k => {
    if (target[k]) {
      delete target[k];
    }
  });
}

function getGithubURL(repo = 'github.com/ymzuiku/react-project-gui') {
  return {
    repository: {
      type: 'git',
      url: `git+https://${repo}.git`,
    },
    keywords: [],
    license: 'ISC',
    bugs: {
      url: `https://${repo}/issues`,
    },
    homepage: `https://${repo}#readme`,
  };
}

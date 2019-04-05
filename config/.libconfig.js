module.exports = {
  lib: ['src/packages/react-den'], // need babel files or dirs
  dontLib: [], // dont babel files or dirs
  copy: {
    'README.md': '../README.md',
    'src/packages/react-den': '../src',
    dist: '../lib',
    'dist/package.json': '../package.json',
  },
  delete: ['dist', '../lib/package.json'], // after copy builded, delete files
  package: {
    main: 'lib/index.js',
    types: 'src/index.d.ts',
    scripts: {
      lib: 'cd den-example && yarn lib',
      start: 'cd den-example && yarn start',
    },
    dependencies: {
    },
  },
  gitURL: 'github.com/ymzuiku/react-den',
};
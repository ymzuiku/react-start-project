/**
 * 在项目根路径创建一个 .libconfig.js 文件
 * 运行 node scripts/build.lib.js
 * 即可对路径中的文件逐个进行编译
 */

/* .libconfig.js 文件例子
module.exports = {
  lib: ['./src/HBComponents', './src/assets', './src/units'],
  dontLib: ['./src/units/paths.js'],
};
*/

const path = require('path');
const fs = require('fs-extra');
const rootPath = path.resolve(__dirname, '../');

function message(msg, isError) {
  console.warn('');
  if (isError) {
    console.warn('Error:');
  }
  console.warn(msg);
  console.warn('');
}

let libConfig = { lib: {}, dontLib: {} };
const libConfigPath = path.resolve(__dirname, '.libconfig.js');

if (!fs.existsSync(libConfigPath)) {
  fs.writeFileSync(
    libConfigPath,
    `module.exports = {
      lib: ['src/packages/react-den-form'], // need babel files or dirs
      dontLib: [], // dont babel files or dirs
      copy: {
        'src/packages/react-den-form': '../src',
        'dist': '../lib',
        'dist/package.json': '../package.json',
      },
      delete: ['dist', '../lib/package.json'], // after copy builded, delete files
      package: {
        "main": "lib/index.js",
        "types": "src/index.d.ts",
      },
      gitURL: 'github.com/ymzuiku/react-den-form',
    };`,
  );
}

let libFile = require(libConfigPath);

if (!libFile.lib || libFile.lib.length === 0) {
  message('Please set lib array in .libconfig.js', true);
  return;
}

if (!libFile.dontLib) {
  message('Please set dontLib array in .libconfig.js', true);
  return;
}

if (!libFile.copy) {
  message('Please set copy array in .libconfig.js', true);
  return;
}

for (let i = 0; i < libFile.lib.length; i++) {
  libConfig.lib[path.resolve(rootPath, libFile.lib[i])] = true;
}

for (let i = 0; i < libFile.dontLib.length; i++) {
  libConfig.dontLib[path.resolve(rootPath, libFile.dontLib[i])] = true;
}

// 递归 src/, 如果有 *.lib.js 的文件就添加到lib编译中, 请确保 *.lib.js 不要重名
// index.lib.js 为库的默认main文件
// 如果文件夹包含 .lib 就会把文件夹拷贝到输出目录
// 读取根目录的 .libconfig.js 文件，文件返回一个数组，数组的路径如果满足以上规则也会进行编译

const entryList = {};
const copyList = {};
for (let i = 0; i < libFile.copy.length; i++) {
  const str = libFile.copy[i];
  if (Object.prototype.toString.call(str) === '[object Array]' && str.length > 1) {
    copyList[str[1]] = path.resolve(rootPath, str[0]);
  } else if (str.search(/\//) > -1) {
    const list = str.split('/');
    // 如果最终目录是目录
    if (str.search(/\/$/ > -1)) {
      copyList[list[list.length - 2]] = path.resolve(rootPath, str);
    }
    // 如果路径是目录, 最终是文件
    else {
      copyList[list[list.length - 1]] = path.resolve(rootPath, str);
    }
  } else {
    copyList[str] = path.resolve(rootPath, str);
  }
}
function loadAllEnters(rootP) {
  const ignoreFiles = {
    '.DS_Store': true,
  };
  function loadFiles(p, isReal = false) {
    const libList = fs.readdirSync(p);
    for (let i = 0; i < libList.length; i++) {
      const v = libList[i];
      const vp = p + '/' + v;
      if (ignoreFiles[v]) {
        continue;
      }

      const stat = fs.statSync(vp);
      if (stat && stat.isDirectory()) {
        // 如果匹配 isReal === 0, 所有子层级不进行抽离
        if (isReal === 0) {
          loadFiles(vp, 0);
        }
        // 如果匹配 isReal === * 所有子层级都抽离
        else if (isReal === '*') {
          loadFiles(vp, '*');
        }
        // 如果匹配 dontLib, 不进行抽离
        else if (libConfig.dontLib[vp + '/*']) {
          loadFiles(vp, 0);
        } else if (libConfig.dontLib[vp]) {
          loadFiles(vp, false);
        }
        // 如果匹配 lib, 进行抽离
        else if (libConfig.lib[vp + '/*']) {
          loadFiles(vp, '*');
        } else if (libConfig.lib[vp]) {
          loadFiles(vp, true);
        }
        // 如果文件夹名字包含 .lib 进行抽离
        else if (v.search(/\.lib/) > 0) {
          loadFiles(vp, true);
        }
        // 以上不满足，此文件夹不进行抽离
        else {
          loadFiles(vp, false);
        }
      } else {
        // 如果isReal，并且 dotLib 中没有这个文件, 不管文件名有没有包含 .lib 都进行抽离文件
        if (v.search(/\.nolib/) > -1) {
          // 如果文件名包含 nolib 不抽出
        } else if (isReal && !libConfig.dontLib[vp]) {
          if (v.search(/\.js/) > -1 && v.search(/\.json/) < 0) {
            const vlist = v.split('.');
            entryList[vlist[0]] = vp;
          } else if (v.search(/\.d\.ts/) > -1) {
            const vlist = v.split('.');
            copyList[vlist[0] + '.d.ts'] = vp;
          } else if (v.search(/\.(css|scss|less)/) > -1) {
            copyList[v] = vp;
          }
        }
        // 如果 .libconfig.js 中直接包含了文件，也进行抽离
        else if (libConfig.lib[vp]) {
          const vlist = v.split('.');
          entryList[vlist[0]] = vp;
        }
        // 如果以上条件不满足，但是文件名中包含 .lib 进行抽离
        else {
          if (v.search(/\.lib\.js/) > -1 && v.search(/\.json/) < 0) {
            const vlist = v.split('.');
            entryList[vlist[0]] = vp;
          } else if (v.search(/\.lib\.d\.ts/) > -1) {
            const vlist = v.split('.');
            copyList[vlist[0] + '.d.ts'] = vp;
          } else if (v.search(/\.lib\.(css|scss|less)/) > -1) {
            copyList[v] = vp;
          }
        }
      }
    }
  }
  loadFiles(rootP, libConfig.lib[rootP] !== undefined);
}
loadAllEnters(path.resolve(__dirname, '../src'));

module.exports = {
  entryList,
  copyList,
  libFile,
};

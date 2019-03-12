#!/bin/sh

# 确保本地和服务端都有 rsync，服务端确保有 nodejs yarn pm2
# node-server 部署, 包含版本管理和回滚
# bash deploy.sh root@host deploy 0.0.1 #部署为 0.0.1 版本
# bash deploy.sh root@host rollback 0.0.2 #回滚至 0.0.2 版本

# 读取package版本号，也可手动用 $3 赋值
version=`cat package.json | awk -F "[:]" '/"version":/{print$2}'`
version=${version//\ /}
version=${version//\"/}
version=${version//\,/}

if [ "$3" != "" ];then 
  version=$3
fi

if [ "$2" == "" ];then
  echo " "
  echo "=== please input type ==="
  echo "like:"
  echo "bash deploy.sh root@host deploy #部署，并且使用package.json上的版本号做备份，以待回滚"
  echo "bash deploy.sh root@host rollback 0.0.2 #回滚至v002版本"
  echo " "
  exit 0
fi

url=$1
sshkey=~/.ssh/id_rsa
nodePath=/db/static
app=hobbes
needDeployFiles="build coverage/lcov-report"
needDeployNodeModules="hobbes-ui-kit"
appVersion=$app-$version

# 拷贝文件至目标服务器路径
function copyFile(){
  rsync -av --progress --rsh="ssh -i $sshkey" $1 $url:$2
}

# 运行远程 node
function runApp(){
ssh -i $sshkey $url 2>&1 << eeooff
  mkdir -p $nodePath/$app || echo ''
  cp -rf $nodePath/${app}-backup/$1/build/*  $nodePath/$app/
  cp -rf $nodePath/${app}-backup/$1/lcov-report/*  $nodePath/$app-test/
  echo "当前版本号: $version, 项目名: $appVersion"
  echo "访问路径: http://hobbes.workos.top"
  echo "查看测试覆盖率: http://hobbes-test.workos.top"
  echo " "
eeooff
}

# 部署
if [ "$2" == "deploy" ];then
  mkdir -p $appVersion || echo ''
  mkdir -p ${appVersion}/node_modules || echo ''
  cp -rf $needDeployFiles $appVersion
  if [ "$needDeployNodeModules" != "" ]; then
    cp -rf node_modules/${needDeployNodeModules} ${appVersion}/node_modules
  fi
  copyFile $appVersion $nodePath/${app}-backup
  runApp $appVersion
fi

# 回滚
if [ "$2" == "rollback" ];then
  if [ "$3" == "" ];then
    echo " "
    echo "=== please input version ==="
    echo "like:"
    echo "bash deploy.sh root@host rollback 0.0.2 #回滚至v002版本"
    echo " "
    exit 0
  fi
  echo "rollback to $app-$3"
    runApp $app-$3
fi

rm -rf $appVersion
rm -rf build

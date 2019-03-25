function upng() {
  npx gka -d $1 -m -o ./gka-imgs-css
  rm -rf $1
  mv gka-imgs-css/img $1
  rm -rf gka-imgs-css
}

upng $1
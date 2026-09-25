const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
for(const f of ['index.html','styles.css','src','assets'])fs.cpSync(path.join(root,f),path.join(out,f),{recursive:true});
console.log('静态游戏已输出到 dist/，可直接打开 dist/index.html 或托管整个目录。');

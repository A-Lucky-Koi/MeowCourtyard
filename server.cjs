const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = __dirname;
const port = Number(process.env.PORT || 5173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.json':'application/json; charset=utf-8','.wav':'audio/wav','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let rel; try { rel = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400).end();return;}
  const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
}).listen(port,'127.0.0.1',()=>{
  const url = `http://localhost:${port}`;
  console.log(`喵呜庭院已启动 → ${url}\n请保持此窗口开启。按 Ctrl+C 停止。`);
  if (process.argv.includes('--open') && process.platform === 'win32') {
    const browser = spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' });
    browser.on('error', () => console.warn(`无法自动打开浏览器，请手动访问 ${url}`));
  }
}).on('error',e=>{console.error('启动失败：',e.message,`请检查 ${port} 端口是否已被占用；更换网址或端口会使用不同的本地存档。`);process.exitCode=1;});

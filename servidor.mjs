import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const port = Number(process.argv[2] || 8796);
const tipos = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css" };
http.createServer((req,res)=>{
  const u = decodeURIComponent((req.url || "/").split("?")[0]);
  const f = path.join(root, u === "/" ? "public/index.html" : u);
  if(!f.startsWith(root)){ res.writeHead(403); return res.end("no"); }
  fs.readFile(f, (err, buf)=>{
    if(err){ res.writeHead(404); return res.end("nao encontrado"); }
    res.writeHead(200, { "content-type": tipos[path.extname(f)] || "application/octet-stream", "cache-control":"no-store" });
    res.end(buf);
  });
}).listen(port, "127.0.0.1", ()=>console.log("ok"));
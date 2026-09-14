// Локальный просмотр сайта: node site/serve.js → http://localhost:8765
const http = require("http"), fs = require("fs"), path = require("path");
const root = __dirname, types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png" };
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!p.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(p, (err, buf) => err ? res.writeHead(404).end("not found") : res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" }).end(buf));
}).listen(8765, () => console.log("http://localhost:8765"));

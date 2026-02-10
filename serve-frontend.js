/**
 * Static file server for the frontend. Listens on 0.0.0.0:3000
 * so the site works at both http://127.0.0.1:3000 and http://YOUR_IP:3000 (e.g. 172.20.10.11:3000).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getMime(ext) {
  return MIME[ext] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0].replace(/^\//, "") || "index.html";
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\))+/, "");
  let filePath = path.join(ROOT, safePath || "index.html");
  filePath = path.resolve(filePath);

  // Must stay under ROOT (normalize for Windows path comparison)
  const realRoot = path.resolve(ROOT) + path.sep;
  if (filePath !== realRoot.slice(0, -1) && !filePath.startsWith(realRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not found");
      } else {
        res.writeHead(500);
        res.end("Server error");
      }
      return;
    }
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      fs.stat(filePath, (err2, stat2) => {
        if (err2 || !stat2.isFile()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        serveFile(filePath, stat2, res);
      });
      return;
    }
    serveFile(filePath, stat, res);
  });
});

function serveFile(filePath, stat, res) {
  const ext = path.extname(filePath);
  res.setHeader("Content-Type", getMime(ext));
  res.setHeader("Cache-Control", "no-cache");
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(500);
    res.end("Server error");
  });
  stream.pipe(res);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend: http://127.0.0.1:${PORT} and on your network (e.g. http://172.20.10.11:${PORT})`);
});

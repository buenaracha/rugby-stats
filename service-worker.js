const CACHE="rugby-stats-v1"

const archivos = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./sheet.js",
  "./storage.js",
  "./manifest.json",
  "./icon.png",    // Asegurate de que estos nombres sean exactos
  "./icon512.png"  // Si no existen, borrar estas líneas
];

self.addEventListener("install",e=>{
e.waitUntil(
caches.open(CACHE).then(cache=>{
return cache.addAll(archivos)
})
)
})

self.addEventListener("fetch",e=>{
e.respondWith(
caches.match(e.request).then(r=>{
return r || fetch(e.request)
})
)
})
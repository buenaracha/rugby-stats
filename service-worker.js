const CACHE = "rugby-stats-v10"  // ← Cada vez que hagas un deploy, subí este número

const archivos = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./sheet.js",
  "./storage.js",
  "./manifest.json",
  "./icon.png",
  "./icon512.png"
]

// INSTALL: guardar archivos en caché
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(archivos))
  )
  self.skipWaiting()  // ← Activa el nuevo SW inmediatamente sin esperar
})

// ACTIVATE: borrar cachés viejos
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()  // ← Toma control de todas las pestañas abiertas
})

// FETCH: red primero, caché como respaldo
self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Si la respuesta es válida, la guardamos en caché
        if (response && response.status === 200) {
          const cacheResponse = response.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, cacheResponse))
        }
        return response
      })
      .catch(() => {
        // Sin red: servir desde caché (modo offline)
        return caches.match(e.request)
      })
  )
})

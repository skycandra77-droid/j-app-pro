// ============================================================
//  LaundryPOS — Service Worker
//  Strategi: Cache-First untuk aset statis,
//            Network-First untuk halaman utama
// ============================================================

const CACHE_NAME = 'laundrypos-v1';
const CACHE_ASSETS = [
  './',
  './index.html',
  // Font Google (opsional, di-cache saat pertama kali dimuat)
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Nunito:wght@400;600;700;800&display=swap',
  // jsPDF CDN
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

// ── Install: simpan aset ke cache ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching aset utama');
      // Gunakan { cache: 'reload' } agar selalu ambil versi terbaru saat install
      return Promise.allSettled(
        CACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[SW] Gagal cache:', url, err);
          })
        )
      );
    })
  );
  // Aktifkan SW baru segera tanpa menunggu tab lama ditutup
  self.skipWaiting();
});

// ── Activate: hapus cache lama ─────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Menghapus cache lama:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Ambil kendali semua tab yang terbuka langsung
  self.clients.claim();
});

// ── Fetch: strategi per jenis request ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Lewati request non-GET
  if (request.method !== 'GET') return;

  // Lewati request ke API eksternal (Anthropic, dsb.) — jangan di-cache
  if (url.hostname !== location.hostname &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com') &&
      !url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // Halaman HTML → Network-First (tetap mendapat pembaruan)
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Aset statis & font → Cache-First (cepat, hemat bandwidth)
  event.respondWith(cacheFirst(request));
});

// ── Strategi: Network-First ────────────────────────────────
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    console.log('[SW] Offline — menggunakan cache untuk:', request.url);
    const cached = await cache.match(request);
    return cached || offlineFallback();
  }
}

// ── Strategi: Cache-First ──────────────────────────────────
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Tidak dapat mengambil aset:', request.url, err);
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// ── Fallback halaman offline ───────────────────────────────
function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LaundryPOS — Offline</title>
  <style>
    body{font-family:'Nunito',sans-serif;display:flex;flex-direction:column;align-items:center;
         justify-content:center;min-height:100vh;background:#f0ede8;color:#1c1a17;margin:0;text-align:center;padding:20px}
    .icon{font-size:3.5rem;margin-bottom:16px}
    h1{font-size:1.4rem;margin-bottom:8px}
    p{color:#6b6355;font-size:.9rem;max-width:320px;margin-bottom:20px}
    button{padding:10px 28px;background:#2e7d6b;color:white;border:none;border-radius:12px;
           font-size:.95rem;font-weight:700;cursor:pointer}
  </style>
</head>
<body>
  <div class="icon">📶</div>
  <h1>Tidak Ada Koneksi</h1>
  <p>LaundryPOS membutuhkan koneksi internet untuk pertama kali.<br>
     Setelah itu, aplikasi bisa digunakan secara offline.</p>
  <button onclick="location.reload()">Coba Lagi</button>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ── Pesan dari aplikasi (misal: force-update cache) ────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0]?.postMessage({ cleared: true });
    });
  }
});

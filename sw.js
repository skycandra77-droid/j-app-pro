const CACHE_NAME = 'j-app-pro-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './manifest.json',
    './logo.png'
];

// 1. Proses Install & Amankan Aset Inti Aplikasi Toko
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Mengamankan aset inti J APP PRO ke cache...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Pembersihan Cache Lama Jika Ada Update Sistem Baru
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('🧹 Menghapus cache usang J APP PRO...');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Strategi Pengambilan Data (Network First falling back to Cache)
self.addEventListener('fetch', (event) => {
    // JANGAN cache request data Google Sheets agar laporan pembukuan kasir murni live harian
    if (event.request.url.includes('docs.google.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

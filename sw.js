/* MediControl — Service Worker (offline) · v1 */
const CACHE = 'medicontrol-v9';
const CORE = ['./','./index.html','./app.js','./tailwind.css','./manifest.json','./icon-192.png','./icon-512.png','./icon-180.png','./react.production.min.js','./react-dom.production.min.js','./jspdf.umd.min.js','./jspdf.plugin.autotable.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(caches.match('./index.html').then(c => c || fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp)).catch(()=>{});return r;}).catch(()=>caches.match('./index.html')))); return; }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r=>{try{if(r&&r.status===200&&r.type==='basic'){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp)).catch(()=>{});}}catch(_){ } return r;}).catch(()=>hit)));
});

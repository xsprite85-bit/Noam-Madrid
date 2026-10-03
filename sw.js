const V='nm-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function timeout(ms){return new Promise((_,r)=>setTimeout(()=>r(new Error('t')),ms))}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    // pages: network first (so updates arrive), fall back to the saved copy when offline or slow
    if(req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){
      e.respondWith((async()=>{
        const c=await caches.open(V);
        try{const r=await Promise.race([fetch(req),timeout(3500)]);if(r&&r.ok){c.put('./index.html',r.clone());return r}}catch(_){}
        return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
      })());
      return;
    }
    e.respondWith(caches.match(req).then(h=>h||fetch(req).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(req,cp))}return r})));
    return;
  }
  if(FONT_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(V).then(async c=>{
      const h=await c.match(req);
      const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>h);
      return h||net;
    }));
  }
  // everything else (maps, calendar, Google Sheet) goes straight to the network
});

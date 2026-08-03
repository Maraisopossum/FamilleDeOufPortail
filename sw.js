/* Service worker unique — Les Jeux de la Famille (Quiz + Bataille Navale).
   Règle d'or : on ne met en cache QUE la coquille statique.
   Tout ce qui touche Supabase (données dynamiques) passe toujours par le réseau. */

const CACHE = "jeux-famille-shell-v12";
const SHELL = [
  "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png",
  "./logos/logo.png", "./logos/quiz-logo.png", "./logos/naval-logo.png", "./logos/puissance4-logo.png", "./logos/paire-logo.png",
  "./shared/ui.css", "./shared/router.js", "./shared/profile.js", "./shared/history.js", "./shared/supabase-client.js",
  "./games/quiz.js", "./games/naval.js", "./games/connect4.js", "./games/paires.js", "./games/guesswho.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Données dynamiques (Supabase, questions.json legacy) : jamais de cache.
  if (e.request.method !== "GET" || url.hostname.endsWith("supabase.co") || url.pathname.endsWith("questions.json")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || networkFetch;
    })
  );
});

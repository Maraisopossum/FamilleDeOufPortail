// Petit routeur par hash, sans dépendance. Une "route" est une fonction
// async (container) => void|cleanupFn appelée à chaque navigation.
const routes = {};
let notFound = null;
let currentCleanup = null;
let container = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}
export function registerNotFound(handler) {
  notFound = handler;
}

function currentPath() {
  const hash = location.hash || "#/";
  const path = hash.startsWith("#") ? hash.slice(1) : hash;
  return (path || "/").split("?")[0];
}

async function renderRoute() {
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch (e) { /* noop */ }
  }
  currentCleanup = null;
  const path = currentPath();
  const handler = routes[path] || notFound;
  if (!handler) return;
  container.innerHTML = "";
  const result = await handler(container);
  if (typeof result === "function") currentCleanup = result;
}

export function navigate(path) {
  const target = "#" + path;
  if (location.hash === target) {
    // Le hash ne change pas, donc "hashchange" ne se déclenchera pas tout seul.
    renderRoute();
    return;
  }
  location.hash = target;
}

export function startRouter(appContainer) {
  container = appContainer;
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

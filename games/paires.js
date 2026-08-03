// Jeu des Paires de la Tribu — Memory, sur le même modèle que naval.js et
// connect4.js (solo, duel en salon avec code, historique partagé). Comme
// pour Puissance 4, le plateau entier peut être partagé tel quel (pas
// d'information à cacher), ce qui simplifie beaucoup la synchronisation.
import { supabase as client, SUPABASE_URL, SUPABASE_ANON_KEY, CONFIG_OK } from "../shared/supabase-client.js";
import { getActiveProfile } from "../shared/profile.js";

export const GAME_NAME = "Jeu des Paires de la Tribu";

const SIZES = {
  small : { cols:3, rows:4, label:"Petit",    desc:"6 paires · pour les plus petits" },
  medium: { cols:4, rows:4, label:"Standard", desc:"8 paires · le format classique" },
  large : { cols:6, rows:4, label:"Défi",     desc:"12 paires · pour les experts" }
};
const EMOJI_POOL = ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦄","🐢"];

/* ============ CSS spécifique (scopé à .paires-screen) ============ */
if (!document.getElementById("paires-styles")) {
  const style = document.createElement("style");
  style.id = "paires-styles";
  style.textContent = `
  .paires-screen .screen{display:none;animation:pr-fade .28s ease;}
  .paires-screen .screen.on{display:block;}
  @keyframes pr-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .paires-screen .lead{color:var(--muted);font-size:15px;line-height:1.5;margin:6px 0 20px;}
  .paires-screen .status{border-radius:14px;padding:12px 15px;font-size:14px;line-height:1.45;margin:14px 0;}
  .paires-screen .status.ok{background:rgba(61,220,151,.13);border:1px solid var(--teal);color:#c9ffe6;}
  .paires-screen .status.err{background:rgba(255,93,115,.13);border:1px solid var(--coral);color:#ffd7dd;}
  .paires-screen .status.info{background:rgba(91,141,238,.13);border:1px solid var(--blue);color:#d7e3ff;}
  .paires-screen .status[hidden]{display:none;}
  .paires-screen .hidden{display:none !important;}
  .paires-screen .center{text-align:center;}
  .paires-screen .code{font-family:'Kalam',cursive;font-weight:700;font-size:42px;letter-spacing:8px;color:var(--gold);text-align:center;margin:10px 0 4px;}
  .paires-screen .rooms{display:flex;flex-direction:column;gap:8px;}
  .paires-screen .room{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--panel-light);border:2px solid rgba(255,200,87,.4);border-radius:16px;padding:13px 15px;cursor:pointer;color:var(--text);font:inherit;transition:border-color .15s ease, transform .15s ease;}
  .paires-screen .room:hover{border-color:var(--gold);transform:translateY(-2px);}
  .paires-screen .room .rc{font-family:'Kalam',cursive;font-weight:700;font-size:22px;color:var(--gold);letter-spacing:2px;flex:0 0 auto;}
  .paires-screen .room .ri{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}
  .paires-screen .room .rh{font-family:'Baloo 2',cursive;font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .paires-screen .room .rt{font-size:12px;color:var(--muted);margin-top:2px;}
  .paires-screen .room .go{font-size:20px;flex:0 0 auto;}
  .paires-screen .turnbar{border-radius:16px;padding:13px 16px;margin-bottom:14px;font-family:'Baloo 2',cursive;font-weight:700;font-size:17px;text-align:center;}
  .paires-screen .turnbar.mine{background:rgba(61,220,151,.15);border:1px solid var(--teal);}
  .paires-screen .turnbar.theirs{background:rgba(184,169,217,.12);border:1px solid var(--muted);}
  .paires-screen .pr-board{display:grid;gap:8px;max-width:480px;margin:0 auto;}
  .paires-screen .pr-card{aspect-ratio:1;border-radius:12px;background:var(--panel-light);border:2px solid rgba(255,200,87,.35);display:grid;place-items:center;font-size:clamp(18px,6vw,32px);cursor:pointer;transition:transform .15s ease, background .15s ease;user-select:none;}
  .paires-screen .pr-card.face{background:var(--panel);transform:none;}
  .paires-screen .pr-card.matched{background:rgba(61,220,151,.18);border-color:var(--teal);cursor:default;}
  .paires-screen .pr-card.disabled{cursor:default;}
  .paires-screen .pr-stats{display:flex;flex-wrap:wrap;gap:18px;margin-top:16px;justify-content:center;}
  .paires-screen .pr-stat .v{font-family:'Kalam',cursive;font-weight:700;font-size:26px;color:var(--gold);line-height:1;}
  .paires-screen .pr-stat .k{font-size:12px;color:var(--muted);margin-top:2px;text-align:center;}
  @media (max-width:560px){
    .paires-screen .card{padding:16px 6px;}
    .paires-screen .pr-board{gap:5px;}
  }
  @media (prefers-reduced-motion:reduce){ .paires-screen *{animation:none !important;transition:none !important;} }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   UTILITAIRES
   ============================================================ */
function escAttr(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/"/g,"&quot;")
    .replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function ago(iso){
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000;
  if(diff < 60) return "à l'instant";
  if(diff < 3600) return "il y a " + Math.floor(diff/60) + " min";
  if(diff < 86400) return "il y a " + Math.floor(diff/3600) + " h";
  if(diff < 604800) return "il y a " + Math.floor(diff/86400) + " j";
  return d.toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"2-digit" });
}
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}
function makeLayout(sizeKey){
  const { cols, rows } = SIZES[sizeKey];
  const pairs = (cols*rows)/2;
  const symbols = shuffle(EMOJI_POOL).slice(0, pairs);
  return shuffle(symbols.concat(symbols));
}

/* ---------- sons (Web Audio, aucun fichier ; mute partagé window.soundMuted) ---------- */
let audioCtx = null;
function beep(freq, dur, type, vol){
  if(window.soundMuted) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol == null ? 0.16 : vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }catch(e){}
}
const SFX = {
  flip  : () => beep(500,.06,"square",.10),
  match : () => [523,659,784].forEach((f,i)=>setTimeout(()=>beep(f,.16,"triangle",.15), i*90)),
  miss  : () => beep(180,.16,"sine",.10),
  win   : () => [392,494,587,784].forEach((f,i)=>setTimeout(()=>beep(f,.22,"triangle",.17), i*140)),
  lose  : () => [392,330,262,175].forEach((f,i)=>setTimeout(()=>beep(f,.28,"sine",.15), i*180)),
  tap   : () => beep(660,.05,"square",.07)
};

/* ---------- Supabase REST ---------- */
async function sb(path, opts){
  opts = opts || {};
  if(!CONFIG_OK) throw new Error("Clé Supabase absente");
  const url = SUPABASE_URL + "/rest/v1/" + path;
  const res = await fetch(url, {
    method: opts.method || "GET",
    cache: "no-store",
    headers: Object.assign({
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation"
    }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if(!res.ok) throw new Error("Supabase " + res.status + " : " + (await res.text()));
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}
const roomLoad  = (code) => sb("paires_rooms?code=eq." + encodeURIComponent(code) + "&select=*").then(r => (r && r[0]) || null);
const roomPatch = (code, body) => sb("paires_rooms?code=eq." + encodeURIComponent(code), { method:"PATCH", body });

/* ============================================================
   ANNULATION D'UN SALON
   ============================================================ */
async function cancelRoom(){
  if(!S.code) return;
  const code = S.code;
  try{
    const r = await roomLoad(code);
    const opponentPresent = r && ((S.role === "host" && r.guest_name) || (S.role === "guest" && r.host_name));
    if(opponentPresent){
      await roomPatch(code, { status:"cancelled" });
    }else{
      await sb("paires_rooms?code=eq." + code, { method:"DELETE" });
    }
  }catch(e){}
  leaveRoomChannel();
  S.code = null; S.mode = null; S.ended = true;
  resetMultiPanels();
  show("mode");
  refreshLobby();
}

/* ============================================================
   ÉTAT GLOBAL
   ============================================================ */
const S = {
  profile   : null,
  mode      : null,      // "solo" | "multi"
  role      : null,      // "host" | "guest"
  code      : null,
  foe       : "",
  sizeKey   : "medium",
  layout    : [],
  matched   : [],
  turn      : "host",
  hostScore : 0,
  guestScore: 0,
  flipped   : [],         // indices retournés localement, en attente de résolution
  busy      : false,      // vrai pendant la petite pause de vérification d'une paire
  moves     : 0,
  over      : false,
  ended     : false,
  fallback  : null,
  startedAt : 0
};
function freshLocalGame(){
  S.layout = makeLayout(S.sizeKey);
  S.matched = S.layout.map(() => false);
  S.turn = "host";
  S.hostScore = 0; S.guestScore = 0;
  S.flipped = []; S.busy = false; S.moves = 0;
  S.over = false; S.ended = false;
  S.startedAt = Date.now();
}

/* ============================================================
   MODULE : conteneur DOM + helpers scopés
   ============================================================ */
let root = null;
function $(sel){ return root ? root.querySelector(sel) : document.querySelector(sel); }
function $$(sel){ return root ? Array.from(root.querySelectorAll(sel)) : []; }

let backTo = null;
function show(name, back){
  $$(".screen").forEach(s => s.classList.toggle("on", s.dataset.screen === name));
  backTo = back || null;
  const backBtn = $("#btnBack");
  if(backBtn) backBtn.classList.toggle("hidden", !back);
  window.scrollTo({ top:0, behavior:"smooth" });
}

/* ============================================================
   ÉCRAN "MODE"
   ============================================================ */
let pendingAction = "solo"; // "solo" | "host" — ce que fait l'écran taille une fois choisi
function bindModeScreen(){
  $$(".role-card[data-mode]").forEach(b => b.addEventListener("click", () => {
    SFX.tap();
    const m = b.dataset.mode;
    if(m === "solo"){ S.mode = "solo"; pendingAction = "solo"; show("size", "mode"); }
    else if(m === "histo"){ location.hash = "#/historique"; }
    else {
      S.mode = "multi";
      if(!CONFIG_OK){
        $("#multiErr").hidden = false;
        $("#multiErr").textContent = "Le duel en ligne a besoin de la clé Supabase.";
      }
      resetMultiPanels();
      show("multi", "mode");
      refreshLobby();
      startLobbyWatch();
    }
  }));
}

/* ============================================================
   ÉCRAN "TAILLE" (solo, ou choix avant d'ouvrir un salon)
   ============================================================ */
function bindSizeScreen(){
  $$(".role-card[data-size]").forEach(b => b.addEventListener("click", () => {
    S.sizeKey = b.dataset.size;
    SFX.tap();
    if(pendingAction === "solo"){
      S.role = "host";
      freshLocalGame();
      startGame();
    }else{
      createHostedRoom();
    }
  }));
}

/* ============================================================
   LOBBY MULTIJOUEUR
   ============================================================ */
function makeCode(){
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1
  return Array.from({length:4}, () => A.charAt(Math.floor(Math.random()*A.length))).join("");
}
async function purgeStaleRooms(){
  if(!CONFIG_OK) return;
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  try{ await sb("paires_rooms?created_at=lt." + encodeURIComponent(cutoff), { method:"DELETE" }); }catch(e){}
}
let lobbyChannel = null;
async function refreshLobby(){
  if(!CONFIG_OK) return;
  const me = encodeURIComponent(S.profile.name);
  purgeStaleRooms();
  try{
    const open = await sb("paires_rooms?select=code,host_name,status,created_at,layout" +
      "&status=eq.waiting&guest_name=is.null&order=created_at.desc&limit=12");
    const mine = await sb("paires_rooms?select=*" +
      "&or=(host_name.eq." + me + ",guest_name.eq." + me + ")" +
      "&status=eq.playing&order=created_at.desc&limit=5");
    renderLobby(open || [], mine || []);
  }catch(e){
    $("#openRooms").innerHTML = '<p class="muted">Liste des salons indisponible. Le code fonctionne toujours.</p>';
  }
}
function sizeFromLayoutLength(len){
  return Object.entries(SIZES).find(([,v]) => v.cols*v.rows === len);
}
function renderLobby(open, mine){
  const box = $("#resumeBox");
  if(mine.length){
    box.hidden = false;
    box.innerHTML = '<b>Tu as ' + (mine.length > 1 ? mine.length + ' parties en cours' : 'une partie en cours') + '.</b>' +
      '<div class="rooms" style="margin-top:10px">' + mine.map(r => {
        const iAmHost = r.host_name === S.profile.name;
        const foe = (iAmHost ? r.guest_name : r.host_name) || "adversaire à venir";
        const yours = r.turn === (iAmHost ? "host" : "guest");
        return '<button class="room" data-resume="' + escAttr(r.code) + '">' +
               '<span class="rc">🎴</span>' +
               '<span class="ri"><span class="rh">contre ' + escAttr(foe) + '</span>' +
               '<span class="rt">' + (yours ? "c'est à toi de jouer" : "au tour de l'adversaire") + ' · ' + ago(r.created_at) + '</span></span>' +
               '<span class="go">▶</span></button>';
      }).join("") + '</div>';
  }else{
    box.hidden = true;
    box.innerHTML = "";
  }

  const el = $("#openRooms");
  const joinable = open.filter(r => r.host_name !== S.profile.name);
  const own = open.filter(r => r.host_name === S.profile.name);
  let html = "";
  if(joinable.length){
    html += joinable.map(r => {
      const sz = sizeFromLayoutLength((r.layout||[]).length);
      return '<button class="room" data-join="' + escAttr(r.code) + '">' +
      '<span class="rc">🎴</span>' +
      '<span class="ri"><span class="rh">' + escAttr(r.host_name) + ' attend un adversaire</span>' +
      '<span class="rt">' + (sz ? sz[1].label + " · " : "") + 'ouvert ' + ago(r.created_at) + '</span></span>' +
      '<span class="go">▶</span></button>';
    }).join("");
  }
  if(own.length){
    html += own.map(r =>
      '<button class="room" data-join="' + escAttr(r.code) + '" style="border-color:rgba(184,169,217,.3)">' +
      '<span class="rc">🎴</span>' +
      '<span class="ri"><span class="rh">Ton salon</span>' +
      '<span class="rt">en attente d\'un adversaire — retourner dedans</span></span>' +
      '<span class="go">▶</span></button>').join("");
  }
  el.innerHTML = html || '<p class="muted">Aucun salon ouvert pour l\'instant. Ouvre le tien, il apparaîtra chez les autres.</p>';
}
function bindLobbyDelegates(){
  $("#openRooms").addEventListener("click", (e) => {
    const b = e.target.closest("[data-join]");
    if(b) joinRoom(b.dataset.join);
  });
  $("#resumeBox").addEventListener("click", (e) => {
    const b = e.target.closest("[data-resume]");
    if(b) resumeRoom(b.dataset.resume);
  });
  $("#btnPurgeRooms").addEventListener("click", async () => {
    const btn = $("#btnPurgeRooms");
    btn.disabled = true; btn.textContent = "Nettoyage…";
    try{
      await sb("paires_rooms?status=eq.waiting&host_name=neq." + encodeURIComponent(S.profile.name), { method:"DELETE" });
    }catch(e){}
    btn.disabled = false; btn.textContent = "🧹 Vider les salons inactifs";
    refreshLobby();
  });
}
function startLobbyWatch(){
  if(!client || lobbyChannel) return;
  lobbyChannel = client
    .channel("paires-lobby")
    .on("postgres_changes", { event:"*", schema:"public", table:"paires_rooms" }, () => {
      const multiScreen = $('[data-screen=multi]');
      if(multiScreen && multiScreen.classList.contains("on")) refreshLobby();
    })
    .subscribe();
}
function resetMultiPanels(){
  $("#multiErr").hidden = true;
  $("#multiChoice").classList.remove("hidden");
  $("#multiJoin").classList.add("hidden");
  const codeInput = $("#joinCode");
  if(codeInput) codeInput.value = "";
}

function bindHostRoomButton(){
  $("#btnHost").addEventListener("click", async () => {
    if(!CONFIG_OK) return;
    try{
      const mine = await sb("paires_rooms?select=code&host_name=eq." + encodeURIComponent(S.profile.name) +
        "&status=in.(waiting,playing)&order=created_at.desc&limit=1");
      if(mine && mine[0]){ return resumeRoom(mine[0].code); }
    }catch(e){}
    pendingAction = "host";
    show("size", "multi");
  });
  $("#btnJoinPick").addEventListener("click", () => {
    $("#multiChoice").classList.add("hidden");
    $("#multiJoin").classList.remove("hidden");
    $("#joinCode").focus();
  });
  $("#btnJoinCancel").addEventListener("click", resetMultiPanels);
  $("#btnJoinGo").addEventListener("click", () => joinRoom($("#joinCode").value.trim().toUpperCase()));
  $("#btnCancelRoom").addEventListener("click", cancelRoom);
}
async function createHostedRoom(){
  const code = makeCode();
  const layout = makeLayout(S.sizeKey);
  try{
    await sb("paires_rooms", { method:"POST", body:{
      code, host_name:S.profile.name, status:"waiting", turn:"host",
      layout, matched: layout.map(() => false), host_score:0, guest_score:0
    }});
  }catch(e){
    $("#multiErr").hidden = false;
    $("#multiErr").textContent = "Le salon n'a pas pu être ouvert. Vérifie la table paires_rooms.";
    show("multi", "mode");
    return;
  }
  S.role = "host"; S.code = code; S.foe = "";
  S.layout = layout; S.matched = layout.map(() => false);
  S.turn = "host"; S.hostScore = 0; S.guestScore = 0; S.flipped = []; S.over = false; S.ended = false;
  joinRoomChannel(code);
  startGame();
}

async function joinRoom(code){
  if(!code || code.length !== 4) return;
  try{
    const r = await roomLoad(code);
    if(!r) throw new Error("introuvable");
    if(r.host_name === S.profile.name) return resumeRoom(code);
    if(r.guest_name && r.guest_name !== S.profile.name) throw new Error("plein");
    if(r.guest_name === S.profile.name) return resumeRoom(code);
    await roomPatch(code, { guest_name:S.profile.name, status:"playing" });
    S.role = "guest"; S.code = code; S.foe = r.host_name;
    S.layout = r.layout; S.matched = r.matched || r.layout.map(() => false);
    S.turn = r.turn || "host"; S.hostScore = r.host_score||0; S.guestScore = r.guest_score||0;
    S.flipped = []; S.over = false; S.ended = false;
    joinRoomChannel(code);
    startGame();
  }catch(e){
    $("#multiErr").hidden = false;
    $("#multiErr").textContent = e.message === "plein"
      ? "Ce salon est déjà complet."
      : "Aucun salon actif avec ce code.";
    resetMultiPanels();
  }
}

async function resumeRoom(code){
  const r = await roomLoad(code);
  if(!r) return;
  S.mode = "multi";
  S.code = code;
  S.role = r.host_name === S.profile.name ? "host" : "guest";
  S.foe  = (S.role === "host" ? r.guest_name : r.host_name) || "";
  S.layout = r.layout || [];
  S.matched = r.matched || S.layout.map(() => false);
  S.turn = r.turn || "host";
  S.hostScore = r.host_score||0; S.guestScore = r.guest_score||0;
  S.flipped = []; S.over = false; S.ended = false;
  joinRoomChannel(code);
  startGame();
  if(r.status === "cancelled" || r.status === "finished"){
    onRoomUpdate(r);
  }
}

/* ============================================================
   TEMPS RÉEL + SONDAGE DE SECOURS
   ============================================================ */
let roomChannel = null;
function joinRoomChannel(code){
  leaveRoomChannel();
  if(client){
    roomChannel = client
      .channel("paires-room-" + code)
      .on("postgres_changes",
          { event:"UPDATE", schema:"public", table:"paires_rooms", filter:"code=eq." + code },
          (payload) => onRoomUpdate(payload.new))
      .subscribe();
  }
  startFallback();
}
function leaveRoomChannel(){
  if(roomChannel && client){ client.removeChannel(roomChannel); roomChannel = null; }
  stopFallback();
}
function startFallback(){
  stopFallback();
  S.fallback = setInterval(async () => {
    if(!S.code || S.ended) return;
    try{ const r = await roomLoad(S.code); if(r) onRoomUpdate(r); }catch(e){}
  }, 4000);
}
function stopFallback(){ if(S.fallback){ clearInterval(S.fallback); S.fallback = null; } }

async function onRoomUpdate(r){
  if(!r || r.code !== S.code) return;

  if(r.status === "cancelled" && !S.ended){
    S.ended = true;
    leaveRoomChannel();
    alert("L'autre joueur a annulé ce salon.");
    S.code = null; S.mode = null;
    resetMultiPanels();
    show("mode");
    refreshLobby();
    return;
  }

  let foeJustArrived = false;
  if(S.role === "host" && r.guest_name && S.foe !== r.guest_name){
    S.foe = r.guest_name;
    foeJustArrived = true;
  }

  const changed = !S.busy && (
    foeJustArrived ||
    JSON.stringify(r.matched) !== JSON.stringify(S.matched) ||
    r.turn !== S.turn ||
    (r.host_score||0) !== S.hostScore ||
    (r.guest_score||0) !== S.guestScore
  );
  if(changed){
    S.matched = r.matched || S.matched;
    S.turn = r.turn;
    S.hostScore = r.host_score||0; S.guestScore = r.guest_score||0;
    S.flipped = [];
    paintBoard();
  }

  if(r.status === "finished" && !S.ended){
    S.ended = true; S.over = true;
    finish(r.winner === S.profile.name, r.winner == null);
  }
}

/* ============================================================
   ÉCRAN "PARTIE"
   ============================================================ */
function myOwner(){ return S.mode === "solo" ? "host" : S.role; }
function isMyTurn(){ return S.mode === "solo" ? true : S.turn === S.role; }

function startGame(){
  show("game", S.mode === "solo" ? "size" : "mode");
  $("#foeName").textContent = S.mode === "solo" ? "toi-même" : (S.foe || "adversaire à venir");
  buildBoard();
  paintBoard();
}
function buildBoard(){
  const found = sizeFromLayoutLength(S.layout.length);
  const { cols } = found ? SIZES[found[0]] : SIZES.medium;
  $("#prBoard").style.gridTemplateColumns = "repeat(" + cols + ",minmax(0,1fr))";
}

function paintBoard(){
  const board = $("#prBoard");
  if(!board) return;
  const foeEl = $("#foeName");
  if(foeEl) foeEl.textContent = S.mode === "solo" ? "toi-même" : (S.foe || "adversaire à venir");
  board.innerHTML = S.layout.map((sym, i) => {
    const isMatched = S.matched[i];
    const isFlipped = S.flipped.includes(i);
    const showFace = isMatched || isFlipped;
    const canClick = !S.over && !S.busy && isMyTurn() && !isMatched && !isFlipped && S.flipped.length < 2 &&
                      (S.mode === "solo" || !!S.foe);
    return '<div class="pr-card' + (showFace ? " face" : "") + (isMatched ? " matched" : "") + (!canClick ? " disabled" : "") +
           '" data-i="' + i + '">' + (showFace ? sym : "❔") + '</div>';
  }).join("");

  const turnBar = $("#turnBar");
  if(turnBar){
    if(S.over){
      turnBar.textContent = "Partie terminée.";
      turnBar.className = "turnbar theirs";
    }else if(S.mode === "solo"){
      turnBar.textContent = "Trouve toutes les paires !";
      turnBar.className = "turnbar mine";
    }else if(!S.foe){
      turnBar.textContent = "En attente d'un adversaire…";
      turnBar.className = "turnbar theirs";
    }else{
      const mine = isMyTurn();
      turnBar.textContent = mine ? "À toi de jouer" : (S.foe || "L'adversaire") + " réfléchit…";
      turnBar.className = "turnbar " + (mine ? "mine" : "theirs");
    }
  }
  const scoreLine = $("#scoreLine");
  if(scoreLine){
    scoreLine.classList.toggle("hidden", S.mode !== "multi");
    if(S.mode === "multi"){
      scoreLine.textContent = S.profile.name + " : " + S.hostScoreFor(S.role) + "  ·  " + (S.foe || "?") + " : " + S.hostScoreFor(S.role === "host" ? "guest" : "host");
    }
  }
  const movesEl = $("#statMoves"); if(movesEl) movesEl.textContent = S.moves;
  const cancelBtn = $("#btnCancelGame");
  if(cancelBtn) cancelBtn.classList.toggle("hidden", S.mode !== "multi" || S.over);
}
S.hostScoreFor = function(role){ return role === "host" ? S.hostScore : S.guestScore; };

function bindGameScreen(){
  $("#prBoard").addEventListener("click", (e) => {
    const card = e.target.closest("[data-i]");
    if(!card || S.busy || S.over || !isMyTurn() || (S.mode === "multi" && !S.foe)) return;
    flipCard(parseInt(card.dataset.i, 10));
  });
  $("#btnCancelGame").addEventListener("click", () => {
    if(confirm("Annuler ce salon ? Si un adversaire l'a déjà rejoint, la partie s'arrêtera aussi pour lui.")) cancelRoom();
  });
}

function flipCard(i){
  if(S.matched[i] || S.flipped.includes(i) || S.flipped.length >= 2) return;
  SFX.flip();
  S.flipped.push(i);
  paintBoard();
  if(S.flipped.length === 2){
    S.moves++;
    S.busy = true;
    setTimeout(resolveFlip, 800);
  }
}

async function resolveFlip(){
  const [a, b] = S.flipped;
  const isMatch = S.layout[a] === S.layout[b];
  const owner = myOwner();
  if(isMatch){
    S.matched[a] = true; S.matched[b] = true;
    if(owner === "host") S.hostScore++; else S.guestScore++;
    SFX.match();
  }else{
    SFX.miss();
  }
  S.flipped = [];
  S.busy = false;

  const allFound = S.matched.every(Boolean);
  if(!isMatch){
    // Le tour passe à l'autre joueur (en solo, on continue toujours).
    if(S.mode === "multi") S.turn = S.turn === "host" ? "guest" : "host";
  }
  paintBoard();

  if(allFound){
    S.over = true;
    await concludeGame();
    return;
  }

  if(S.mode === "multi"){
    try{
      await roomPatch(S.code, {
        matched: S.matched, turn: S.turn, host_score: S.hostScore, guest_score: S.guestScore
      });
    }catch(e){
      const bar = $("#turnBar");
      if(bar){ bar.textContent = "Coup non transmis — vérifie la connexion."; bar.className = "turnbar theirs"; }
    }
  }
}

async function concludeGame(){
  if(S.mode === "multi"){
    let winner = null;
    if(S.hostScore !== S.guestScore){
      winner = S.hostScore > S.guestScore
        ? (S.role === "host" ? S.profile.name : S.foe)
        : (S.role === "host" ? S.foe : S.profile.name);
    }
    try{ await roomPatch(S.code, { matched: S.matched, status:"finished", winner, host_score:S.hostScore, guest_score:S.guestScore }); }catch(e){}
    const myScore = S.hostScoreFor(myOwner());
    const foeScore = S.hostScoreFor(myOwner() === "host" ? "guest" : "host");
    finish(myScore > foeScore ? true : myScore < foeScore ? false : null, myScore === foeScore);
  }else{
    finish(true, false);
  }
}

/* ============================================================
   FIN DE PARTIE
   ============================================================ */
async function finish(won, draw){
  leaveRoomChannel();
  const elapsedS = Math.round((Date.now() - S.startedAt)/1000);
  $("#endIcon").textContent = draw ? "🤝" : won ? "🏆" : "😅";
  $("#endTitle").textContent = S.mode === "solo" ? "Bravo !" : draw ? "Match nul !" : won ? "Victoire !" : "Perdu !";
  $("#endText").textContent = S.mode === "solo"
    ? "Toutes les paires trouvées en " + S.moves + " coups, en " + elapsedS + " secondes."
    : draw
      ? "Vous avez trouvé autant de paires l'un que l'autre !"
      : won
        ? "Bien joué " + S.profile.name + " ! Tu as trouvé le plus de paires."
        : (S.foe || "L'adversaire") + " a trouvé plus de paires que toi. Revanche ?";
  draw ? SFX.tap() : (won || S.mode === "solo" ? SFX.win() : SFX.lose());
  show("end");

  const msg = $("#saveMsg");
  if(CONFIG_OK && !S.profile.isGuest){
    const wrongAttempts = Math.max(0, S.moves - (S.layout.length/2));
    const score = S.mode === "solo"
      ? Math.max(0, Math.round((S.layout.length/2)*10 - wrongAttempts))
      : S.hostScoreFor(myOwner());
    try{
      await sb("game_history", { method:"POST", prefer:"return=minimal", body:{
        profile_name : S.profile.name,
        game         : GAME_NAME,
        mode         : S.mode,
        score        : score,
        rank         : S.mode === "solo" ? null : (draw ? null : (won ? 1 : 2)),
        total_players: S.mode === "solo" ? 1 : 2,
        total_questions: S.mode === "solo" ? S.moves : null,
        room_code    : S.code
      }});
      msg.hidden = false; msg.className = "status ok";
      msg.textContent = "Résultat enregistré dans l'historique commun des jeux de la tribu.";
    }catch(e){
      msg.hidden = false; msg.className = "status err";
      msg.textContent = "Le résultat n'a pas pu être enregistré. La partie compte quand même.";
    }
  }else{
    msg.hidden = true;
  }
}
function bindEndScreen(){
  $("#btnAgain").addEventListener("click", () => {
    if(S.mode === "solo"){ freshLocalGame(); startGame(); }
    else { S.code = null; S.mode = null; show("mode"); }
  });
  $("#btnHome").addEventListener("click", () => { S.code = null; S.mode = null; show("mode"); });
}

/* ============================================================
   MARKUP (toutes les sections en un seul fragment)
   ============================================================ */
function shellHtml(){
  return `
    <button class="btn btn-ghost btn-sm hidden" id="btnBack" style="margin-bottom:14px;">‹ Retour</button>

    <section class="screen on" data-screen="mode">
      <div class="card" style="text-align:center;padding:18px;">
        <img src="./logos/paire-logo.png" alt="Jeu des Paires de la Tribu" style="width:100%;max-width:420px;border-radius:20px;">
      </div>
      <div class="card">
        <h2>Comment tu joues ?</h2>
        <p class="lead">Retourne deux cartes à la fois pour retrouver toutes les paires — de mémoire !</p>
        <div class="role-grid role-grid-3">
          <div class="role-card" data-mode="solo">
            <div class="emoji">🎯</div><h3>Solo</h3>
            <p>Trouve toutes les paires avec le moins de coups possible.</p>
          </div>
          <div class="role-card" data-mode="multi">
            <div class="emoji">📡</div><h3>Duel en famille</h3>
            <p>Deux appareils. Rejoins un salon ouvert d'un tap, ou entre un code.</p>
          </div>
          <div class="role-card" data-mode="histo">
            <div class="emoji">📜</div><h3>Historique</h3>
            <p>Le palmarès de la tribu et les dernières parties jouées.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="size">
      <div class="card">
        <h2>Quelle taille de grille ?</h2>
        <p class="lead">Plus la grille est grande, plus il y a de paires à retenir.</p>
        <div class="role-grid role-grid-3">
          ${Object.entries(SIZES).map(([key, s]) => `
            <div class="role-card" data-size="${key}">
              <div class="emoji">${key === "small" ? "🌱" : key === "medium" ? "🎴" : "🔥"}</div>
              <h3>${s.label}</h3><p>${s.desc}</p>
            </div>
          `).join("")}
        </div>
      </div>
    </section>

    <section class="screen" data-screen="multi">
      <div class="card">
        <h2>Duel en famille</h2>
        <div class="status err" id="multiErr" hidden></div>
        <div id="multiChoice">
          <div class="status info" id="resumeBox" hidden></div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <label class="field-label" style="margin:0;">Salons en attente d'un adversaire</label>
            <button class="btn btn-ghost btn-sm" id="btnPurgeRooms" type="button">🧹 Vider les salons inactifs</button>
          </div>
          <div id="openRooms" class="rooms"></div>
          <div class="role-grid" style="margin-top:18px">
            <div class="role-card" id="btnHost"><div class="emoji">🏳️</div><h3>Ouvrir un salon</h3><p>Choisis une taille de grille, ton salon apparaît aussitôt dans la liste des autres.</p></div>
            <div class="role-card" id="btnJoinPick"><div class="emoji">🔑</div><h3>Entrer un code</h3><p>Si le salon ne s'affiche pas dans la liste.</p></div>
          </div>
        </div>
        <div id="multiJoin" class="hidden">
          <label class="field-label" for="joinCode">Code du salon</label>
          <input type="text" id="joinCode" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;letter-spacing:6px;font-family:'Kalam',cursive;font-size:26px;text-align:center">
          <div class="btn-row" style="margin-top:14px">
            <button class="btn btn-gold" id="btnJoinGo">Rejoindre le duel</button>
            <button class="btn btn-ghost" id="btnJoinCancel">Annuler</button>
          </div>
        </div>
        <div id="multiWait" class="hidden center">
          <button class="btn btn-ghost btn-sm" id="btnCancelRoom">Fermer le salon</button>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="game">
      <div class="card">
        <div class="turnbar theirs" id="turnBar">…</div>
        <p class="lead center" id="foeLine" style="margin-bottom:2px;">Face à <b id="foeName">…</b></p>
        <p class="lead center hidden" id="scoreLine" style="margin-bottom:8px;font-size:13px;"></p>
        <div class="pr-board" id="prBoard"></div>
        <div class="pr-stats">
          <div class="pr-stat"><div class="v" id="statMoves">0</div><div class="k">Coups joués</div></div>
        </div>
        <div class="btn-row" style="justify-content:center;margin-top:18px">
          <button class="btn btn-ghost btn-sm hidden" id="btnCancelGame">Annuler le salon</button>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="end">
      <div class="card center">
        <div style="font-size:56px" id="endIcon">🏆</div>
        <h2 id="endTitle">Victoire !</h2>
        <p class="lead" id="endText"></p>
        <div class="status ok" id="saveMsg" hidden></div>
        <div class="btn-row" style="justify-content:center;margin-top:20px">
          <button class="btn btn-gold" id="btnAgain">Rejouer</button>
          <button class="btn btn-ghost" id="btnHome">Retour à l'accueil</button>
        </div>
      </div>
    </section>
  `;
}

/* ============================================================
   POINT D'ENTRÉE
   ============================================================ */
export async function mountPaires(container){
  root = container;
  root.classList.add("paires-screen");
  const activeProfile = getActiveProfile();
  if(!activeProfile){
    root.innerHTML = `<div class="card"><p class="setup-sub">Aucun profil actif.</p></div>`;
    return;
  }
  S.profile = { name: activeProfile.name, avatar: activeProfile.avatar, isGuest: !!activeProfile.isGuest };

  root.innerHTML = shellHtml();
  $("#btnBack").addEventListener("click", () => {
    leaveRoomChannel();
    if(backTo) show(backTo, backTo === "mode" ? null : "mode");
  });

  bindModeScreen();
  bindSizeScreen();
  bindLobbyDelegates();
  bindHostRoomButton();
  bindGameScreen();
  bindEndScreen();

  if(S.mode === "multi" && S.code){
    resumeRoom(S.code);
  }else{
    show("mode");
  }

  return () => {
    if(lobbyChannel && client){ client.removeChannel(lobbyChannel); lobbyChannel = null; }
    leaveRoomChannel();
    root = null;
  };
}

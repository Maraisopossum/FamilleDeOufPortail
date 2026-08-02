// Bataille Navale de la Tribu — porté depuis FamilleDeOufBatailleNavale/index.html.
// Logique de jeu fidèle à l'original ; l'écran de profils "maison" et l'écran
// d'historique dédié ont été retirés au profit du profil de session partagé
// (shared/profile.js) et de l'historique unifié (shared/history.js, #/historique).
import { supabase as client, SUPABASE_URL, SUPABASE_ANON_KEY, CONFIG_OK } from "../shared/supabase-client.js";
import { getActiveProfile } from "../shared/profile.js";

export const GAME_NAME = "Bataille Navale";

/* ============ CSS spécifique (scopé à .naval-screen) ============ */
if (!document.getElementById("naval-styles")) {
  const style = document.createElement("style");
  style.id = "naval-styles";
  style.textContent = `
  .naval-screen .screen{display:none;animation:naval-fade .28s ease;}
  .naval-screen .screen.on{display:block;}
  @keyframes naval-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .naval-screen .lead{color:var(--muted);font-size:15px;line-height:1.5;margin:6px 0 20px;}
  .naval-screen .status{border-radius:14px;padding:12px 15px;font-size:14px;line-height:1.45;margin:14px 0;}
  .naval-screen .status.ok{background:rgba(61,220,151,.13);border:1px solid var(--teal);color:#c9ffe6;}
  .naval-screen .status.err{background:rgba(255,93,115,.13);border:1px solid var(--coral);color:#ffd7dd;}
  .naval-screen .status.info{background:rgba(91,141,238,.13);border:1px solid var(--blue);color:#d7e3ff;}
  .naval-screen .status[hidden]{display:none;}
  .naval-screen .boards{display:flex;flex-direction:column;gap:18px;}
  .naval-screen .board-box{background:var(--panel-light);border-radius:20px;padding:14px;}
  .naval-screen .board-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
  .naval-screen .board-head .bt{font-family:'Baloo 2',cursive;font-weight:700;font-size:16px;}
  .naval-screen .board-head .bs{font-size:12px;color:var(--muted);margin-left:auto;}
  .naval-screen .grid-shell{position:relative;max-width:420px;margin:0 auto;}
  .naval-screen .grid-shell.small{max-width:290px;}
  .naval-screen .grid{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));grid-template-rows:repeat(11,minmax(0,1fr));gap:2px;aspect-ratio:1;position:relative;z-index:1;}
  .naval-screen .lbl{display:grid;place-items:center;font-size:clamp(8px,1.9vw,11px);color:var(--muted);font-weight:600;}
  .naval-screen .c{appearance:none;-webkit-appearance:none;border:0;padding:0;margin:0;border-radius:4px;cursor:default;background:rgba(91,141,238,.14);display:grid;place-items:center;font-size:clamp(9px,2.4vw,15px);line-height:1;transition:background .15s ease, transform .1s ease;}
  .naval-screen .grid.playable .c.free{cursor:crosshair;}
  .naval-screen .grid.playable .c.free:hover{background:rgba(255,200,87,.35);}
  .naval-screen .c.ship{background:var(--panel);box-shadow:inset 0 0 0 2px rgba(184,169,217,.55);}
  .naval-screen .c.miss{background:rgba(91,141,238,.28);}
  .naval-screen .c.hit{background:rgba(255,93,115,.55);}
  .naval-screen .c.sunk{background:var(--coral);}
  .naval-screen .c.pv-ok{background:rgba(61,220,151,.45);}
  .naval-screen .c.pv-no{background:rgba(255,93,115,.4);}
  .naval-screen .c.last{animation:naval-pop .45s ease;}
  @keyframes naval-pop{0%{transform:scale(.5);}60%{transform:scale(1.25);}100%{transform:scale(1);}}
  .naval-screen .grid-shell.sonar::after{content:'';position:absolute;inset:0;border-radius:14px;pointer-events:none;z-index:2;background:conic-gradient(from 0deg, rgba(61,220,151,.30), rgba(61,220,151,0) 42%);animation:naval-sweep 3.4s linear infinite;mix-blend-mode:screen;}
  @keyframes naval-sweep{to{transform:rotate(360deg);}}
  .naval-screen .fleet{display:flex;flex-direction:column;gap:8px;margin-top:4px;}
  .naval-screen .ship{display:flex;align-items:center;gap:10px;background:var(--panel-light);border:2px solid transparent;border-radius:14px;padding:10px 13px;cursor:pointer;color:var(--text);font:inherit;text-align:left;width:100%;}
  .naval-screen .ship.sel{border-color:var(--gold);}
  .naval-screen .ship.done{opacity:.45;cursor:default;}
  .naval-screen .ship.dead{opacity:.4;}
  .naval-screen .ship.dead .sn{text-decoration:line-through;}
  .naval-screen .ship .se{font-size:20px;flex:0 0 auto;}
  .naval-screen .ship .sn{font-family:'Baloo 2',cursive;font-weight:700;font-size:15px;flex:1 1 auto;}
  .naval-screen .ship .pips{display:flex;gap:3px;flex:0 0 auto;}
  .naval-screen .pip{width:10px;height:10px;border-radius:3px;background:var(--muted);opacity:.55;}
  .naval-screen .pip.on{background:var(--coral);opacity:1;}
  .naval-screen .turnbar{border-radius:16px;padding:13px 16px;margin-bottom:14px;font-family:'Baloo 2',cursive;font-weight:700;font-size:17px;text-align:center;}
  .naval-screen .turnbar.mine{background:rgba(61,220,151,.15);border:1px solid var(--teal);}
  .naval-screen .turnbar.theirs{background:rgba(184,169,217,.12);border:1px solid var(--muted);}
  .naval-screen .log{margin-top:14px;background:var(--panel-light);border-radius:14px;padding:12px 15px;font-size:13px;color:var(--muted);line-height:1.6;max-height:118px;overflow-y:auto;}
  .naval-screen .log b{color:var(--text);font-weight:600;}
  .naval-screen .stats{display:flex;flex-wrap:wrap;gap:18px;margin-top:16px;}
  .naval-screen .stat .v{font-family:'Kalam',cursive;font-weight:700;font-size:28px;color:var(--gold);line-height:1;}
  .naval-screen .stat .k{font-size:12px;color:var(--muted);margin-top:2px;}
  .naval-screen .code{font-family:'Kalam',cursive;font-weight:700;font-size:42px;letter-spacing:8px;color:var(--gold);text-align:center;margin:10px 0 4px;}
  .naval-screen .rooms{display:flex;flex-direction:column;gap:8px;}
  .naval-screen .room{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--panel-light);border:2px solid rgba(255,200,87,.4);border-radius:16px;padding:13px 15px;cursor:pointer;color:var(--text);font:inherit;transition:border-color .15s ease, transform .15s ease;}
  .naval-screen .room:hover{border-color:var(--gold);transform:translateY(-2px);}
  .naval-screen .room .rc{font-family:'Kalam',cursive;font-weight:700;font-size:22px;color:var(--gold);letter-spacing:2px;flex:0 0 auto;}
  .naval-screen .room .ri{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}
  .naval-screen .room .rh{font-family:'Baloo 2',cursive;font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .naval-screen .room .rt{font-size:12px;color:var(--muted);margin-top:2px;}
  .naval-screen .room .go{font-size:20px;flex:0 0 auto;}
  .naval-screen .center{text-align:center;}
  .naval-screen .hidden{display:none !important;}
  @media (max-width:560px){
    .naval-screen .card{padding:16px 6px;}
    .naval-screen .board-box{padding:4px;}
    .naval-screen .grid-shell.small{max-width:290px;}
  }
  @media (prefers-reduced-motion:reduce){ .naval-screen *{animation:none !important;transition:none !important;} }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   CONSTANTES
   ============================================================ */
const N = 10;
const COLS = "ABCDEFGHIJ";
const FLEET_DEF = [
  { id:"pa", name:"Porte-avions",      size:5, emoji:"🛳️" },
  { id:"cr", name:"Croiseur",          size:4, emoji:"🚢" },
  { id:"ct", name:"Contre-torpilleur", size:3, emoji:"⛴️" },
  { id:"sm", name:"Sous-marin",        size:3, emoji:"🤿" },
  { id:"to", name:"Torpilleur",        size:2, emoji:"🚤" }
];
const TOTAL_CELLS = FLEET_DEF.reduce((s,f)=>s+f.size,0); // 17

/* ============================================================
   UTILITAIRES
   ============================================================ */
const k  = (x,y) => x + "," + y;
const coord = (x,y) => COLS[x] + (y+1);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
  fire : () => { beep(880,.08,"square",.10); setTimeout(()=>beep(440,.12,"square",.08),70); },
  miss : () => beep(240,.18,"sine",.13),
  hit  : () => { beep(160,.22,"sawtooth",.16); setTimeout(()=>beep(110,.25,"sawtooth",.13),90); },
  sunk : () => [330,262,196,131].forEach((f,i)=>setTimeout(()=>beep(f,.22,"triangle",.16), i*130)),
  win  : () => [392,494,587,784].forEach((f,i)=>setTimeout(()=>beep(f,.22,"triangle",.17), i*140)),
  lose : () => [392,330,262,175].forEach((f,i)=>setTimeout(()=>beep(f,.28,"sine",.15), i*180)),
  tap  : () => beep(660,.05,"square",.07)
};

/* ---------- Supabase REST (identique à l'original : requêtes REST brutes) ---------- */
async function sb(path, opts){
  opts = opts || {};
  if(!CONFIG_OK) throw new Error("Clé Supabase absente");
  // Pas besoin d'un paramètre anti-cache maison : PostgREST traite tout
  // paramètre d'URL inconnu comme un filtre de colonne et rejette une
  // valeur sans opérateur (ex. v=12345) avec une erreur 400. `cache:
  // "no-store"` ci-dessous suffit déjà à empêcher la mise en cache HTTP.
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
const roomLoad  = (code) => sb("naval_rooms?code=eq." + encodeURIComponent(code) + "&select=*").then(r => (r && r[0]) || null);
const roomPatch = (code, body) => {
  // La table naval_rooms n'a pas de colonne updated_at (seulement
  // created_at) : lui envoyer ce champ fait échouer la requête (400).
  return sb("naval_rooms?code=eq." + encodeURIComponent(code), { method:"PATCH", body });
};

/* ============================================================
   ANNULATION D'UN SALON
   ============================================================ */
// Toujours passer par ici pour fermer/annuler son propre salon : si un
// adversaire a déjà rejoint, on ne supprime pas la ligne en direct (il ne
// recevrait alors aucune notification), on la marque "cancelled" pour que
// son écran (abonné aux mises à jour du salon) le détecte et l'affiche.
async function cancelRoom(){
  if(!S.code) return;
  const code = S.code;
  try{
    const r = await roomLoad(code);
    const opponentPresent = r && ((S.role === "host" && r.guest_name) || (S.role === "guest" && r.host_name && r.host_name !== S.profile.name));
    if(opponentPresent){
      await roomPatch(code, { status:"cancelled" });
    }else{
      await sb("naval_rooms?code=eq." + code, { method:"DELETE" });
    }
  }catch(e){ /* au pire le salon restera visible et sera purgé plus tard */ }
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
  profile : null,
  mode    : null,          // "solo" | "multi"
  diff    : 2,
  role    : null,          // "host" | "guest"
  code    : null,
  foe     : "Ordinateur",
  my      : null,
  foeBoard: null,          // solo uniquement
  ai      : null,
  myShots : {},
  foeShots: {},
  foeSunk : null,
  myTurn  : true,
  over    : false,
  ended   : false,
  busy    : false,
  fallback: null,          // filet de sécurité si Realtime est coupé
  foeShipsReveal: null     // flotte adverse à révéler sur l'écran de fin
};

/* ---------- plateau ---------- */
const newBoard = () => ({ ships: FLEET_DEF.map(f => ({ id:f.id, name:f.name, size:f.size, emoji:f.emoji, cells:[], hits:[] })) });
const cellsFor = (x,y,size,horiz) => Array.from({length:size}, (_,i) => horiz ? [x+i,y] : [x,y+i]);

function canPlace(board, x, y, size, horiz, skipId){
  const busy = new Set();
  board.ships.forEach(s => { if(s.id !== skipId) s.cells.forEach(c => busy.add(k(c[0],c[1]))); });
  return cellsFor(x,y,size,horiz).every(c =>
    c[0]>=0 && c[0]<N && c[1]>=0 && c[1]<N && !busy.has(k(c[0],c[1])));
}
function randomBoard(){
  const b = newBoard();
  b.ships.forEach(s => {
    let tries = 0;
    while(tries++ < 800){
      const horiz = Math.random() < .5;
      const x = Math.floor(Math.random()*N), y = Math.floor(Math.random()*N);
      if(canPlace(b, x, y, s.size, horiz, s.id)){ s.cells = cellsFor(x,y,s.size,horiz); break; }
    }
  });
  return b;
}
function resolve(board, x, y){
  for(const s of board.ships){
    if(s.cells.some(c => c[0]===x && c[1]===y)){
      if(!s.hits.some(c => c[0]===x && c[1]===y)) s.hits.push([x,y]);
      return { result: s.hits.length >= s.size ? "sunk" : "hit", ship: s.name };
    }
  }
  return { result:"miss", ship:null };
}
const aliveCount = (b) => b.ships.filter(s => s.hits.length < s.size).length;
const allSunk    = (b) => b.ships.every(s => s.hits.length >= s.size);

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
function bindModeScreen(){
  $$(".role-card[data-mode]").forEach(b => b.addEventListener("click", () => {
    SFX.tap();
    const m = b.dataset.mode;
    if(m === "solo"){ S.mode = "solo"; show("solo", "mode"); }
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
   ÉCRAN "NIVEAU SOLO"
   ============================================================ */
function bindSoloScreen(){
  $$(".role-card[data-diff]").forEach(b => b.addEventListener("click", () => {
    S.diff = parseInt(b.dataset.diff, 10);
    S.foe  = ["", "Le mousse", "Le second", "L'amiral"][S.diff];
    S.code = null; S.role = null;
    SFX.tap();
    startPlacement();
  }));
}

/* ============================================================
   ÉCRAN "SALON MULTI" (annuaire + reprise)
   ============================================================ */
function resetMultiPanels(){
  $("#multiChoice").classList.remove("hidden");
  $("#multiJoin").classList.add("hidden");
  $("#multiWait").classList.add("hidden");
  $("#multiErr").hidden = true;
}
function makeCode(){
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1
  return Array.from({length:4}, () => A.charAt(Math.floor(Math.random()*A.length))).join("");
}

// Salons visiblement abandonnés (personne ne reste 24h en "attente d'un
// adversaire") : on les efface silencieusement à chaque chargement de la
// liste, pour que les vieux salons de test ne s'accumulent pas pour toujours.
async function purgeStaleRooms(){
  if(!CONFIG_OK) return;
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  try{ await sb("naval_rooms?created_at=lt." + encodeURIComponent(cutoff), { method:"DELETE" }); }catch(e){ /* tant pis, on retentera plus tard */ }
}

let lobbyChannel = null;
async function refreshLobby(){
  if(!CONFIG_OK) return;
  const me = encodeURIComponent(S.profile.name);
  purgeStaleRooms();
  try{
    const open = await sb("naval_rooms?select=code,host_name,status,created_at" +
      "&status=eq.waiting&guest_name=is.null&order=created_at.desc&limit=12");
    const mine = await sb("naval_rooms?select=*" +
      "&or=(host_name.eq." + me + ",guest_name.eq." + me + ")" +
      "&status=in.(placing,playing)&order=created_at.desc&limit=5");
    renderLobby(open || [], mine || []);
  }catch(e){
    $("#openRooms").innerHTML = '<p class="muted">Liste des salons indisponible. Le code fonctionne toujours.</p>';
  }
}
function renderLobby(open, mine){
  const box = $("#resumeBox");
  if(mine.length){
    box.hidden = false;
    box.innerHTML = '<b>Tu as ' + (mine.length > 1 ? mine.length + ' duels en cours' : 'un duel en cours') + '.</b>' +
      '<div class="rooms" style="margin-top:10px">' + mine.map(r => {
        const iAmHost = r.host_name === S.profile.name;
        const foe = (iAmHost ? r.guest_name : r.host_name) || "adversaire à venir";
        const yours = r.turn === (iAmHost ? "host" : "guest");
        const state = r.status === "placing" ? "placement des flottes"
                    : yours ? "c'est à toi de tirer" : "au tour de l'adversaire";
        return '<button class="room" data-resume="' + escAttr(r.code) + '">' +
               '<span class="rc">' + escAttr(r.code) + '</span>' +
               '<span class="ri"><span class="rh">contre ' + escAttr(foe) + '</span>' +
               '<span class="rt">' + state + ' · ' + ago(r.created_at) + '</span></span>' +
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
    html += joinable.map(r =>
      '<button class="room" data-join="' + escAttr(r.code) + '">' +
      '<span class="rc">' + escAttr(r.code) + '</span>' +
      '<span class="ri"><span class="rh">' + escAttr(r.host_name) + ' attend un adversaire</span>' +
      '<span class="rt">ouvert ' + ago(r.created_at) + '</span></span>' +
      '<span class="go">▶</span></button>').join("");
  }
  if(own.length){
    html += own.map(r =>
      '<button class="room" data-join="' + escAttr(r.code) + '" style="border-color:rgba(184,169,217,.3)">' +
      '<span class="rc">' + escAttr(r.code) + '</span>' +
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
      // Salons "en attente" abandonnés : personne n'y reste des heures sans
      // que quelqu'un d'autre les rejoigne. On les efface tous d'un coup,
      // sauf le mien s'il en existe un (au cas où j'attends encore quelqu'un).
      await sb("naval_rooms?status=eq.waiting&host_name=neq." + encodeURIComponent(S.profile.name), { method:"DELETE" });
    }catch(e){ /* pas grave, on réessaiera au prochain chargement */ }
    btn.disabled = false; btn.textContent = "🧹 Vider les salons inactifs";
    refreshLobby();
  });
}
function startLobbyWatch(){
  if(!client || lobbyChannel) return;
  lobbyChannel = client
    .channel("naval-lobby")
    .on("postgres_changes", { event:"*", schema:"public", table:"naval_rooms" }, () => {
      const multiScreen = $('[data-screen=multi]');
      if(multiScreen && multiScreen.classList.contains("on")) refreshLobby();
    })
    .subscribe();
}

function bindHostRoomButton(){
  $("#btnHost").addEventListener("click", async () => {
    if(!CONFIG_OK) return;
    // Si ce profil a déjà un salon ouvert (précédemment créé puis quitté sans
    // le fermer), on le reprend au lieu d'en ouvrir un doublon.
    try{
      const mine = await sb("naval_rooms?select=code&host_name=eq." + encodeURIComponent(S.profile.name) +
        "&status=in.(waiting,placing,playing)&order=created_at.desc&limit=1");
      if(mine && mine[0]){ return resumeRoom(mine[0].code); }
    }catch(e){ /* pas grave, on retombe sur la création d'un nouveau salon */ }
    const code = makeCode();
    try{
      await sb("naval_rooms", { method:"POST", body:{
        code, host_name:S.profile.name, status:"waiting", turn:"host", shots:[]
      }});
    }catch(e){
      $("#multiErr").hidden = false;
      $("#multiErr").textContent = "Le salon n'a pas pu être ouvert. Vérifie la table naval_rooms.";
      return;
    }
    S.role = "host"; S.code = code; S.foe = "adversaire";
    joinRoomChannel(code);
    startPlacement();
  });
  $("#btnJoinPick").addEventListener("click", () => {
    $("#multiChoice").classList.add("hidden");
    $("#multiJoin").classList.remove("hidden");
    $("#joinCode").focus();
  });
  $("#btnJoinCancel").addEventListener("click", resetMultiPanels);
  $("#btnJoinGo").addEventListener("click", () => joinRoom($("#joinCode").value.trim().toUpperCase()));
  $("#btnCancelRoom").addEventListener("click", cancelRoom);
  $("#btnCancelPlacement").addEventListener("click", () => {
    if(confirm("Annuler ce salon ? " + (S.role === "guest" ? "" : "Si un adversaire l'a déjà rejoint, la partie s'arrêtera aussi pour lui.")))
      cancelRoom();
  });
}

async function joinRoom(code){
  if(!code || code.length !== 4) return;
  try{
    const r = await roomLoad(code);
    if(!r) throw new Error("introuvable");
    if(r.host_name === S.profile.name) return resumeRoom(code);
    if(r.guest_name && r.guest_name !== S.profile.name) throw new Error("plein");
    if(r.guest_name === S.profile.name) return resumeRoom(code);
    await roomPatch(code, { guest_name:S.profile.name, status:"placing" });
    S.role = "guest"; S.code = code; S.foe = r.host_name;
    joinRoomChannel(code);
    startPlacement();
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
  S.foe  = (S.role === "host" ? r.guest_name : r.host_name) || "adversaire";
  joinRoomChannel(code);

  const myShips = S.role === "host" ? r.host_ships : r.guest_ships;
  if(!myShips){ startPlacement(); return; }

  S.my = { ships: myShips };
  S.myShots = {}; S.foeShots = {}; S.foeSunk = new Set();
  (r.shots || []).forEach(s => {
    if(s.r == null) return;
    if(s.by === S.role){ S.myShots[k(s.x,s.y)] = s.r; if(s.r === "sunk" && s.s) S.foeSunk.add(s.s); }
    else S.foeShots[k(s.x,s.y)] = s.r;
  });
  if(r.status === "playing"){
    S.myTurn = r.turn === S.role;
    buildGrid($("#targetGrid")); buildGrid($("#myGrid"));
    S.over = false; S.ended = false;
    $("#foeName").textContent = S.foe;
    $("#log").innerHTML = "";
    logLine("Duel repris là où tu l'avais laissé.");
    paintBattle();
    show("battle");
    $("#btnBack").classList.add("hidden");
    startFallback();
  }else{
    $("#waitOpponent").classList.remove("hidden");
    $("#btnReady").disabled = true;
    $("#btnReady").textContent = "Flotte enregistrée";
    buildGrid($("#placeGrid"));
    paintPlacement();
    show("place", "mode");
  }
}

/* ============================================================
   REALTIME : un canal par salon (+ filet de sécurité)
   ============================================================ */
let roomChannel = null;
function joinRoomChannel(code){
  leaveRoomChannel();
  if(!client) return;
  roomChannel = client
    .channel("naval-room-" + code)
    .on("postgres_changes",
        { event:"UPDATE", schema:"public", table:"naval_rooms", filter:"code=eq." + code },
        (payload) => onRoomUpdate(payload.new))
    .subscribe();
}
function leaveRoomChannel(){
  if(roomChannel && client){ client.removeChannel(roomChannel); roomChannel = null; }
  stopFallback();
}
function startFallback(){
  stopFallback();
  S.fallback = setInterval(async () => {
    if(S.busy || S.over || !S.code) return;
    try{ const r = await roomLoad(S.code); if(r) onRoomUpdate(r); }catch(e){}
  }, 4000);
}
function stopFallback(){ if(S.fallback){ clearInterval(S.fallback); S.fallback = null; } }

/* ============================================================
   ÉCRAN "PLACEMENT"
   ============================================================ */
let selShip = null, horiz = true;

function startPlacement(){
  S.my = newBoard();
  S.myShots = {}; S.foeShots = {}; S.foeSunk = new Set();
  S.over = false; S.ended = false; S.foeShipsReveal = null;
  selShip = FLEET_DEF[0].id;
  horiz = true;
  $("#waitOpponent").classList.add("hidden");
  $("#btnReady").disabled = false;
  $("#btnReady").textContent = "Flotte prête";
  $("#btnCancelPlacement").classList.toggle("hidden", S.mode !== "multi");
  $("#placeHint").textContent = S.mode === "multi" && S.role === "host"
    ? "Ton salon est déjà visible par la famille. Place ta flotte pendant qu'un adversaire arrive."
    : "Choisis un navire, puis touche la case de départ. Les navires peuvent se toucher, jamais se chevaucher.";
  buildGrid($("#placeGrid"));
  paintPlacement();
  show("place", S.mode === "solo" ? "solo" : "mode");
  // Le temps réel Supabase n'est pas fiable à 100 % : ce sondage de secours
  // permet de détecter une annulation ou l'arrivée de l'adversaire même si
  // les évènements temps réel ne passent pas.
  if(S.mode === "multi") startFallback();
}

function buildGrid(el){
  let html = '<div class="lbl"></div>';
  for(let x=0;x<N;x++) html += '<div class="lbl">' + COLS[x] + '</div>';
  for(let y=0;y<N;y++){
    html += '<div class="lbl">' + (y+1) + '</div>';
    for(let x=0;x<N;x++) html += '<button class="c" data-x="' + x + '" data-y="' + y + '" aria-label="' + coord(x,y) + '"></button>';
  }
  el.innerHTML = html;
}

function paintPlacement(){
  const occ = new Map();
  S.my.ships.forEach(s => s.cells.forEach(c => occ.set(k(c[0],c[1]), s.emoji)));
  $$("#placeGrid .c").forEach(c => {
    const emoji = occ.get(k(+c.dataset.x, +c.dataset.y));
    c.className = "c" + (emoji ? " ship" : " free");
    c.textContent = emoji || "";
  });
  const placed = S.my.ships.filter(s => s.cells.length).length;
  $("#placeLeft").textContent = placed === 5 ? "Flotte complète" : (5 - placed) + " navire(s) à poser";
  $("#btnReady").disabled = placed !== 5 || $("#btnReady").textContent === "Flotte enregistrée";
  $("#btnRotate").textContent = horiz ? "↻ Sens : horizontal" : "↻ Sens : vertical";
  $("#placeFleet").innerHTML = S.my.ships.map(s =>
    '<button class="ship' + (s.id === selShip ? " sel" : "") + (s.cells.length ? " done" : "") + '" data-ship="' + s.id + '">' +
    '<span class="se">' + s.emoji + '</span>' +
    '<span class="sn">' + escAttr(s.name) + '</span>' +
    '<span class="pips">' + Array(s.size).fill('<span class="pip"></span>').join("") + '</span></button>').join("");
}

function bindPlacementScreen(){
  $("#placeFleet").addEventListener("click", (e) => {
    const b = e.target.closest(".ship");
    if(!b) return;
    selShip = b.dataset.ship;
    const s = S.my.ships.find(v => v.id === selShip);
    if(s.cells.length) s.cells = [];
    SFX.tap();
    paintPlacement();
  });
  $("#btnRotate").addEventListener("click", () => { horiz = !horiz; SFX.tap(); paintPlacement(); });
  $("#btnRandom").addEventListener("click", () => { S.my = randomBoard(); SFX.tap(); paintPlacement(); });
  $("#btnReset").addEventListener("click", () => { S.my.ships.forEach(s => s.cells = []); selShip = FLEET_DEF[0].id; paintPlacement(); });
  $("#placeGrid").addEventListener("click", (e) => {
    const c = e.target.closest(".c");
    if(!c) return;
    const s = S.my.ships.find(v => v.id === selShip);
    if(!s || s.cells.length) return;
    const x = +c.dataset.x, y = +c.dataset.y;
    if(!canPlace(S.my, x, y, s.size, horiz, s.id)){ SFX.miss(); return; }
    s.cells = cellsFor(x, y, s.size, horiz);
    SFX.tap();
    const next = S.my.ships.find(v => !v.cells.length);
    selShip = next ? next.id : selShip;
    paintPlacement();
  });
  $("#placeGrid").addEventListener("mouseover", (e) => {
    const c = e.target.closest(".c");
    if(!c) return;
    const s = S.my.ships.find(v => v.id === selShip);
    if(!s || s.cells.length) return;
    const x = +c.dataset.x, y = +c.dataset.y;
    const ok = canPlace(S.my, x, y, s.size, horiz, s.id);
    cellsFor(x, y, s.size, horiz).forEach(p => {
      const el = $('#placeGrid .c[data-x="' + p[0] + '"][data-y="' + p[1] + '"]');
      if(el) el.classList.add(ok ? "pv-ok" : "pv-no");
    });
  });
  $("#placeGrid").addEventListener("mouseout", () => {
    $$("#placeGrid .c").forEach(c => c.classList.remove("pv-ok","pv-no"));
  });
  $("#btnReady").addEventListener("click", async () => {
    if(S.mode === "solo"){
      S.foeBoard = randomBoard();
      S.ai = { queue: [], tried: new Set() };
      startBattle();
      return;
    }
    $("#btnReady").disabled = true;
    $("#btnReady").textContent = "Flotte enregistrée";
    $("#waitOpponent").classList.remove("hidden");

    const field = S.role === "host" ? "host_ships" : "guest_ships";
    const body = {}; body[field] = S.my.ships;
    await roomPatch(S.code, body);

    const r = await roomLoad(S.code);
    if(r && r.host_ships && r.guest_ships && r.status !== "playing"){
      await roomPatch(S.code, { status:"playing", turn:"host" });
      onRoomUpdate(Object.assign({}, r, { status:"playing", turn:"host" }));
    }else{
      startFallback();
    }
  });
}

/* ============================================================
   SYNCHRO — une seule fonction reçoit toute mise à jour du salon
   ============================================================ */
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

  if(S.role === "host" && r.guest_name && S.foe !== r.guest_name){
    S.foe = r.guest_name;
    $("#foeName").textContent = S.foe;
  }

  const battleScreen = $('[data-screen=battle]');
  if(r.status === "playing" && (!battleScreen || !battleScreen.classList.contains("on")) && !S.ended){
    S.my = { ships: (S.role === "host" ? r.host_ships : r.guest_ships) || S.my.ships };
    S.myTurn = r.turn === S.role;
    startBattle();
    return;
  }
  if(!battleScreen || !battleScreen.classList.contains("on")) return;

  (r.shots || []).forEach(s => {
    if(s.r == null) return;
    const key = k(s.x, s.y);
    if(s.by === S.role){
      if(S.myShots[key]) return;
      S.myShots[key] = s.r;
      if(s.r === "sunk" && s.s) S.foeSunk.add(s.s);
    }else{
      if(S.foeShots[key]) return;
      S.foeShots[key] = s.r;
      resolve(S.my, s.x, s.y);
      if(s.r === "miss"){ SFX.miss(); logLine(escAttr(S.foe) + " tire en <b>" + coord(s.x,s.y) + "</b> — à l'eau."); }
      else if(s.r === "hit"){ SFX.hit(); logLine(escAttr(S.foe) + " tire en <b>" + coord(s.x,s.y) + "</b> — <b>touché.</b>"); }
      else { SFX.sunk(); logLine(escAttr(S.foe) + " tire en <b>" + coord(s.x,s.y) + "</b> — <b>coulé.</b> Ton " + escAttr(s.s) + " sombre."); }
    }
  });

  S.myTurn = r.turn === S.role;
  paintBattle();

  if(r.status === "finished" && !S.ended){
    S.over = true;
    S.foeShipsReveal = (S.role === "host" ? r.guest_ships : r.host_ships) || null;
    finish(r.winner === S.profile.name);
  }
}

/* ============================================================
   ÉCRAN "COMBAT"
   ============================================================ */
function startBattle(){
  buildGrid($("#targetGrid"));
  buildGrid($("#myGrid"));
  if(S.mode === "solo") S.myTurn = true;
  S.over = false; S.ended = false;
  $("#foeName").textContent = S.foe;
  $("#log").innerHTML = "";
  logLine("Le duel commence. " + (S.myTurn ? "À toi l'honneur." : "L'adversaire ouvre le feu."));
  paintBattle();
  show("battle");
  $("#btnBack").classList.add("hidden");
  if(S.mode === "multi") startFallback();
  else if(!S.myTurn) setTimeout(aiTurn, 900);
}

function paintBattle(){
  $$("#targetGrid .c").forEach(c => {
    const r = S.myShots[k(+c.dataset.x, +c.dataset.y)];
    c.className = "c" + (r ? " " + r : " free");
    c.textContent = r === "miss" ? "•" : (r ? "✕" : "");
  });
  const mine = new Map();
  S.my.ships.forEach(s => s.cells.forEach(c => mine.set(k(c[0],c[1]), s.emoji)));
  $$("#myGrid .c").forEach(c => {
    const key = k(+c.dataset.x, +c.dataset.y);
    const r = S.foeShots[key];
    const emoji = mine.get(key);
    c.className = "c" + (emoji ? " ship" : "") + (r ? " " + r : "");
    c.textContent = r === "miss" ? "•" : (r ? "✕" : (emoji || ""));
  });

  const foeAlive = (S.mode === "solo") ? aliveCount(S.foeBoard) : 5 - (S.foeSunk ? S.foeSunk.size : 0);
  $("#foeLeft").textContent = foeAlive + " navire(s) debout";
  $("#myLeft").textContent  = aliveCount(S.my) + " navire(s) debout";
  $("#myFleet").innerHTML = S.my.ships.map(s => {
    const pips = Array.from({length:s.size}, (_,i) =>
      '<span class="pip' + (i < s.hits.length ? " on" : "") + '"></span>').join("");
    return '<div class="ship' + (s.hits.length >= s.size ? " dead" : "") + '">' +
           '<span class="se">' + s.emoji + '</span>' +
           '<span class="sn">' + escAttr(s.name) + '</span>' +
           '<span class="pips">' + pips + '</span></div>';
  }).join("");

  const tb = $("#turnbar");
  tb.className = "turnbar " + (S.myTurn ? "mine" : "theirs");
  tb.textContent = S.over ? "Partie terminée" : S.myTurn ? "À toi de tirer" : "L'adversaire vise…";
  $("#targetShell").classList.toggle("sonar", S.myTurn && !S.over);
  $("#targetGrid").classList.toggle("playable", S.myTurn && !S.over);
}

function logLine(html){ $("#log").insertAdjacentHTML("afterbegin", "<div>" + html + "</div>"); }

function applyMyShot(x, y, r){
  S.myShots[k(x,y)] = r.result;
  if(r.result === "miss"){ SFX.miss(); logLine("Tu tires en <b>" + coord(x,y) + "</b> — à l'eau."); }
  else if(r.result === "hit"){ SFX.hit(); logLine("Tu tires en <b>" + coord(x,y) + "</b> — <b>touché !</b> Tu rejoues."); }
  else {
    SFX.sunk();
    if(r.ship) S.foeSunk.add(r.ship);
    logLine("Tu tires en <b>" + coord(x,y) + "</b> — <b>coulé !</b> " + escAttr(r.ship) + " par le fond.");
  }
}

function bindBattleScreen(){
  $("#targetGrid").addEventListener("click", async (e) => {
    const c = e.target.closest(".c");
    if(!c || !S.myTurn || S.over || S.busy) return;
    const x = +c.dataset.x, y = +c.dataset.y;
    if(S.myShots[k(x,y)]) return;
    SFX.fire();

    if(S.mode === "solo"){
      const r = resolve(S.foeBoard, x, y);
      applyMyShot(x, y, r);
      if(allSunk(S.foeBoard)){ S.foeShipsReveal = S.foeBoard.ships; return finish(true); }
      if(r.result === "miss"){ S.myTurn = false; paintBattle(); setTimeout(aiTurn, 900); }
      else paintBattle();
      return;
    }

    S.busy = true;
    S.myTurn = false;
    paintBattle();
    try{
      const room = await roomLoad(S.code);
      const foeField = S.role === "host" ? "guest_ships" : "host_ships";
      const foeBoard = { ships: room[foeField] || [] };
      const r = resolve(foeBoard, x, y);
      applyMyShot(x, y, r);

      const shots = (room.shots || []).slice();
      shots.push({ by:S.role, x, y, r:r.result, s:r.ship });
      const won = allSunk(foeBoard);
      const patch = {};
      patch[foeField] = foeBoard.ships;
      patch.shots = shots;
      patch.turn  = r.result === "miss" ? (S.role === "host" ? "guest" : "host") : S.role;
      if(won){ patch.status = "finished"; patch.winner = S.profile.name; }
      await roomPatch(S.code, patch);
      S.myTurn = !won && patch.turn === S.role;
      paintBattle();
      if(won){ S.over = true; S.foeShipsReveal = foeBoard.ships; finish(true); }
    }catch(err){
      logLine("<b>Tir non transmis</b> — vérifie la connexion, puis retente.");
      S.myTurn = true;
      delete S.myShots[k(x,y)];
      paintBattle();
    }
    S.busy = false;
  });
  $("#btnAbandon").addEventListener("click", async () => {
    if(!confirm("Abandonner la partie en cours ?")) return;
    if(S.mode === "multi" && S.code){
      try{
        const room = await roomLoad(S.code);
        S.foeShipsReveal = (room && (S.role === "host" ? room.guest_ships : room.host_ships)) || null;
        await roomPatch(S.code, { status:"finished", winner:S.foe });
      }catch(e){}
    }else if(S.mode === "solo"){
      S.foeShipsReveal = S.foeBoard.ships;
    }
    S.over = true;
    finish(false, true);
  });
}

/* ============================================================
   IA SOLO — 100 % locale, aucune requête réseau
   ============================================================ */
function aiPick(){
  const tried = S.ai.tried;
  while(S.ai.queue.length){
    const p = S.ai.queue.shift();
    if(!tried.has(k(p[0],p[1]))) return p;
  }
  const free = [];
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    if(tried.has(k(x,y))) continue;
    if(S.diff === 3 && (x + y) % 2 !== 0) continue;
    free.push([x,y]);
  }
  if(!free.length) for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(!tried.has(k(x,y))) free.push([x,y]);
  return free[Math.floor(Math.random()*free.length)];
}
async function aiTurn(){
  if(S.over) return;
  let again = true;
  while(again && !S.over){
    const p = aiPick();
    if(!p) return;
    const x = p[0], y = p[1];
    S.ai.tried.add(k(x,y));
    SFX.fire();
    const r = resolve(S.my, x, y);
    S.foeShots[k(x,y)] = r.result;

    if(r.result === "miss"){ SFX.miss(); logLine(escAttr(S.foe) + " tire en <b>" + coord(x,y) + "</b> — à l'eau."); }
    else if(r.result === "hit"){
      SFX.hit();
      logLine(escAttr(S.foe) + " tire en <b>" + coord(x,y) + "</b> — <b>touché.</b>");
      if(S.diff >= 2) [[1,0],[-1,0],[0,1],[0,-1]].forEach(d => {
        const nx = x+d[0], ny = y+d[1];
        if(nx>=0 && nx<N && ny>=0 && ny<N && !S.ai.tried.has(k(nx,ny))) S.ai.queue.push([nx,ny]);
      });
    }else{
      SFX.sunk();
      logLine(escAttr(S.foe) + " tire en <b>" + coord(x,y) + "</b> — <b>coulé.</b> Ton " + escAttr(r.ship) + " sombre.");
      S.ai.queue = [];
    }
    paintBattle();
    if(allSunk(S.my)){ S.foeShipsReveal = S.foeBoard.ships; return finish(false); }
    again = (r.result !== "miss");
    if(again) await sleep(750);
  }
  S.myTurn = true;
  paintBattle();
}

/* ============================================================
   ÉCRAN "FIN DE PARTIE"
   ============================================================ */
async function finish(won, abandoned){
  if(S.ended) return;
  S.ended = true;
  S.over = true;
  leaveRoomChannel();
  paintBattle();
  await sleep(450);

  const shots = Object.keys(S.myShots).length;
  const hits  = Object.values(S.myShots).filter(v => v !== "miss").length;
  const acc   = shots ? Math.round(hits / shots * 100) : 0;
  const score = won ? Math.max(120, 1000 - Math.max(0, shots - TOTAL_CELLS) * 12) : hits * 25;

  $("#endIcon").textContent  = won ? "🏆" : (abandoned ? "🏳️" : "💀");
  $("#endTitle").textContent = won ? "Flotte adverse coulée !" : (abandoned ? "Partie abandonnée" : "Ta flotte a sombré");
  $("#endText").textContent  = won
    ? "Bien joué capitaine " + S.profile.name + ". " + S.foe + " n'a plus un seul navire à flot."
    : (abandoned ? "Pas de honte, la mer était mauvaise." : S.foe + " a eu le dernier mot. Revanche ?");
  $("#stScore").textContent = score;
  $("#stShots").textContent = shots;
  $("#stAcc").textContent   = acc + " %";
  won ? SFX.win() : SFX.lose();
  show("end");
  paintFoeReveal();

  const msg = $("#saveMsg");
  if(CONFIG_OK && !S.profile.isGuest){
    try{
      await sb("game_history", { method:"POST", prefer:"return=minimal", body:{
        profile_name   : S.profile.name,
        game           : GAME_NAME,
        mode           : S.mode,
        score          : score,
        rank           : won ? 1 : 2,
        total_players  : 2,
        total_questions: shots,
        room_code      : S.code
      }});
      msg.hidden = false; msg.className = "status ok";
      msg.textContent = "Score enregistré dans l'historique commun des jeux de la tribu.";
    }catch(e){
      msg.hidden = false; msg.className = "status err";
      msg.textContent = "Le score n'a pas pu être enregistré. La partie compte quand même.";
    }
  } else if(S.profile.isGuest){
    msg.hidden = false; msg.className = "status info";
    msg.textContent = "Partie jouée en invité : le score n'est pas enregistré dans l'historique.";
  }
}
function paintFoeReveal(){
  const box = $("#foeRevealBox");
  const ships = S.foeShipsReveal;
  if(!box) return;
  if(!ships || !ships.length){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  $("#foeRevealName").textContent = S.foe || "l'adversaire";
  const grid = $("#foeRevealGrid");
  buildGrid(grid);
  const cells = new Map();
  ships.forEach(s => (s.cells || []).forEach(c => cells.set(k(c[0],c[1]), s.emoji)));
  $$("#foeRevealGrid .c").forEach(c => {
    const emoji = cells.get(k(+c.dataset.x, +c.dataset.y));
    c.className = "c" + (emoji ? " ship" : "");
    c.textContent = emoji || "";
  });
}
function bindEndScreen(){
  $("#btnAgain").addEventListener("click", () => {
    $("#saveMsg").hidden = true;
    S.code = null; S.role = null;
    if(S.mode === "solo") startPlacement();
    else { resetMultiPanels(); show("multi", "mode"); refreshLobby(); }
  });
  $("#btnHome").addEventListener("click", () => {
    $("#saveMsg").hidden = true;
    S.code = null; S.role = null;
    show("mode");
  });
}

/* ============================================================
   MARKUP (toutes les sections en un seul fragment, comme l'original)
   ============================================================ */
function shellHtml(){
  return `
    <button class="btn btn-ghost btn-sm hidden" id="btnBack" style="margin-bottom:14px;">‹ Retour</button>

    <section class="screen on" data-screen="mode">
      <div class="card" style="text-align:center;padding:18px;">
        <img src="./naval-logo.png" alt="Bataille Navale de la Tribu" style="width:100%;max-width:420px;border-radius:20px;">
      </div>
      <div class="card">
        <h2>Quelle bataille ?</h2>
        <p class="lead">Flotte de 17 cases à couler. Touché, on rejoue.</p>
        <div class="role-grid role-grid-3">
          <div class="role-card" data-mode="solo">
            <div class="emoji">🤖</div><h3>Contre l'ordinateur</h3>
            <p>Une partie tout de suite, hors ligne. Trois niveaux, du mousse à l'amiral.</p>
          </div>
          <div class="role-card" data-mode="multi">
            <div class="emoji">📡</div><h3>Duel en famille</h3>
            <p>Deux appareils. Rejoins un salon ouvert d'un tap, ou entre un code.</p>
          </div>
          <div class="role-card" data-mode="histo">
            <div class="emoji">📜</div><h3>Historique</h3>
            <p>Le palmarès de la tribu et les dernières batailles jouées.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="solo">
      <div class="card">
        <h2>Ton adversaire</h2>
        <p class="lead">Plus le niveau monte, plus il vise juste après un premier tir touché.</p>
        <div class="role-grid role-grid-3">
          <div class="role-card" data-diff="1"><div class="emoji">🧢</div><h3>Mousse</h3><p>Tire complètement au hasard. Parfait pour les petits.</p></div>
          <div class="role-card" data-diff="2"><div class="emoji">🎖️</div><h3>Second</h3><p>Achève un navire touché en explorant les cases voisines.</p></div>
          <div class="role-card" data-diff="3"><div class="emoji">⚓</div><h3>Amiral</h3><p>Quadrille en damier et suit l'axe d'un navire touché. Redoutable.</p></div>
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
            <div class="role-card" id="btnHost"><div class="emoji">🏳️</div><h3>Ouvrir un salon</h3><p>Ton salon apparaît aussitôt dans la liste des autres, avec un code de secours.</p></div>
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
          <p class="lead">Transmets ce code à ton adversaire :</p>
          <div class="code" id="roomCode">····</div>
          <p class="muted" id="waitMsg">En attente d'un adversaire…</p>
          <div class="btn-row" style="justify-content:center;margin-top:16px">
            <button class="btn btn-ghost btn-sm" id="btnCancelRoom">Fermer le salon</button>
          </div>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="place">
      <div class="card">
        <h2>Place ta flotte</h2>
        <p class="lead" id="placeHint">Choisis un navire, puis touche la case de départ. Les navires peuvent se toucher, jamais se chevaucher.</p>
        <div class="boards">
          <div class="board-box">
            <div class="board-head">
              <span class="bt">Ta zone</span>
              <span class="bs" id="placeLeft">5 navires à poser</span>
            </div>
            <div class="grid-shell"><div class="grid playable" id="placeGrid"></div></div>
          </div>
          <div>
            <div class="btn-row" style="margin-bottom:12px">
              <button class="btn btn-ghost btn-sm" id="btnRotate">↻ Sens : horizontal</button>
              <button class="btn btn-ghost btn-sm" id="btnRandom">🎲 Au hasard</button>
              <button class="btn btn-ghost btn-sm" id="btnReset">Tout enlever</button>
            </div>
            <div class="fleet" id="placeFleet"></div>
            <div class="btn-row" style="margin-top:16px">
              <button class="btn btn-gold" id="btnReady" disabled>Flotte prête</button>
              <button class="btn btn-ghost btn-sm hidden" id="btnCancelPlacement">Annuler le salon</button>
            </div>
            <p class="muted hidden" id="waitOpponent" style="margin-top:12px">Flotte enregistrée. On attend que l'adversaire finisse de placer la sienne…</p>
          </div>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="battle">
      <div class="card">
        <div class="turnbar mine" id="turnbar">À toi de tirer</div>
        <div class="boards">
          <div class="board-box">
            <div class="board-head">
              <span class="bt">Flotte adverse — <span id="foeName">Adversaire</span></span>
              <span class="bs" id="foeLeft">5 navires debout</span>
            </div>
            <div class="grid-shell" id="targetShell"><div class="grid playable" id="targetGrid"></div></div>
          </div>
          <div class="board-box">
            <div class="board-head">
              <span class="bt">Ta flotte</span>
              <span class="bs" id="myLeft">5 navires debout</span>
            </div>
            <div class="grid-shell small"><div class="grid" id="myGrid"></div></div>
            <div class="fleet" id="myFleet" style="margin-top:12px"></div>
          </div>
        </div>
        <div class="log" id="log"></div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-ghost btn-sm" id="btnAbandon">Abandonner la partie</button>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="end">
      <div class="card center">
        <div style="font-size:56px" id="endIcon">🏆</div>
        <h2 id="endTitle">Victoire !</h2>
        <p class="lead" id="endText"></p>
        <div class="stats" style="justify-content:center">
          <div class="stat"><div class="v" id="stScore">0</div><div class="k">Score</div></div>
          <div class="stat"><div class="v" id="stShots">0</div><div class="k">Tirs</div></div>
          <div class="stat"><div class="v" id="stAcc">0 %</div><div class="k">Précision</div></div>
        </div>
        <div class="status ok" id="saveMsg" hidden></div>
        <div id="foeRevealBox" class="hidden" style="margin-top:22px;">
          <h3 style="margin:0 0 10px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">La flotte de <span id="foeRevealName">l'adversaire</span></h3>
          <div class="grid-shell small" style="margin:0 auto;"><div class="grid" id="foeRevealGrid"></div></div>
        </div>
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
export async function mountNaval(container){
  root = container;
  root.classList.add("naval-screen");
  const activeProfile = getActiveProfile();
  if(!activeProfile){
    root.innerHTML = `<div class="card"><p class="setup-sub">Aucun profil actif.</p></div>`;
    return;
  }
  S.profile = { name: activeProfile.name, avatar: activeProfile.avatar, isGuest: !!activeProfile.isGuest };

  root.innerHTML = shellHtml();
  $("#btnBack").addEventListener("click", () => {
    leaveRoomChannel();
    stopFallback();
    if(backTo) show(backTo, backTo === "mode" ? null : "mode");
  });

  bindModeScreen();
  bindSoloScreen();
  bindLobbyDelegates();
  bindHostRoomButton();
  bindPlacementScreen();
  bindBattleScreen();
  bindEndScreen();

  // Si un duel était déjà en cours (l'utilisateur a juste changé d'écran et
  // revient), on le reprend au lieu de repartir du menu principal.
  if(S.mode === "multi" && S.code){
    resumeRoom(S.code);
  }else{
    show("mode");
  }

  return () => {
    // Nettoyage à la navigation hors de la bataille navale.
    if(lobbyChannel && client){ client.removeChannel(lobbyChannel); lobbyChannel = null; }
    leaveRoomChannel();
    stopFallback();
    root = null;
  };
}

// Puissance 4 de la Tribu — nouveau jeu, sur le même modèle que naval.js
// (solo vs IA à plusieurs niveaux, duel en salon avec code, historique
// partagé). Contrairement à la bataille navale, ce jeu n'a aucune
// information cachée : le plateau entier peut être stocké et partagé tel
// quel côté serveur, ce qui simplifie beaucoup la synchronisation.
import { supabase as client, SUPABASE_URL, SUPABASE_ANON_KEY, CONFIG_OK } from "../shared/supabase-client.js";
import { getActiveProfile } from "../shared/profile.js";

export const GAME_NAME = "Puissance 4 de la Tribu";

const COLS = 7, ROWS = 6;

/* ============ CSS spécifique (scopé à .connect4-screen) ============ */
if (!document.getElementById("connect4-styles")) {
  const style = document.createElement("style");
  style.id = "connect4-styles";
  style.textContent = `
  .connect4-screen .screen{display:none;animation:c4-fade .28s ease;}
  .connect4-screen .screen.on{display:block;}
  @keyframes c4-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .connect4-screen .lead{color:var(--muted);font-size:15px;line-height:1.5;margin:6px 0 20px;}
  .connect4-screen .status{border-radius:14px;padding:12px 15px;font-size:14px;line-height:1.45;margin:14px 0;}
  .connect4-screen .status.ok{background:rgba(61,220,151,.13);border:1px solid var(--teal);color:#c9ffe6;}
  .connect4-screen .status.err{background:rgba(255,93,115,.13);border:1px solid var(--coral);color:#ffd7dd;}
  .connect4-screen .status.info{background:rgba(91,141,238,.13);border:1px solid var(--blue);color:#d7e3ff;}
  .connect4-screen .status[hidden]{display:none;}
  .connect4-screen .hidden{display:none !important;}
  .connect4-screen .center{text-align:center;}
  .connect4-screen .code{font-family:'Kalam',cursive;font-weight:700;font-size:42px;letter-spacing:8px;color:var(--gold);text-align:center;margin:10px 0 4px;}
  .connect4-screen .rooms{display:flex;flex-direction:column;gap:8px;}
  .connect4-screen .room{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--panel-light);border:2px solid rgba(255,200,87,.4);border-radius:16px;padding:13px 15px;cursor:pointer;color:var(--text);font:inherit;transition:border-color .15s ease, transform .15s ease;}
  .connect4-screen .room:hover{border-color:var(--gold);transform:translateY(-2px);}
  .connect4-screen .room .rc{font-family:'Kalam',cursive;font-weight:700;font-size:22px;color:var(--gold);letter-spacing:2px;flex:0 0 auto;}
  .connect4-screen .room .ri{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}
  .connect4-screen .room .rh{font-family:'Baloo 2',cursive;font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .connect4-screen .room .rt{font-size:12px;color:var(--muted);margin-top:2px;}
  .connect4-screen .room .go{font-size:20px;flex:0 0 auto;}
  .connect4-screen .turnbar{border-radius:16px;padding:13px 16px;margin-bottom:14px;font-family:'Baloo 2',cursive;font-weight:700;font-size:17px;text-align:center;}
  .connect4-screen .turnbar.mine{background:rgba(61,220,151,.15);border:1px solid var(--teal);}
  .connect4-screen .turnbar.theirs{background:rgba(184,169,217,.12);border:1px solid var(--muted);}
  .connect4-screen .c4-board{display:inline-grid;grid-template-columns:repeat(${COLS},minmax(0,1fr));gap:6px;background:var(--panel-light);border-radius:20px;padding:14px;max-width:420px;width:100%;margin:0 auto;box-sizing:border-box;}
  .connect4-screen .c4-col{display:flex;flex-direction:column-reverse;gap:6px;cursor:pointer;border-radius:10px;padding:2px;transition:background .15s ease;}
  .connect4-screen .c4-col.playable:hover{background:rgba(255,200,87,.12);}
  .connect4-screen .c4-cell{aspect-ratio:1;border-radius:50%;background:var(--bg);box-shadow:inset 0 0 0 2px rgba(184,169,217,.25);}
  .connect4-screen .c4-cell.host{background:var(--coral);box-shadow:none;}
  .connect4-screen .c4-cell.guest{background:var(--gold);box-shadow:none;}
  .connect4-screen .c4-cell.last{animation:c4-pop .35s ease;}
  @keyframes c4-pop{0%{transform:scale(.5);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
  .connect4-screen .c4-legend{display:flex;gap:18px;justify-content:center;margin-top:14px;font-size:13px;color:var(--muted);}
  .connect4-screen .c4-legend span{display:inline-flex;align-items:center;gap:6px;}
  .connect4-screen .c4-dot{width:14px;height:14px;border-radius:50%;display:inline-block;}
  .connect4-screen .c4-dot.host{background:var(--coral);}
  .connect4-screen .c4-dot.guest{background:var(--gold);}
  @media (prefers-reduced-motion:reduce){ .connect4-screen *{animation:none !important;transition:none !important;} }
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
function newBoard(){ return Array.from({length:COLS}, () => []); }
function legalCols(board){ const r=[]; for(let c=0;c<COLS;c++) if(board[c].length<ROWS) r.push(c); return r; }
function dropPiece(board, c, owner){
  const b = board.map(col => col.slice());
  b[c].push(owner);
  return { board:b, row: b[c].length - 1 };
}
function ownerAt(board, c, r){ return (board[c] && board[c][r]) || null; }
function countDir(board, c, r, dx, dy, owner){
  let n = 0, cc = c+dx, rr = r+dy;
  while(cc>=0 && cc<COLS && rr>=0 && rr<ROWS && ownerAt(board,cc,rr)===owner){ n++; cc+=dx; rr+=dy; }
  return n;
}
function isWinAt(board, c, r){
  const owner = ownerAt(board, c, r);
  if(!owner) return false;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  return dirs.some(([dx,dy]) => 1 + countDir(board,c,r,dx,dy,owner) + countDir(board,c,r,-dx,-dy,owner) >= 4);
}
function isFull(board){ return board.every(col => col.length === ROWS); }

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
  drop : () => beep(300,.09,"square",.12),
  win  : () => [392,494,587,784].forEach((f,i)=>setTimeout(()=>beep(f,.22,"triangle",.17), i*140)),
  lose : () => [392,330,262,175].forEach((f,i)=>setTimeout(()=>beep(f,.28,"sine",.15), i*180)),
  tap  : () => beep(660,.05,"square",.07)
};

/* ---------- Supabase REST (mêmes règles que la bataille navale) ---------- */
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
const roomLoad  = (code) => sb("connect4_rooms?code=eq." + encodeURIComponent(code) + "&select=*").then(r => (r && r[0]) || null);
const roomPatch = (code, body) => sb("connect4_rooms?code=eq." + encodeURIComponent(code), { method:"PATCH", body });

/* ============================================================
   ANNULATION D'UN SALON (même garde-fou que la bataille navale)
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
      await sb("connect4_rooms?code=eq." + code, { method:"DELETE" });
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
  mode    : null,      // "solo" | "multi"
  role    : null,      // "host" | "guest" (multi)
  code    : null,
  foe     : "",
  diff    : 2,
  board   : newBoard(),
  turn    : "host",    // à qui de jouer ("host"/"guest" en multi, "me"/"ai" en solo)
  over    : false,
  ended   : false,
  fallback: null
};
function freshLocalGame(){
  S.board = newBoard();
  S.turn = "host";
  S.over = false; S.ended = false;
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
    S.foe = ["", "l'ordinateur (débutant)", "l'ordinateur (malin)", "l'ordinateur (champion)"][S.diff];
    SFX.tap();
    S.role = "host"; // le profil joue toujours les pions "host" (rouge) en solo
    freshLocalGame();
    startGame();
  }));
}

/* ============================================================
   LOBBY MULTIJOUEUR (identique au modèle bataille navale)
   ============================================================ */
function makeCode(){
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1
  return Array.from({length:4}, () => A.charAt(Math.floor(Math.random()*A.length))).join("");
}
async function purgeStaleRooms(){
  if(!CONFIG_OK) return;
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  try{ await sb("connect4_rooms?created_at=lt." + encodeURIComponent(cutoff), { method:"DELETE" }); }catch(e){}
}
let lobbyChannel = null;
async function refreshLobby(){
  if(!CONFIG_OK) return;
  const me = encodeURIComponent(S.profile.name);
  purgeStaleRooms();
  try{
    const open = await sb("connect4_rooms?select=code,host_name,status,created_at" +
      "&status=eq.waiting&guest_name=is.null&order=created_at.desc&limit=12");
    const mine = await sb("connect4_rooms?select=*" +
      "&or=(host_name.eq." + me + ",guest_name.eq." + me + ")" +
      "&status=eq.playing&order=created_at.desc&limit=5");
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
        return '<button class="room" data-resume="' + escAttr(r.code) + '">' +
               '<span class="rc">' + escAttr(r.code) + '</span>' +
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
      await sb("connect4_rooms?status=eq.waiting&host_name=neq." + encodeURIComponent(S.profile.name), { method:"DELETE" });
    }catch(e){}
    btn.disabled = false; btn.textContent = "🧹 Vider les salons inactifs";
    refreshLobby();
  });
}
function startLobbyWatch(){
  if(!client || lobbyChannel) return;
  lobbyChannel = client
    .channel("connect4-lobby")
    .on("postgres_changes", { event:"*", schema:"public", table:"connect4_rooms" }, () => {
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
    // Reprend un salon déjà ouvert par ce profil au lieu d'en dupliquer un.
    try{
      const mine = await sb("connect4_rooms?select=code&host_name=eq." + encodeURIComponent(S.profile.name) +
        "&status=in.(waiting,playing)&order=created_at.desc&limit=1");
      if(mine && mine[0]){ return resumeRoom(mine[0].code); }
    }catch(e){ /* tant pis, on retombe sur la création */ }
    const code = makeCode();
    try{
      await sb("connect4_rooms", { method:"POST", body:{
        code, host_name:S.profile.name, status:"waiting", turn:"host", board: newBoard()
      }});
    }catch(e){
      $("#multiErr").hidden = false;
      $("#multiErr").textContent = "Le salon n'a pas pu être ouvert. Vérifie la table connect4_rooms.";
      return;
    }
    S.role = "host"; S.code = code; S.foe = "";
    joinRoomChannel(code);
    freshLocalGame();
    startGame();
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
    S.board = newBoard(); S.turn = "host"; S.over = false; S.ended = false;
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
  S.board = r.board && r.board.length === COLS ? r.board : newBoard();
  S.turn = r.turn || "host";
  S.over = false; S.ended = false;
  joinRoomChannel(code);
  startGame();
  if(r.status === "cancelled" || r.status === "finished"){
    onRoomUpdate(r);
  }
}

/* ============================================================
   TEMPS RÉEL + SONDAGE DE SECOURS
   (le temps réel Supabase n'est pas garanti actif sur ce projet ;
   on démarre systématiquement le sondage dès qu'on entre en partie
   multijoueur, comme appris avec la bataille navale)
   ============================================================ */
let roomChannel = null;
function joinRoomChannel(code){
  leaveRoomChannel();
  if(client){
    roomChannel = client
      .channel("connect4-room-" + code)
      .on("postgres_changes",
          { event:"UPDATE", schema:"public", table:"connect4_rooms", filter:"code=eq." + code },
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

  if(S.role === "host" && r.guest_name && S.foe !== r.guest_name){
    S.foe = r.guest_name;
    const foeEl = $("#foeName"); if(foeEl) foeEl.textContent = S.foe;
  }

  if(JSON.stringify(r.board) !== JSON.stringify(S.board)){
    S.board = r.board || newBoard();
    S.turn = r.turn;
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
function foeOwner(){ return myOwner() === "host" ? "guest" : "host"; }

function startGame(){
  show("game", S.mode === "solo" ? "solo" : "mode");
  $("#foeName").textContent = S.mode === "solo" ? S.foe : (S.foe || "adversaire à venir");
  paintBoard();
  if(S.mode === "solo" && S.turn === "ai") aiPlay();
}

function paintBoard(){
  const board = $("#c4Board");
  if(!board) return;
  const lastCell = board.dataset.lastCell || "";
  let html = "";
  for(let c=0;c<COLS;c++){
    const canPlay = !S.over && S.board[c].length < ROWS && isMyTurn() && (S.mode === "solo" || !!S.foe);
    html += '<div class="c4-col' + (canPlay ? " playable" : "") + '" data-col="' + c + '">';
    for(let rTop=ROWS-1; rTop>=0; rTop--){
      const owner = ownerAt(S.board, c, rTop);
      const cls = owner === "host" ? " host" : owner === "guest" ? " guest" : "";
      const isLast = lastCell === c + "," + rTop;
      html += '<div class="c4-cell' + cls + (isLast ? " last" : "") + '"></div>';
    }
    html += "</div>";
  }
  board.innerHTML = html;

  const turnBar = $("#turnBar");
  if(turnBar){
    if(S.over){
      turnBar.textContent = "Partie terminée.";
      turnBar.className = "turnbar theirs";
    }else if(S.mode === "multi" && !S.foe){
      turnBar.textContent = "En attente d'un adversaire…";
      turnBar.className = "turnbar theirs";
    }else{
      const mine = isMyTurn();
      turnBar.textContent = mine ? "À toi de jouer" : (S.foe || "L'ordinateur") + " réfléchit…";
      turnBar.className = "turnbar " + (mine ? "mine" : "theirs");
    }
  }
  const cancelBtn = $("#btnCancelGame");
  if(cancelBtn) cancelBtn.classList.toggle("hidden", S.mode !== "multi" || S.over);
}
function isMyTurn(){
  if(S.mode === "solo") return S.turn === "host";
  return S.turn === S.role;
}

function bindGameScreen(){
  $("#c4Board").addEventListener("click", (e) => {
    const col = e.target.closest("[data-col]");
    if(!col || S.over || !isMyTurn() || (S.mode === "multi" && !S.foe)) return;
    playColumn(parseInt(col.dataset.col, 10));
  });
  $("#btnCancelGame").addEventListener("click", () => {
    if(confirm("Annuler ce salon ? Si un adversaire l'a déjà rejoint, la partie s'arrêtera aussi pour lui.")) cancelRoom();
  });
}

async function playColumn(c){
  if(S.board[c].length >= ROWS) return;
  const owner = myOwner();
  const { board, row } = dropPiece(S.board, c, owner);
  S.board = board;
  $("#c4Board").dataset.lastCell = c + "," + row;
  SFX.drop();
  const won = isWinAt(S.board, c, row);
  const full = !won && isFull(S.board);
  S.turn = owner === "host" ? "guest" : "host";
  if(S.mode === "solo") S.turn = S.turn === "guest" ? "ai" : "host";
  paintBoard();

  if(won || full){
    S.over = true;
    await concludeGame(won ? owner : null);
    return;
  }

  if(S.mode === "multi"){
    try{ await roomPatch(S.code, { board: S.board, turn: S.turn }); }catch(e){
      logGameError();
    }
  }else if(S.mode === "solo" && S.turn === "ai"){
    setTimeout(aiPlay, 500);
  }
}
function logGameError(){
  const bar = $("#turnBar");
  if(bar){ bar.textContent = "Coup non transmis — vérifie la connexion."; bar.className = "turnbar theirs"; }
}

async function concludeGame(winnerOwner){
  if(S.mode === "multi"){
    try{
      await roomPatch(S.code, {
        board: S.board, status:"finished",
        winner: winnerOwner ? (winnerOwner === S.role ? S.profile.name : S.foe) : null
      });
    }catch(e){}
  }
  const iWon = winnerOwner ? winnerOwner === myOwner() : null; // null = match nul
  finish(iWon, winnerOwner == null);
}

/* ============================================================
   FIN DE PARTIE
   ============================================================ */
async function finish(won, draw){
  leaveRoomChannel();
  $("#endIcon").textContent = draw ? "🤝" : won ? "🏆" : "😅";
  $("#endTitle").textContent = draw ? "Match nul !" : won ? "Victoire !" : "Perdu !";
  $("#endText").textContent = draw
    ? "Personne n'a réussi à aligner ses 4 pions à temps, la grille est pleine."
    : won
      ? "Bien joué " + S.profile.name + " ! Tu as aligné tes 4 pions."
      : (S.foe || "L'adversaire") + " a aligné ses 4 pions avant toi. Revanche ?";
  draw ? SFX.tap() : (won ? SFX.win() : SFX.lose());
  show("end");

  const msg = $("#saveMsg");
  if(CONFIG_OK && !S.profile.isGuest){
    try{
      await sb("game_history", { method:"POST", prefer:"return=minimal", body:{
        profile_name : S.profile.name,
        game         : GAME_NAME,
        mode         : S.mode,
        score        : draw ? 0 : (won ? 1 : 0),
        rank         : draw ? null : (won ? 1 : 2),
        total_players: S.mode === "multi" ? 2 : 2,
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
   IA SOLO — 100 % locale, aucune requête réseau
   ============================================================ */
async function aiPlay(){
  await new Promise(r => setTimeout(r, 450 + Math.random()*350));
  const legal = legalCols(S.board);
  if(!legal.length) return;
  let c;
  if(S.diff === 1) c = legal[Math.floor(Math.random()*legal.length)];
  else if(S.diff === 2) c = pickHeuristic(S.board, legal);
  else c = pickMinimax(S.board, legal, 5);

  const { board, row } = dropPiece(S.board, c, "guest");
  S.board = board;
  $("#c4Board").dataset.lastCell = c + "," + row;
  SFX.drop();
  const won = isWinAt(S.board, c, row);
  const full = !won && isFull(S.board);
  S.turn = "host";
  paintBoard();
  if(won || full){ S.over = true; await concludeGame(won ? "guest" : null); }
}

function pickHeuristic(board, legal){
  // 1) coup gagnant immédiat ; 2) bloque le coup gagnant adverse ; 3) centre en priorité.
  for(const c of legal){ const { board:b, row } = dropPiece(board, c, "guest"); if(isWinAt(b,c,row)) return c; }
  for(const c of legal){ const { board:b, row } = dropPiece(board, c, "host"); if(isWinAt(b,c,row)) return c; }
  const order = [3,2,4,1,5,0,6].filter(c => legal.includes(c));
  const top = order.slice(0, Math.max(1, Math.ceil(order.length/2)));
  return top[Math.floor(Math.random()*top.length)];
}

const CENTER_ORDER = [3,2,4,1,5,0,6];
function pickMinimax(board, legal, depth){
  let best = null, bestScore = -Infinity;
  const order = CENTER_ORDER.filter(c => legal.includes(c));
  for(const c of order){
    const { board:b, row } = dropPiece(board, c, "guest");
    let score;
    if(isWinAt(b,c,row)) score = 1000000;
    else score = minimax(b, depth-1, -Infinity, Infinity, false);
    if(score > bestScore){ bestScore = score; best = c; }
  }
  return best == null ? legal[0] : best;
}
function minimax(board, depth, alpha, beta, maximizing){
  const legal = legalCols(board);
  if(depth === 0 || legal.length === 0) return evaluateBoard(board);
  const order = CENTER_ORDER.filter(c => legal.includes(c));
  if(maximizing){
    let value = -Infinity;
    for(const c of order){
      const { board:b, row } = dropPiece(board, c, "guest");
      value = Math.max(value, isWinAt(b,c,row) ? 1000000 - (5-depth) : minimax(b, depth-1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if(alpha >= beta) break;
    }
    return value;
  }else{
    let value = Infinity;
    for(const c of order){
      const { board:b, row } = dropPiece(board, c, "host");
      value = Math.min(value, isWinAt(b,c,row) ? -1000000 + (5-depth) : minimax(b, depth-1, alpha, beta, true));
      beta = Math.min(beta, value);
      if(alpha >= beta) break;
    }
    return value;
  }
}
function evaluateBoard(board){
  let score = 0;
  for(let c=0;c<COLS;c++){
    const centerBonus = 3 - Math.abs(c - 3);
    for(let r=0;r<board[c].length;r++){
      score += (board[c][r] === "guest" ? centerBonus : -centerBonus);
    }
  }
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for(let c=0;c<COLS;c++){
    for(let r=0;r<ROWS;r++){
      for(const [dx,dy] of dirs){
        const cells = [];
        let ok = true;
        for(let i=0;i<4;i++){
          const cc = c+dx*i, rr = r+dy*i;
          if(cc<0||cc>=COLS||rr<0||rr>=ROWS){ ok=false; break; }
          cells.push(ownerAt(board,cc,rr));
        }
        if(!ok) continue;
        const guestCount = cells.filter(o=>o==="guest").length;
        const hostCount  = cells.filter(o=>o==="host").length;
        if(guestCount>0 && hostCount>0) continue; // fenêtre mixte, sans potentiel
        if(guestCount===3) score += 40;
        else if(guestCount===2) score += 8;
        else if(hostCount===3) score -= 45;
        else if(hostCount===2) score -= 8;
      }
    }
  }
  return score;
}

/* ============================================================
   MARKUP (toutes les sections en un seul fragment)
   ============================================================ */
function shellHtml(){
  return `
    <button class="btn btn-ghost btn-sm hidden" id="btnBack" style="margin-bottom:14px;">‹ Retour</button>

    <section class="screen on" data-screen="mode">
      <div class="card" style="text-align:center;padding:18px;">
        <img src="./puissance4-logo.png" alt="Puissance 4 de la Tribu" style="width:100%;max-width:420px;border-radius:20px;">
      </div>
      <div class="card">
        <h2>Comment tu joues ?</h2>
        <p class="lead">Aligne 4 pions avant l'adversaire — à l'horizontale, la verticale ou en diagonale.</p>
        <div class="role-grid role-grid-3">
          <div class="role-card" data-mode="solo">
            <div class="emoji">🤖</div><h3>Contre l'ordinateur</h3>
            <p>Une partie tout de suite, hors ligne. Trois niveaux, du débutant au champion.</p>
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

    <section class="screen" data-screen="solo">
      <div class="card">
        <h2>Contre qui tu joues ?</h2>
        <p class="lead">Plus le niveau monte, plus l'ordinateur anticipe tes coups.</p>
        <div class="role-grid role-grid-3">
          <div class="role-card" data-diff="1"><div class="emoji">🎲</div><h3>Débutant</h3><p>Joue au hasard. Parfait pour les petits.</p></div>
          <div class="role-card" data-diff="2"><div class="emoji">🧠</div><h3>Malin</h3><p>Prend ses coups gagnants et bloque les tiens.</p></div>
          <div class="role-card" data-diff="3"><div class="emoji">👑</div><h3>Champion</h3><p>Anticipe plusieurs coups à l'avance. Redoutable.</p></div>
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
          <button class="btn btn-ghost btn-sm" id="btnCancelRoom">Fermer le salon</button>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="game">
      <div class="card">
        <div class="turnbar theirs" id="turnBar">…</div>
        <p class="lead center" id="foeLine" style="margin-bottom:8px;">Face à <b id="foeName">…</b></p>
        <div class="center">
          <div class="c4-board" id="c4Board"></div>
        </div>
        <div class="c4-legend">
          <span><span class="c4-dot host"></span>Toi</span>
          <span><span class="c4-dot guest"></span>Adversaire</span>
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
export async function mountConnect4(container){
  root = container;
  root.classList.add("connect4-screen");
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
  bindSoloScreen();
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

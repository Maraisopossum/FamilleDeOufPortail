// Le Grand Quiz de la Tribu — porté depuis FamilleDeOuf/index.html.
// Logique de jeu fidèle à l'original ; l'écran de sélection de profil
// "maison" a été retiré au profit du profil de session partagé (shared/profile.js).
import { supabase as supabaseClient, CONFIG_OK } from "../shared/supabase-client.js";
import { getActiveProfile, clearActiveProfile } from "../shared/profile.js";

/* ============ CSS spécifique au quiz (scopé à .quiz-screen) ============ */
if (!document.getElementById("quiz-styles")) {
  const style = document.createElement("style");
  style.id = "quiz-styles";
  style.textContent = `
  .quiz-screen .code-display{ font-family:'Baloo 2'; font-weight:800; font-size: clamp(38px,10vw,64px); letter-spacing: 10px;
    color: var(--gold); text-align:center; background: var(--bg); border-radius:20px; padding: 18px; margin: 18px 0; }
  .quiz-screen .player-chip{ display:inline-flex; align-items:center; gap:8px; background: var(--panel-light); border-radius: 999px; padding: 8px 14px;
    margin: 4px; font-family:'Kalam', cursive; font-size:16px; flex-wrap:wrap; }
  .quiz-screen .waiting-players{ margin: 18px 0; text-align:center; }
  .quiz-screen .pulse-dot{ display:inline-block; width:10px; height:10px; border-radius:50%; background: var(--teal);
    animation: quiz-pulse 1.2s ease-in-out infinite; margin-right:8px; }
  @keyframes quiz-pulse{ 0%,100%{opacity:1;} 50%{opacity:0.3;} }
  .quiz-screen .team-tag{ font-family:'Inter'; font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px; }
  .quiz-screen .team-0{ background:var(--coral); color:#1b1030; } .quiz-screen .team-1{ background:var(--blue); color:#fff; }
  .quiz-screen .team-2{ background:var(--gold); color:#1b1030; } .quiz-screen .team-3{ background:var(--teal); color:#0e2c22; }
  .quiz-screen .stage{ position:relative; background: var(--panel); border-radius: 28px; padding: 32px 26px; margin-top: 18px;
    box-shadow: 0 0 0 2px var(--panel-light), 0 25px 70px rgba(0,0,0,0.45); animation: quiz-glow 3.5s ease-in-out infinite; }
  @keyframes quiz-glow{ 0%,100%{ box-shadow: 0 0 0 2px var(--panel-light), 0 25px 70px rgba(0,0,0,0.45); }
    50%{ box-shadow: 0 0 0 2px var(--gold), 0 25px 90px rgba(255,200,87,0.25); } }
  .quiz-screen .category-tag{ display:inline-block; background: var(--teal); color:#0e2c22; font-weight:700; font-size:13px;
    padding: 5px 14px; border-radius: 999px; margin-bottom: 14px; }
  .quiz-screen .question-text{ font-size: clamp(20px, 4vw, 30px); font-weight: 700; line-height:1.35; margin: 0 0 22px; }
  .quiz-screen .timer-bar{ height:8px; background: var(--bg); border-radius:999px; overflow:hidden; margin-bottom:16px; }
  .quiz-screen .timer-fill{ height:100%; background: var(--gold); width:100%; transition: width 0.2s linear; }
  .quiz-screen .rank-badge{ display:inline-block; background: var(--panel-light); border:2px solid var(--gold); color:var(--gold);
    font-weight:700; font-size:13px; padding:6px 14px; border-radius:999px; margin-bottom:14px; }
  .quiz-screen .answer-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 10px; }
  @media (max-width:600px){ .quiz-screen .answer-grid{ grid-template-columns: 1fr; } }
  .quiz-screen .answer-btn{ border: none; border-radius: 16px; padding: 20px 18px; font-size: 17px; font-weight:700;
    color: #10082a; display:flex; align-items:center; gap:12px; cursor:pointer; transition: all .12s ease;
    font-family:'Baloo 2'; text-align:left; }
  .quiz-screen .answer-btn:active{ transform: scale(0.97); }
  .quiz-screen .answer-btn.a{ background: var(--coral); } .quiz-screen .answer-btn.b{ background: var(--blue); color:#fff; }
  .quiz-screen .answer-btn.c{ background: var(--gold); } .quiz-screen .answer-btn.d{ background: var(--teal); }
  .quiz-screen .answer-btn:disabled{ opacity:0.55; cursor:default; }
  .quiz-screen .answer-btn.chosen{ outline: 4px solid #fff; }
  .quiz-screen .answer-btn.correctReveal{ background: var(--teal) !important; color:#0e2c22 !important; outline: 4px solid #fff;
    box-shadow: 0 0 0 4px var(--teal), 0 0 30px rgba(61,220,151,0.7); transform: scale(1.03); z-index:2; position:relative; }
  .quiz-screen .answer-btn.wrongReveal{ opacity: 0.35; filter: grayscale(40%); }
  .quiz-screen .answer-btn.chosenWrong{ outline: 4px solid var(--coral); box-shadow: 0 0 0 4px var(--coral); opacity:0.7 !important; filter:none; }
  .quiz-screen .answer-btn .letter{ background: rgba(0,0,0,0.15); width:30px; height:30px; border-radius:9px;
    display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
  .quiz-screen .funfact{ background: var(--bg); border-left: 4px solid var(--gold); padding: 12px 16px; border-radius: 10px;
    color: var(--muted); font-size: 14px; margin-top: 14px; }
  .quiz-screen .stage-actions{ display:flex; justify-content:space-between; align-items:center; margin-top: 22px; flex-wrap:wrap; gap:12px; }
  .quiz-screen .end-card{ background: var(--panel); border-radius: 28px; padding: 40px 30px; text-align:center; margin-top:20px; }
  .quiz-screen .end-title{ font-size: clamp(26px,5vw,38px); margin:0 0 8px; }
  .quiz-screen .podium{ display:flex; justify-content:center; align-items:flex-end; gap:16px; margin: 30px 0; flex-wrap:wrap; }
  .quiz-screen .podium-item{ background: var(--panel-light); border-radius: 18px 18px 0 0; padding: 18px 16px; min-width: 150px; }
  .quiz-screen .podium-item .rank{ font-size:34px; }
  .quiz-screen .podium-item .pname{ font-family:'Kalam', cursive; font-size:20px; margin: 6px 0 2px; }
  .quiz-screen .podium-item .pscore{ font-family:'Baloo 2'; font-weight:800; color:var(--gold); font-size:22px; }
  .quiz-screen .podium-item .ptitle{ font-size:13px; color: var(--muted); margin-top:6px; line-height:1.4; }
  .quiz-screen .podium-item.first{ order:2; padding-bottom:34px; border: 2px solid var(--gold); }
  .quiz-screen .podium-item.second{ order:1; } .quiz-screen .podium-item.third{ order:3; }
  .quiz-screen .team-config-row{ display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
  .quiz-screen .team-assign-row{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:4px 0; background:var(--panel-light);
    border-radius:12px; padding:8px 12px; }
  `;
  document.head.appendChild(style);
}

/* ============ DONNÉES DU QUIZ (table Supabase `questions`) ============ */
let QUESTIONS = [];
let CATEGORIES = [];
let categoryGroupOverrides = {};
let usingCachedQuestions = false;

async function loadQuestions(){
  if(!CONFIG_OK) throw new Error("Configuration Supabase manquante.");
  try{
    let all = [];
    let from = 0;
    const pageSize = 1000;
    while(true){
      const { data, error } = await supabaseClient.from("questions").select("*").range(from, from + pageSize - 1).order("id");
      if(error) throw new Error(error.message);
      all = all.concat(data);
      if(!data || data.length < pageSize) break;
      from += pageSize;
    }
    if(all.length === 0) throw new Error("Aucune question trouvée dans Supabase (table « questions » vide ou inexistante).");
    QUESTIONS = all.map(r => ({
      id: r.id, cat: r.cat, q: r.q, opts: r.opts, correct: r.correct, fact: r.fact || "",
      group: r.group_name || ""
    }));
    usingCachedQuestions = false;
    try{
      localStorage.setItem("quiz_questions_cache", JSON.stringify(QUESTIONS));
      localStorage.setItem("quiz_questions_cache_ts", String(Date.now()));
    }catch(e){ /* cache plein ou indisponible : tant pis, pas bloquant */ }
  }catch(err){
    let cached = null;
    try{ cached = JSON.parse(localStorage.getItem("quiz_questions_cache") || "null"); }catch(e){}
    if(cached && cached.length){
      QUESTIONS = cached;
      usingCachedQuestions = true;
    } else {
      throw new Error("Impossible de charger les questions (" + err.message + ") et aucune copie hors ligne n'est disponible.");
    }
  }
  CATEGORIES = [...new Set(QUESTIONS.map(q => q.cat))];
  categoryGroupOverrides = {};
  QUESTIONS.forEach(q => {
    if(q.group && q.group.trim() && !categoryGroupOverrides[q.cat]){
      categoryGroupOverrides[q.cat] = q.group.trim();
    }
  });
}

const FORMATS = [
  { label:"Rapide", total:12, sub:"~10 min" },
  { label:"Classique", total:20, sub:"~20 min" },
  { label:"Marathon", total:36, sub:"~35 min" }
];
const ANSWER_CLASSES = ["a","b","c","d"];
const RECONNECT_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function shuffleQuestionOptions(q){
  const order = shuffle([0,1,2,3]);
  const opts = order.map(i => q.opts[i]);
  const correct = order.indexOf(q.correct);
  return { ...q, opts, correct };
}
function buildDeck(total, selectedCats){
  const cats = selectedCats && selectedCats.length ? selectedCats : CATEGORIES;
  const perCat = Math.floor(total / cats.length);
  let remainder = total - perCat * cats.length;
  let deck = [];
  cats.forEach(c => {
    const pool = shuffle(QUESTIONS.filter(q => q.cat === c));
    let n = perCat + (remainder > 0 ? 1 : 0);
    if(remainder > 0) remainder--;
    deck.push(...pool.slice(0, Math.min(n, pool.length)));
  });
  return shuffle(deck).map(shuffleQuestionOptions);
}
function makeRoomCode(){
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for(let i=0;i<4;i++) code += letters[Math.floor(Math.random()*letters.length)];
  return code;
}
function scrollTop(){
  window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? "instant" : "auto" });
}
function escAttr(str){
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
function computeRank(scoresObj, name){
  if(!scoresObj || !(name in scoresObj)) return null;
  const sorted = Object.entries(scoresObj).sort((a,b)=>b[1]-a[1]);
  const idx = sorted.findIndex(([n])=>n===name);
  return idx === -1 ? null : { rank: idx+1, total: sorted.length };
}

/* ============ CHRONO VISIBLE ============ */
let timerInterval = null;
function stopTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval = null; } }
function startTimer(startTime, duration){
  stopTimer();
  timerInterval = setInterval(()=>{
    const el = document.getElementById("timerFill");
    const label = document.getElementById("timerLabel");
    if(!el){ stopTimer(); return; }
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const pct = Math.max(0, Math.min(100, 100 * remaining / duration));
    el.style.width = pct + "%";
    el.style.background = pct < 25 ? "var(--coral)" : "var(--gold)";
    if(label) label.textContent = Math.ceil(remaining/1000) + "s";
    if(remaining <= 0) stopTimer();
  }, 200);
}

/* ============ HANDICAP (délai avant de pouvoir répondre) ============ */
const HANDICAP_LEVELS = [0, 3, 5, 10, 15, 20];
let handicapInterval = null;
function stopHandicapCountdown(){ if(handicapInterval){ clearInterval(handicapInterval); handicapInterval = null; } }
function startHandicapCountdown(receivedAt, seconds, onDone){
  stopHandicapCountdown();
  if(!seconds || seconds <= 0) return;
  handicapInterval = setInterval(()=>{
    const el = document.getElementById("handicapCountdown");
    const remaining = Math.max(0, seconds*1000 - (Date.now()-receivedAt));
    if(el) el.textContent = "🐢 Patiente encore " + Math.ceil(remaining/1000) + "s avant de pouvoir répondre…";
    if(remaining <= 0){ stopHandicapCountdown(); if(onDone) onDone(); }
  }, 200);
}
function remainingHandicapMs(receivedAt, seconds){
  if(!seconds || seconds <= 0) return 0;
  return Math.max(0, seconds*1000 - (Date.now()-receivedAt));
}

/* ============ SONS (mute partagé avec toute l'app, cf. window.soundMuted) ============ */
let audioCtx;
function beep(freq, dur, type="sine", vol=0.15){
  if(window.soundMuted) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  }catch(e){}
}
function soundReveal(){ beep(880,0.15); setTimeout(()=>beep(1320,0.2),120); }
function soundJoin(){ beep(700,0.12,"triangle"); }
function soundAnswer(){ beep(500,0.08,"square",0.08); }
function soundFanfare(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.25,"triangle"),i*130)); }
function soundEliminated(){ [400,300,200].forEach((f,i)=>setTimeout(()=>beep(f,0.3,"sawtooth",0.1),i*150)); }
function burstConfetti(count){ if(window.burstConfetti) window.burstConfetti(count); }

const TITLES = ["🏆 Le Cerveau de la Soirée","🥈 Le Bon Public Averti","🥉 Le Sacré Débrouillard","🎉 Le Roi (ou la Reine) du Second Degré"];

/* ============ ÉTAT GLOBAL DU MODULE ============ */
let app = null;               // conteneur DOM monté par index.html
let activeProfile = null;     // profil de session (shared/profile.js)
let initialized = false;

let role = null; // 'host' | 'player' | 'solo' | null
let pendingJoinCode = null;
let channel = null;
let roomCode = "";

function freshHostState(){
  return {
    formatIndex:1, selectedCats:[], catsInitialized:false, players:{}, deck:[], currentIndex:0, phase:"lobby",
    answers:{}, questionStartTime:0, hostPlaysToo:false, ownChoiceIndex:null,
    lastRoundResults:{}, teamMode:false, teamNames:["Équipe 1","Équipe 2"], playerTeams:{}, teamScores:{},
    eliminationMode:false, eliminated:[], playerHandicaps:{}, hostHandicap:0, questionDuration:20000,
    tournamentMode:false, tournamentRounds:3, tournamentRound:1, jokerEnabled:true
  };
}
let host = freshHostState();
let player = { name:"", roomCode:"", score:0, phase:"join", currentQuestion:null, chosenIndex:null, lastResult:null,
  eliminated:false, lastKnownScores:{}, finalTeamInfo:null, currentHandicap:0, myJoinHandicap:0, isRegistered:false };

function freshSoloState(){
  return { phase:"setup", formatIndex:1, selectedCats:[], catsInitialized:false, deck:[], currentIndex:0, chosenIndex:null, revealed:false, correctCount:0, history:[] };
}
let solo = freshSoloState();

let joinHandicapSeconds = 0;

function bindDelegatedClicks(){
  app.addEventListener("click", function(e){
    const assignBtn = e.target.closest('[data-action="assign-team"]');
    if(assignBtn){ assignTeam(assignBtn.dataset.name, parseInt(assignBtn.dataset.idx, 10)); return; }
    const handicapBtn = e.target.closest('[data-action="set-handicap"]');
    if(handicapBtn){ setHandicap(handicapBtn.dataset.name, parseInt(handicapBtn.dataset.sec, 10)); return; }
    const pickRoomBtn = e.target.closest('[data-action="pick-room"]');
    if(pickRoomBtn){
      const codeInput = document.getElementById("codeInput");
      if(codeInput) codeInput.value = pickRoomBtn.dataset.code;
      return;
    }
  });
}

function render(){
  if(role === "solo"){ renderSoloScreen(); return; }
  if(role === null){ renderRoleSelect(); return; }
  if(!CONFIG_OK){ renderConfigWarning(); return; }
  if(role === "host") renderHostScreen();
  else if(role === "player") renderPlayerScreen();
}

function renderConfigWarning(){
  app.innerHTML = `
    <div class="card">
      <h1 class="setup-title">Configuration manquante</h1>
      <p class="setup-sub">Ce jeu a besoin du projet Supabase partagé (déjà configuré dans le code — vérifie la connexion réseau).</p>
    </div>
  `;
}

/* ============ SÉLECTION DU RÔLE ============ */
function renderRoleSelect(){
  app.innerHTML = `
    <div class="card" style="text-align:center;padding:18px;">
      <img src="./logo.png" alt="La Team Kahoot" style="width:100%;max-width:420px;border-radius:20px;">
    </div>
    <div class="card">
      <h1 class="setup-title">Chacun son écran !</h1>
      <p class="setup-sub">Une personne crée la partie sur un grand écran (TV, laptop), les autres rejoignent depuis leur téléphone. Ou entraîne-toi tout seul.</p>
      <div class="role-grid role-grid-3">
        <div class="role-card" data-role="host">
          <div class="emoji">📺</div><h3>Créer la partie</h3><p>Je tiens l'écran principal (l'hôte du quiz)</p>
        </div>
        <div class="role-card" data-role="player">
          <div class="emoji">📱</div><h3>Rejoindre une partie</h3><p>Je joue depuis mon téléphone</p>
        </div>
        <div class="role-card" data-role="solo">
          <div class="emoji">🎯</div><h3>Mode Solo</h3><p>Je m'entraîne tout seul, à mon rythme</p>
        </div>
        <a class="role-card" href="#/historique" style="text-decoration:none;">
          <div class="emoji">📊</div><h3>Historique</h3><p>Voir les scores passés</p>
        </a>
      </div>
      ${!CONFIG_OK ? `<div class="config-warning">⚠️ Les modes "Créer la partie" et "Rejoindre" nécessitent la configuration Supabase. Le Mode Solo fonctionne sans configuration.</div>` : ""}
    </div>
    <footer>${QUESTIONS.length} questions dans la base${usingCachedQuestions ? ' · 📡 copie hors ligne (peut-être un peu ancienne)' : ''} · le mode solo fonctionne même seul, sans les autres joueurs</footer>
  `;
  app.querySelectorAll("[data-role]").forEach(el => el.addEventListener("click", () => chooseRole(el.dataset.role)));
}
function chooseRole(r){ role = r; render(); }

/* ============ CANAL REALTIME ============ */
let lastChannelCode = null;
let lastChannelHandlers = null;
let reconnectTimer = null;
let connectionStatus = "connected"; // 'connected' | 'reconnecting' | 'offline'

function updateConnectionBanner(){
  let el = document.getElementById("connBanner");
  if(connectionStatus === "connected"){
    if(el) el.remove();
    return;
  }
  if(!el){
    el = document.createElement("div");
    el.id = "connBanner";
    el.style.cssText = "position:fixed;top:0;left:0;right:0;background:var(--coral);color:#1b1030;text-align:center;padding:8px 44px 8px 8px;font-weight:700;font-size:13px;z-index:65;";
    document.body.prepend(el);
  }
  el.textContent = connectionStatus === "offline" ? "📡 Pas de connexion internet…" : "🔄 Connexion perdue, reconnexion en cours…";
}
let connBannerShowTimer = null;
function cancelPendingReconnect(){
  if(connBannerShowTimer){ clearTimeout(connBannerShowTimer); connBannerShowTimer = null; }
  if(reconnectTimer){ clearTimeout(reconnectTimer); reconnectTimer = null; }
}
function scheduleReconnect(){
  if(reconnectTimer || !lastChannelCode || !lastChannelHandlers) return;
  // Beaucoup de coupures signalées par Supabase (verrouillage du téléphone,
  // app en arrière-plan) se résolvent seules en moins d'une seconde : on
  // attend un court instant avant d'afficher le bandeau pour ne pas faire
  // clignoter l'écran à chaque micro-coupure.
  if(!connBannerShowTimer){
    connBannerShowTimer = setTimeout(() => {
      connBannerShowTimer = null;
      if(connectionStatus !== "connected"){
        connectionStatus = "reconnecting";
        updateConnectionBanner();
      }
    }, 1200);
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if(role === "host" || role === "player"){
      subscribeChannel(lastChannelCode, lastChannelHandlers);
      if(role === "player") setTimeout(() => send("join", { name: player.name, handicap: player.currentHandicap || 0 }), 500);
    }
  }, 2500);
}
window.addEventListener("offline", () => { connectionStatus = "offline"; updateConnectionBanner(); });
window.addEventListener("online", () => { if(lastChannelCode) scheduleReconnect(); });

function subscribeChannel(code, handlers){
  if(channel) supabaseClient.removeChannel(channel);
  lastChannelCode = code; lastChannelHandlers = handlers;
  channel = supabaseClient.channel("quiz-room-" + code, { config:{ broadcast:{ self:false } } });
  Object.entries(handlers).forEach(([event, fn]) => {
    channel.on("broadcast", { event }, ({payload}) => fn(payload));
  });
  channel.subscribe((status) => {
    if(status === "SUBSCRIBED"){
      // Le canal s'est rétabli tout seul : on annule toute reconnexion
      // forcée déjà programmée, sinon on recrée le canal pour rien et ça
      // provoque une nouvelle coupure (et donc un nouveau clignotement).
      cancelPendingReconnect();
      connectionStatus = "connected";
      updateConnectionBanner();
    } else if(status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED"){
      scheduleReconnect();
    }
  });
  return channel;
}
function send(event, payload){
  if(channel) channel.send({ type:"broadcast", event, payload });
}

/* ============ ANNUAIRE DES PARTIES OUVERTES (Presence) ============ */
const DIRECTORY_CHANNEL_NAME = "quiz-lobby-directory";
let directoryChannel = null;
let openRoomsList = [];

function ensureDirectoryChannel(presenceKey, onSync){
  if(directoryChannel) return directoryChannel;
  directoryChannel = supabaseClient.channel(DIRECTORY_CHANNEL_NAME, { config:{ presence:{ key: presenceKey } } });
  if(onSync) directoryChannel.on("presence", { event: "sync" }, onSync);
  directoryChannel.subscribe();
  return directoryChannel;
}
function closeDirectoryChannel(){
  if(directoryChannel){ supabaseClient.removeChannel(directoryChannel); directoryChannel = null; }
}
function hostTrackRoom(){
  if(!roomCode) return;
  ensureDirectoryChannel(roomCode);
  directoryChannel.track({
    code: roomCode,
    format: FORMATS[host.formatIndex].label,
    playerCount: Object.keys(host.players).length,
    createdAt: Date.now()
  });
}
function hostUntrackRoom(){
  if(directoryChannel) directoryChannel.untrack();
}
function setupOpenRoomsListener(){
  ensureDirectoryChannel("listener-" + Math.random().toString(36).slice(2), () => {
    const state = directoryChannel.presenceState();
    openRoomsList = [];
    Object.values(state).forEach(arr => arr.forEach(e => { if(e.code) openRoomsList.push(e); }));
    renderOpenRoomsArea();
  });
}
function renderOpenRoomsArea(){
  const el = document.getElementById("openRoomsArea");
  if(!el) return;
  if(openRoomsList.length === 0){
    el.innerHTML = `<p class="status-banner" style="text-align:left;margin-bottom:14px;">Aucune partie en attente détectée pour l'instant — demande le code à l'hôte, ou attends qu'il en crée une.</p>`;
    return;
  }
  el.innerHTML = `
    <label class="field-label">Parties en attente de lancement</label>
    <div class="btn-row" style="margin-bottom:18px;">
      ${openRoomsList.map(r => `
        <button class="btn btn-ghost" data-action="pick-room" data-code="${escAttr(r.code)}" style="flex:1;min-width:170px;text-align:left;">
          🎮 ${r.code} — ${escAttr(r.format||'')} — ${r.playerCount||0} joueur${(r.playerCount||0)>1?'s':''}
        </button>
      `).join("")}
    </div>
  `;
}

/* ================= HOST ================= */
function renderHostScreen(){
  if(host.phase === "lobby") renderHostLobby();
  else if(host.phase === "question" || host.phase === "reveal") renderHostGame();
  else if(host.phase === "roundEnd") renderHostRoundEnd();
  else if(host.phase === "end") renderHostEnd();
}

function renderHostRoundEnd(){
  const scoresForPodium = host.teamMode ? teamScoresAsMap() : host.players;
  const ranked = Object.entries(scoresForPodium).sort((a,b)=>b[1]-a[1]);
  app.innerHTML = `
    <div class="end-card">
      <h1 class="end-title">🏁 Fin de la manche ${host.tournamentRound-1} !</h1>
      <p class="setup-sub">Score cumulé avant la manche ${host.tournamentRound}/${host.tournamentRounds} :</p>
      <div class="player-cards" style="justify-content:center;">
        ${ranked.map(([name,score],i) => `
          <div class="player-card"><div class="name">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)} ${name}</div><div class="score">${score}</div></div>
        `).join("")}
      </div>
      <div class="btn-row" style="justify-content:center;margin-top:26px;">
        <button class="btn btn-primary" id="btnNextRound">Manche ${host.tournamentRound}/${host.tournamentRounds} ➜</button>
      </div>
    </div>
  `;
  app.querySelector("#btnNextRound").addEventListener("click", hostStartNextRound);
}

function renderHostLobby(){
  if(!roomCode){
    installLobbyBackGuard();
    roomCode = makeRoomCode();
    subscribeChannel(roomCode, {
      join: (payload) => {
        const isNew = !(payload.name in host.players);
        if(isNew){
          host.players[payload.name] = 0;
          host.playerHandicaps[payload.name] = payload.handicap || 0;
          soundJoin();
        }
        render();
        hostSendSync();
        hostTrackRoom();
      },
      answer: (payload) => onHostReceiveAnswer(payload)
    });
    hostTrackRoom();
  }
  const playerNames = Object.keys(host.players);
  app.innerHTML = `
    <div class="card">
      <h1 class="setup-title">Rejoignez la partie !</h1>
      <p class="setup-sub">Chaque joueur va sur ce site depuis son téléphone, choisit « Rejoindre une partie », et entre ce code :</p>
      <div class="code-display">${roomCode}</div>
      <div class="waiting-players">
        <span class="pulse-dot"></span>${playerNames.length} joueur${playerNames.length>1?'s':''} connecté${playerNames.length>1?'s':''}
        <div style="margin-top:10px;">
          ${playerNames.map(n=>`<span class="player-chip">${n}${host.teamMode && host.playerTeams[n]!==undefined ? ` <span class="team-tag team-${host.playerTeams[n]}">${host.teamNames[host.playerTeams[n]]}</span>` : ''}</span>`).join("") || '<span style="color:var(--muted);">En attente du premier joueur…</span>'}
        </div>
      </div>
      <div class="btn-row" style="margin-bottom:10px;">
        <button class="btn btn-ghost" id="copyLinkBtn">🔗 Copier le lien pour rejoindre</button>
      </div>
      <p class="status-banner" style="margin-bottom:22px;">Tu veux jouer toi aussi ? Ouvre ce lien sur ton propre téléphone (pas sur cet écran) pour te connecter comme un joueur normal.</p>
      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Format de partie</h3>
      <div class="btn-row" id="formatRow" style="margin-bottom:26px;"></div>
      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Temps par question</h3>
      <div class="btn-row" id="durationRow" style="margin-bottom:12px;"></div>
      <p class="status-banner" style="text-align:left;margin-bottom:26px;">« Sans chrono » masque le décompte : tout le monde répond à son rythme, toi seul décides quand révéler.</p>
      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Thèmes à inclure</h3>
      <div class="btn-row" id="themeRow" style="margin-bottom:12px;"></div>
      <p class="status-banner" style="text-align:left;margin-bottom:26px;">Astuce : pour une manche 100% sur un seul thème, désélectionne les autres et ne garde que celui que tu veux.</p>

      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Mode Équipes</h3>
      <div class="btn-row" style="margin-bottom:14px;">
        <button class="btn ${host.teamMode ? 'btn-gold' : 'btn-ghost'}" id="btnToggleTeamMode">
          ${host.teamMode ? '✅ Mode Équipes activé' : 'Activer le Mode Équipes'}
        </button>
      </div>
      ${host.teamMode ? renderTeamConfigHtml() : ""}

      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Mode Élimination</h3>
      <div class="btn-row" style="margin-bottom:14px;">
        <button class="btn ${host.eliminationMode ? 'btn-gold' : 'btn-ghost'}" id="btnToggleElimination">
          ${host.eliminationMode ? '✅ Élimination activée' : 'Activer le Mode Élimination'}
        </button>
      </div>
      ${host.eliminationMode ? `<p class="status-banner" style="text-align:left;margin-bottom:22px;">À partir de la 2ᵉ question, le joueur le moins bien classé est éliminé à chaque révélation. Il continue de suivre la partie en spectateur.</p>` : ""}

      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Mode Tournoi</h3>
      <div class="btn-row" style="margin-bottom:14px;">
        <button class="btn ${host.tournamentMode ? 'btn-gold' : 'btn-ghost'}" id="btnToggleTournament">
          ${host.tournamentMode ? '✅ Tournoi activé' : 'Activer le Mode Tournoi'}
        </button>
      </div>
      ${host.tournamentMode ? `
        <p class="status-banner" style="text-align:left;margin-bottom:10px;">Le score se cumule sur plusieurs manches d'affilée dans la même soirée.</p>
        <label class="field-label">Nombre de manches</label>
        <div class="btn-row" style="margin-bottom:22px;" id="tournamentRoundsRow">
          ${[2,3,4,5].map(n => `<button class="btn btn-sm ${host.tournamentRounds===n?'btn-gold':'btn-ghost'}" data-rounds="${n}">${n} manches</button>`).join("")}
        </div>
      ` : ""}

      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Joker 50/50</h3>
      <div class="btn-row" style="margin-bottom:14px;">
        <button class="btn ${host.jokerEnabled ? 'btn-gold' : 'btn-ghost'}" id="btnToggleJoker">
          ${host.jokerEnabled ? '✅ Joker 50/50 activé (1 par joueur et par partie)' : 'Joker 50/50 désactivé'}
        </button>
      </div>

      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Handicap par joueur</h3>
      <p class="status-banner" style="text-align:left;margin-bottom:14px;">Chacun choisit son handicap en te rejoignant, mais tu peux l'ajuster ici à tout moment avant de lancer.</p>
      ${renderHandicapConfigHtml()}

      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Un seul téléphone pour tout le monde ?</h3>
      <div class="btn-row" style="margin-bottom:14px;">
        <button class="btn ${host.hostPlaysToo ? 'btn-gold' : 'btn-ghost'}" id="btnToggleHostPlays">
          ${host.hostPlaysToo ? `✅ Je joue aussi sur cet écran (${escAttr(activeProfile.name)})` : 'Activer : je joue aussi sur cet écran'}
        </button>
      </div>
      ${host.hostPlaysToo ? `
        <p class="status-banner" style="text-align:left;margin-bottom:10px;">⚠️ Ta réponse s'affichera sur cet écran, donc les autres pourront la voir si tu ne fais pas attention. Idéal en petit comité ou en solo.</p>
        <label class="field-label">Ton handicap à toi</label>
        <div class="btn-row" style="margin-bottom:22px;" id="hostHandicapRow">
          ${HANDICAP_LEVELS.map(s => `
            <button class="btn btn-sm ${host.hostHandicap===s ? 'btn-gold' : 'btn-ghost'}" data-sec="${s}">${s===0 ? "Aucun" : s+"s"}</button>
          `).join("")}
        </div>
      ` : ""}
      <div class="btn-row">
        <button class="btn btn-primary" id="startBtn" ${(host.selectedCats.length<1 || (playerNames.length<1 && !(host.hostPlaysToo && activeProfile.name))) ? 'disabled':''}>Lancer la partie 🚀</button>
        <button class="btn btn-ghost" id="cancelLobbyBtn">‹ Annuler le salon</button>
      </div>
    </div>
    <footer>Astuce : idéalement au moins 2 joueurs pour que ce soit marrant.</footer>
  `;
  renderHostFormatRow();
  renderHostDurationRow();
  renderHostThemeRow();
  app.querySelector("#cancelLobbyBtn").addEventListener("click", leaveToRoleSelect);
  app.querySelector("#copyLinkBtn").addEventListener("click", copyJoinLink);
  app.querySelector("#btnToggleTeamMode").addEventListener("click", toggleTeamMode);
  app.querySelector("#btnToggleElimination").addEventListener("click", toggleEliminationMode);
  app.querySelector("#btnToggleTournament").addEventListener("click", toggleTournamentMode);
  const roundsRow = app.querySelector("#tournamentRoundsRow");
  if(roundsRow) roundsRow.querySelectorAll("[data-rounds]").forEach(b => b.addEventListener("click", () => setTournamentRounds(parseInt(b.dataset.rounds,10))));
  app.querySelector("#btnToggleJoker").addEventListener("click", toggleJokerEnabled);
  app.querySelector("#btnToggleHostPlays").addEventListener("click", toggleHostPlays);
  const hostHandicapRow = app.querySelector("#hostHandicapRow");
  if(hostHandicapRow) hostHandicapRow.querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => setHostOwnHandicap(parseInt(b.dataset.sec,10))));
  app.querySelector("#startBtn").addEventListener("click", hostStartGame);
}

function renderTeamConfigHtml(){
  const playerNames = Object.keys(host.players);
  return `
    <div style="margin-bottom:14px;">
      ${host.teamNames.map((tn,ti)=>`
        <div class="team-config-row">
          <span class="team-tag team-${ti}">Équipe ${ti+1}</span>
          <input type="text" style="max-width:220px;" value="${tn.replace(/"/g,'&quot;')}" data-rename-team="${ti}">
          ${host.teamNames.length>2 ? `<button class="btn btn-ghost btn-sm" data-remove-team="${ti}">✕</button>` : ""}
        </div>
      `).join("")}
      ${host.teamNames.length<4 ? `<button class="btn btn-ghost btn-sm" id="btnAddTeam">+ Ajouter une équipe</button>` : ""}
    </div>
    <div style="margin-bottom:22px;">
      ${playerNames.length === 0 ? `<p class="status-banner" style="text-align:left;">Les joueurs pourront être assignés à une équipe une fois connectés.</p>` : ""}
      ${playerNames.map(n => `
        <div class="team-assign-row">
          <span class="scribble" style="margin-right:6px;">${n} :</span>
          ${host.teamNames.map((tn,ti)=>`
            <button class="btn btn-sm ${host.playerTeams[n]===ti ? 'btn-gold' : 'btn-ghost'}" data-action="assign-team" data-name="${escAttr(n)}" data-idx="${ti}">${tn}</button>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `;
}
function toggleTeamMode(){ host.teamMode = !host.teamMode; render(); }
function bindTeamConfigHandlers(){
  app.querySelectorAll("[data-rename-team]").forEach(inp => inp.addEventListener("input", () => renameTeam(parseInt(inp.dataset.renameTeam,10), inp.value)));
  app.querySelectorAll("[data-remove-team]").forEach(b => b.addEventListener("click", () => removeTeamAt(parseInt(b.dataset.removeTeam,10))));
  const addBtn = app.querySelector("#btnAddTeam");
  if(addBtn) addBtn.addEventListener("click", addTeam);
}
function renameTeam(idx, value){ host.teamNames[idx] = value || ("Équipe " + (idx+1)); }
function addTeam(){ if(host.teamNames.length < 4){ host.teamNames.push("Équipe " + (host.teamNames.length+1)); render(); } }
function removeTeamAt(idx){
  if(host.teamNames.length <= 2) return;
  host.teamNames.splice(idx,1);
  Object.keys(host.playerTeams).forEach(n=>{
    if(host.playerTeams[n] === idx) delete host.playerTeams[n];
    else if(host.playerTeams[n] > idx) host.playerTeams[n]--;
  });
  render();
}
function assignTeam(name, idx){ host.playerTeams[name] = idx; render(); }

function renderHandicapConfigHtml(){
  const playerNames = Object.keys(host.players);
  if(playerNames.length === 0){
    return `<p class="status-banner" style="text-align:left;margin-bottom:22px;">Les handicaps des joueurs apparaîtront ici une fois qu'ils t'auront rejoint.</p>`;
  }
  return `
    <div style="margin-bottom:22px;">
      ${playerNames.map(n => `
        <div class="team-assign-row">
          <span class="scribble" style="margin-right:6px;">${n} :</span>
          ${HANDICAP_LEVELS.map(s => `
            <button class="btn btn-sm ${((host.playerHandicaps[n]||0)===s) ? 'btn-gold' : 'btn-ghost'}" data-action="set-handicap" data-name="${escAttr(n)}" data-sec="${s}">${s===0?"Aucun":s+"s"}</button>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `;
}
function setHandicap(name, seconds){ host.playerHandicaps[name] = seconds; render(); }
function setHostOwnHandicap(seconds){ host.hostHandicap = seconds; render(); }
function toggleEliminationMode(){ host.eliminationMode = !host.eliminationMode; render(); }
function toggleTournamentMode(){ host.tournamentMode = !host.tournamentMode; render(); }
function setTournamentRounds(n){ host.tournamentRounds = n; render(); }
function toggleJokerEnabled(){ host.jokerEnabled = !host.jokerEnabled; render(); }
function toggleHostPlays(){ host.hostPlaysToo = !host.hostPlaysToo; render(); }

const THEME_GROUPS = {
  "Culture & savoirs": ["Culture générale piégeuse","Sciences & corps humain","Espace & astronomie","Histoire de France"],
  "Pop culture & fandoms": ["Pop culture & écrans","Cinéma","Séries Netflix","Disney","Marvel & super-héros","Harry Potter","Dragon Ball Z","Jeux vidéo","L'Attaque des Titans"],
  "Ambiance & détente": ["Blagues & absurde","Sport","Stars Instagram & réseaux sociaux"],
  "Spécial": ["Pompiers & secours"]
};
function groupForCategory(cat){
  if(categoryGroupOverrides[cat]) return categoryGroupOverrides[cat];
  for(const [group, list] of Object.entries(THEME_GROUPS)){
    if(list.includes(cat)) return group;
  }
  return "Autres";
}
function computeGroupOrder(){
  const present = new Set(CATEGORIES.map(c => groupForCategory(c)));
  const ordered = Object.keys(THEME_GROUPS).filter(g => present.has(g));
  present.forEach(g => { if(!ordered.includes(g) && g !== "Autres") ordered.push(g); });
  if(present.has("Autres")) ordered.push("Autres");
  return ordered;
}
function renderHostThemeRow(){
  if(!host.catsInitialized){ host.selectedCats = [...CATEGORIES]; host.catsInitialized = true; }
  const row = document.getElementById("themeRow");
  const groupOrder = computeGroupOrder();
  const byGroup = {};
  CATEGORIES.forEach(c => {
    const g = groupForCategory(c);
    if(!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(c);
  });
  let html = `<div class="btn-row" style="margin-bottom:14px;">
    <button class="btn btn-gold btn-sm" data-action="select-all-themes">✅ Tout cocher</button>
    <button class="btn btn-ghost btn-sm" data-action="deselect-all-themes">⬜ Tout décocher</button>
  </div>`;
  groupOrder.forEach(g => {
    if(!byGroup[g] || byGroup[g].length === 0) return;
    const allChecked = byGroup[g].every(c => host.selectedCats.includes(c));
    html += `
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
          <span style="font-size:13px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${g}</span>
          <button class="btn btn-ghost btn-sm" data-action="toggle-group" data-group="${escAttr(g)}">${allChecked ? 'Décocher le groupe' : 'Cocher le groupe'}</button>
        </div>
        <div class="btn-row">
          ${byGroup[g].map(c => `
            <button class="btn ${host.selectedCats.includes(c) ? 'btn-gold' : 'btn-ghost'}" data-action="toggle-theme" data-cat="${escAttr(c)}" style="flex:1;min-width:140px;font-size:14px;">
              ${c}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  });
  row.innerHTML = html;
  row.addEventListener("click", handleThemeRowClick);
  updateStartBtnState();
  bindTeamConfigHandlers();
}
function handleThemeRowClick(e){
  const themeBtn = e.target.closest('[data-action="toggle-theme"]');
  if(themeBtn){ toggleTheme(themeBtn.dataset.cat); return; }
  const groupBtn = e.target.closest('[data-action="toggle-group"]');
  if(groupBtn){ toggleGroup(groupBtn.dataset.group); return; }
  const selAll = e.target.closest('[data-action="select-all-themes"]');
  if(selAll){ selectAllThemes(); return; }
  const deselAll = e.target.closest('[data-action="deselect-all-themes"]');
  if(deselAll){ deselectAllThemes(); return; }
}
function updateStartBtnState(){
  const btn = document.getElementById("startBtn");
  if(!btn) return;
  const playerNames = Object.keys(host.players);
  btn.disabled = host.selectedCats.length < 1 || (playerNames.length < 1 && !(host.hostPlaysToo && activeProfile.name));
}
function toggleTheme(cat){
  if(host.selectedCats.includes(cat)) host.selectedCats = host.selectedCats.filter(c => c !== cat);
  else host.selectedCats.push(cat);
  renderHostThemeRow();
}
function toggleGroup(group){
  const inGroup = CATEGORIES.filter(c => groupForCategory(c) === group);
  const allChecked = inGroup.every(c => host.selectedCats.includes(c));
  if(allChecked) host.selectedCats = host.selectedCats.filter(c => !inGroup.includes(c));
  else host.selectedCats = [...new Set([...host.selectedCats, ...inGroup])];
  renderHostThemeRow();
}
function deselectAllThemes(){ host.selectedCats = []; renderHostThemeRow(); }
function selectAllThemes(){ host.selectedCats = [...CATEGORIES]; renderHostThemeRow(); }
function copyJoinLink(){
  const url = location.origin + location.pathname + "#/quiz?join=" + roomCode;
  navigator.clipboard.writeText(url).then(()=>{
    const btn = document.getElementById("copyLinkBtn");
    if(btn){ const old = btn.textContent; btn.textContent = "✅ Lien copié !"; setTimeout(()=>btn.textContent = old, 1800); }
  }).catch(()=>{ prompt("Copie ce lien :", url); });
}
function renderHostFormatRow(){
  const row = document.getElementById("formatRow");
  row.innerHTML = FORMATS.map((f,i) => `
    <button class="btn ${host.formatIndex===i ? 'btn-gold' : 'btn-ghost'}" data-format="${i}" style="flex:1;min-width:110px;">
      ${f.label}<br><span style="font-size:12px;font-weight:400;opacity:0.8;">${f.total} questions · ${f.sub}</span>
    </button>
  `).join("");
  row.querySelectorAll("[data-format]").forEach(b => b.addEventListener("click", () => selectHostFormat(parseInt(b.dataset.format,10))));
}
function selectHostFormat(i){ host.formatIndex = i; renderHostFormatRow(); hostTrackRoom(); }

const DURATION_OPTIONS = [10000, 15000, 20000, 30000, 45000, 60000, 0];
function durationLabel(ms){ return ms === 0 ? "Sans chrono" : (ms/1000) + "s"; }
function renderHostDurationRow(){
  const row = document.getElementById("durationRow");
  row.innerHTML = DURATION_OPTIONS.map(ms => `
    <button class="btn ${host.questionDuration===ms ? 'btn-gold' : 'btn-ghost'}" data-duration="${ms}" style="flex:1;min-width:90px;">
      ${durationLabel(ms)}
    </button>
  `).join("");
  row.querySelectorAll("[data-duration]").forEach(b => b.addEventListener("click", () => selectHostDuration(parseInt(b.dataset.duration,10))));
}
function selectHostDuration(ms){ host.questionDuration = ms; renderHostDurationRow(); }

function hostStartGame(){
  if(host.hostPlaysToo && activeProfile.name){
    host.players[activeProfile.name] = 0;
    host.playerHandicaps[activeProfile.name] = host.hostHandicap || 0;
  }
  host.deck = buildDeck(FORMATS[host.formatIndex].total, host.selectedCats);
  host.currentIndex = 0;
  host.eliminated = [];
  host.tournamentRound = 1;
  Object.keys(host.players).forEach(n => host.players[n] = 0);
  if(host.teamMode){
    let ti = 0;
    Object.keys(host.players).forEach(n => {
      if(host.playerTeams[n] === undefined){ host.playerTeams[n] = ti % host.teamNames.length; ti++; }
    });
    host.teamScores = {};
    host.teamNames.forEach((tn,i) => host.teamScores[i] = 0);
  }
  hostUntrackRoom();
  hostSendQuestion();
}
function hostStartNextRound(){
  host.deck = buildDeck(FORMATS[host.formatIndex].total, host.selectedCats);
  host.currentIndex = 0;
  host.eliminated = [];
  hostSendQuestion();
}

function hostSendQuestion(){
  host.answers = {};
  host.ownChoiceIndex = null;
  host.lastRoundResults = {};
  host.phase = "question";
  const q = host.deck[host.currentIndex];
  host.questionStartTime = Date.now();
  send("question", {
    index: host.currentIndex, total: host.deck.length, cat: q.cat, catName: q.cat,
    q: q.q, opts: q.opts, duration: host.questionDuration, scores: {...host.players},
    eliminated: [...host.eliminated], handicaps: {...host.playerHandicaps},
    teamMode: host.teamMode, teamNames: [...host.teamNames], playerTeams: {...host.playerTeams}, teamScores: {...host.teamScores}
  });
  render();
  if(host.questionDuration > 0) startTimer(host.questionStartTime, host.questionDuration);
  if(host.hostPlaysToo && activeProfile.name){
    const myHandicap = host.playerHandicaps[activeProfile.name] || 0;
    if(myHandicap > 0) startHandicapCountdown(host.questionStartTime, myHandicap, ()=>render());
  }
  scrollTop();
}

function hostAnswerSelf(i){
  if(host.ownChoiceIndex !== null || host.phase !== "question") return;
  if(host.eliminated.includes(activeProfile.name)) return;
  const myHandicap = host.playerHandicaps[activeProfile.name] || 0;
  if(remainingHandicapMs(host.questionStartTime, myHandicap) > 0) return;
  host.ownChoiceIndex = i;
  const elapsed = Date.now() - host.questionStartTime;
  host.answers[activeProfile.name] = { name: activeProfile.name, optionIndex: i, elapsed };
  soundAnswer();
  render();
}

function onHostReceiveAnswer(payload){
  if(host.phase !== "question") return;
  if(host.eliminated.includes(payload.name)) return;
  if(host.answers[payload.name] !== undefined) return; // une seule réponse comptée
  host.answers[payload.name] = payload;
  updateAnsweredCounterDOM();
}
function updateAnsweredCounterDOM(){
  const el = document.getElementById("answeredCounter");
  if(!el){ render(); return; }
  const activeNames = Object.keys(host.players).filter(n => !host.eliminated.includes(n));
  const answeredCount = Object.keys(host.answers).length;
  const totalActive = activeNames.length;
  el.innerHTML = `<span class="pulse-dot"></span>${answeredCount} / ${totalActive} joueur${totalActive>1?'s':''} actif${totalActive>1?'s':''} ont répondu`;
}

function hostSendSync(){
  if(host.phase === "lobby") return;
  const base = { phase: host.phase };
  if(host.phase === "question" || host.phase === "reveal"){
    const q = host.deck[host.currentIndex];
    base.question = {
      index: host.currentIndex, total: host.deck.length, cat: q.cat, catName: q.cat,
      q: q.q, opts: q.opts, duration: host.questionDuration, scores: {...host.players},
      eliminated: [...host.eliminated], handicaps: {...host.playerHandicaps},
      teamMode: host.teamMode, teamNames: [...host.teamNames], playerTeams: {...host.playerTeams}, teamScores: {...host.teamScores}
    };
  }
  if(host.phase === "reveal"){
    const q = host.deck[host.currentIndex];
    base.reveal = {
      correct: q.correct, fact: q.fact, scores: {...host.players}, results: {...host.answers},
      teamMode: host.teamMode, teamNames: [...host.teamNames], playerTeams: {...host.playerTeams}, teamScores: {...host.teamScores}
    };
  }
  if(host.phase === "end"){
    base.end = { scores: {...host.players}, teamMode: host.teamMode, teamNames: [...host.teamNames], teamScores: {...host.teamScores} };
  }
  send("sync", base);
}

function renderHostGame(){
  const q = host.deck[host.currentIndex];
  const activeNames = Object.keys(host.players).filter(n => !host.eliminated.includes(n));
  const answeredCount = Object.keys(host.answers).length;
  const totalActive = activeNames.length;
  const revealed = host.phase === "reveal";
  const myHandicap = host.hostPlaysToo ? (host.playerHandicaps[activeProfile.name] || 0) : 0;
  const hostHandicapRemaining = revealed ? 0 : remainingHandicapMs(host.questionStartTime, myHandicap);
  const hostCanClick = host.hostPlaysToo && activeProfile.name && host.ownChoiceIndex === null && !revealed && !host.eliminated.includes(activeProfile.name) && hostHandicapRemaining <= 0;
  const hostIsEliminated = host.hostPlaysToo && host.eliminated.includes(activeProfile.name);
  app.innerHTML = `
    <div class="topbar"><div class="brand">🐼 <span>${q.cat}</span></div>
      <div class="round-badge">Question ${host.currentIndex+1} / ${host.deck.length}</div>
    </div>
    <div class="stage">
      <span class="category-tag">${q.cat}</span>
      ${!revealed && host.questionDuration > 0 ? `<div class="timer-bar"><div class="timer-fill" id="timerFill"></div></div>
      <div class="status-banner" id="timerLabel" style="margin-bottom:14px;"></div>` : ""}
      ${hostHandicapRemaining > 0 ? `<div class="status-banner" id="handicapCountdown" style="margin-bottom:14px;"></div>` : ""}
      <p class="question-text">${q.q}</p>
      <div class="answer-grid">
        ${q.opts.map((opt,i)=>{
          const isCorrectReveal = revealed && i===q.correct;
          const isWrongReveal = revealed && i!==q.correct;
          const isOwnChoice = host.ownChoiceIndex === i;
          const isChosenWrong = revealed && isOwnChoice && i!==q.correct;
          const cls = `${isCorrectReveal?'correctReveal':''} ${isWrongReveal?'wrongReveal':''} ${isChosenWrong?'chosenWrong':''}`;
          if((hostCanClick || (host.hostPlaysToo && activeProfile.name)) && !hostIsEliminated){
            return `
              <button class="answer-btn ${ANSWER_CLASSES[i]} ${isOwnChoice?'chosen':''} ${cls}" data-answer="${i}"
                ${hostCanClick ? '' : 'disabled'}>
                <span class="letter">${String.fromCharCode(65+i)}</span> ${opt}
              </button>
            `;
          }
          return `
            <div class="answer-btn ${ANSWER_CLASSES[i]} ${cls}" style="cursor:default;">
              <span class="letter">${String.fromCharCode(65+i)}</span> ${opt}
            </div>
          `;
        }).join("")}
      </div>
      ${hostIsEliminated ? `<div class="status-banner">☠️ Tu es éliminé — tu continues en spectateur.</div>` : ""}
      ${host.hostPlaysToo && activeProfile.name && host.ownChoiceIndex!==null && !revealed && !hostIsEliminated
        ? `<div class="status-banner">✅ Ta réponse est enregistrée, ${activeProfile.name}</div>` : ""}
      ${revealed ? `<div class="funfact">💡 ${q.fact}</div>` : `
        <div class="status-banner" id="answeredCounter"><span class="pulse-dot"></span>${answeredCount} / ${totalActive} joueur${totalActive>1?'s':''} actif${totalActive>1?'s':''} ont répondu</div>
      `}
      <div class="stage-actions">
        ${!revealed
          ? `<button class="btn btn-gold" id="btnReveal">Révéler la réponse 🔍</button>`
          : `<button class="btn btn-primary" id="btnNext">${host.currentIndex+1 >= host.deck.length ? "Voir le classement final 🏆" : "Question suivante ➜"}</button>`
        }
        <button class="btn btn-ghost btn-sm" id="flagBtn" ${q.flaggedThisSession ? 'disabled' : ''}>${q.flaggedThisSession ? '✅ Signalée' : '🚩 Signaler une erreur'}</button>
      </div>
    </div>
    ${revealed && host.eliminationMode && host.lastEliminatedName ? `
      <div class="card" style="margin-top:16px;padding:20px;text-align:center;">
        <div style="font-size:36px;">☠️</div>
        <h3 style="margin:6px 0 0;">${host.lastEliminatedName} est éliminé(e) !</h3>
      </div>
    ` : ""}
    ${revealed ? `
      <div class="scoreboard">
        <h3>Résultats de la question</h3>
        <div class="player-cards">
          ${Object.entries(host.players).sort((a,b)=>b[1]-a[1]).map(([name]) => {
            const r = host.lastRoundResults[name];
            const icon = host.eliminated.includes(name) ? "☠️" : (!r ? "😴" : r.correct ? "✅" : "❌");
            const ptsLabel = r ? `+${r.points}` : "+0";
            return `<div class="player-card ${host.eliminated.includes(name)?'eliminated':''}"><div class="name">${icon} ${name}</div><div class="score" style="font-size:18px;">${ptsLabel}</div></div>`;
          }).join("")}
        </div>
      </div>
    ` : ""}
    ${host.teamMode ? `
      <div class="scoreboard">
        <h3>Scores par équipe</h3>
        <div class="player-cards">
          ${host.teamNames.map((tn,ti) => `
            <div class="player-card"><div class="name"><span class="team-tag team-${ti}">${tn}</span></div><div class="score">${host.teamScores[ti]||0}</div></div>
          `).join("")}
        </div>
      </div>
    ` : ""}
    <div class="scoreboard">
      <h3>Scores individuels</h3>
      <div class="player-cards">
        ${Object.entries(host.players).sort((a,b)=>b[1]-a[1]).map(([name,score]) => `
          <div class="player-card ${host.eliminated.includes(name)?'eliminated':''}">
            <div class="name">${host.eliminated.includes(name)?'☠️ ':''}${name}${host.teamMode && host.playerTeams[name]!==undefined ? `<br><span class="team-tag team-${host.playerTeams[name]}">${host.teamNames[host.playerTeams[name]]}</span>` : ''}</div>
            <div class="score">${score}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  app.querySelectorAll("[data-answer]").forEach(b => b.addEventListener("click", () => hostAnswerSelf(parseInt(b.dataset.answer,10))));
  const revealBtn = app.querySelector("#btnReveal");
  if(revealBtn) revealBtn.addEventListener("click", hostReveal);
  const nextBtn = app.querySelector("#btnNext");
  if(nextBtn) nextBtn.addEventListener("click", hostNext);
  app.querySelector("#flagBtn").addEventListener("click", flagCurrentHostQuestion);
}

async function flagCurrentHostQuestion(){
  const q = host.deck[host.currentIndex];
  if(!q.id || q.flaggedThisSession) return;
  q.flaggedThisSession = true;
  const btn = document.getElementById("flagBtn");
  if(btn){ btn.disabled = true; btn.textContent = "✅ Signalée"; }
  try{
    await supabaseClient.from("questions").update({ flagged: true }).eq("id", q.id);
  }catch(e){ /* si ça échoue, la question reste marquée localement pour cette session */ }
}
function hostReveal(){
  const q = host.deck[host.currentIndex];
  host.phase = "reveal";
  stopTimer();
  stopHandicapCountdown();
  soundReveal();
  host.lastRoundResults = {};
  Object.entries(host.answers).forEach(([name, a]) => {
    const isCorrect = a.optionIndex === q.correct;
    const pts = isCorrect ? Math.round(1000 - Math.min(a.elapsed, 9000)/9000*500) : 0;
    host.players[name] = (host.players[name]||0) + pts;
    host.lastRoundResults[name] = { correct: isCorrect, points: pts, optionIndex: a.optionIndex };
    if(host.teamMode && host.playerTeams[name] !== undefined){
      const ti = host.playerTeams[name];
      host.teamScores[ti] = (host.teamScores[ti]||0) + pts;
    }
  });
  host.lastEliminatedName = null;
  if(host.eliminationMode && host.currentIndex >= 1){
    const active = Object.keys(host.players).filter(n => !host.eliminated.includes(n));
    if(active.length > 1){
      let minName = active[0];
      active.forEach(n => { if((host.players[n]||0) < (host.players[minName]||0)) minName = n; });
      host.eliminated.push(minName);
      host.lastEliminatedName = minName;
      soundEliminated();
    }
  }
  send("reveal", {
    correct: q.correct, fact: q.fact, scores: {...host.players}, results: {...host.answers},
    eliminated: [...host.eliminated], justEliminated: host.lastEliminatedName,
    teamMode: host.teamMode, teamNames: [...host.teamNames], playerTeams: {...host.playerTeams}, teamScores: {...host.teamScores}
  });
  render();
}

function hostNext(){
  if(host.currentIndex+1 >= host.deck.length){
    if(host.tournamentMode && host.tournamentRound < host.tournamentRounds){
      host.phase = "roundEnd";
      send("roundEnd", {
        scores: {...host.players}, round: host.tournamentRound, totalRounds: host.tournamentRounds,
        teamMode: host.teamMode, teamNames: [...host.teamNames], teamScores: {...host.teamScores}
      });
      host.tournamentRound++;
      render();
      scrollTop();
      return;
    }
    host.phase = "end";
    send("end", { scores: {...host.players}, teamMode: host.teamMode, teamNames: [...host.teamNames], teamScores: {...host.teamScores} });
    saveHostHistoryIfRegistered();
    render();
    scrollTop();
    setTimeout(()=>{ soundFanfare(); burstConfetti(160); }, 200);
    return;
  }
  host.currentIndex++;
  hostSendQuestion();
}
function saveHostHistoryIfRegistered(){
  if(!host.hostPlaysToo || activeProfile.isGuest || !activeProfile.name) return;
  const name = activeProfile.name;
  const scoresForRank = host.teamMode ? teamScoresAsMap() : host.players;
  const rankInfo = computeRank(scoresForRank, host.teamMode ? (host.teamNames[host.playerTeams[name]] || name) : name);
  supabaseClient.from("game_history").insert({
    profile_name: name,
    score: host.players[name] || 0,
    rank: rankInfo ? rankInfo.rank : null,
    total_players: rankInfo ? rankInfo.total : null,
    room_code: roomCode,
    mode: "multi",
    game: "Quiz de la Tribu"
  }).then(({error}) => { if(error) console.warn("Historique hôte non enregistré :", error.message); });
}

function teamScoresAsMap(){
  const m = {};
  host.teamNames.forEach((tn,i) => m[tn] = host.teamScores[i] || 0);
  return m;
}
function renderHostEnd(){
  const scoresForPodium = host.teamMode ? teamScoresAsMap() : host.players;
  renderPodiumScreen(scoresForPodium, hostRestart, leaveToRoleSelect);
}
function hostRestart(){
  host.phase = "lobby"; host.deck = []; host.currentIndex = 0; host.eliminated = [];
  Object.keys(host.players).forEach(n => host.players[n] = 0);
  if(host.teamMode) host.teamNames.forEach((tn,i) => host.teamScores[i] = 0);
  render();
  hostTrackRoom();
}

/* ================= PLAYER ================= */
function renderPlayerScreen(){
  if(player.phase === "join") renderJoinForm();
  else if(player.phase === "waiting") renderPlayerWaiting();
  else if(player.phase === "question") renderPlayerQuestion();
  else if(player.phase === "reveal") renderPlayerReveal();
  else if(player.phase === "end") renderPlayerEnd();
}

function renderJoinForm(){
  const prefilledCode = pendingJoinCode || "";
  app.innerHTML = `
    <div class="card">
      <h1 class="setup-title">Salut ${escAttr(activeProfile.name)} !</h1>
      <div id="openRoomsArea"></div>
      <label class="field-label">Code de la partie</label>
      <input type="text" class="code-input" id="codeInput" maxlength="4" placeholder="ABCD" value="${prefilledCode}">
      <label class="field-label">Ton handicap (optionnel)</label>
      <p class="status-banner" style="text-align:left;margin:0 0 10px;">Un délai avant de pouvoir répondre — pratique pour handicaper les grands et donner un coup de pouce aux plus jeunes !</p>
      <div class="btn-row" id="handicapSelectRow" style="margin-bottom:22px;"></div>
      <div class="btn-row">
        <button class="btn btn-primary btn-block" id="btnJoin">Rejoindre 🚀</button>
      </div>
    </div>
  `;
  renderHandicapSelectRow();
  setupOpenRoomsListener();
  renderOpenRoomsArea();
  app.querySelector("#btnJoin").addEventListener("click", playerJoin);
}
function renderHandicapSelectRow(){
  const row = document.getElementById("handicapSelectRow");
  if(!row) return;
  row.innerHTML = HANDICAP_LEVELS.map(s => `
    <button class="btn btn-sm ${joinHandicapSeconds===s ? 'btn-gold' : 'btn-ghost'}" data-sec="${s}">${s===0 ? "Aucun" : s+"s"}</button>
  `).join("");
  row.querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => { joinHandicapSeconds = parseInt(b.dataset.sec,10); renderHandicapSelectRow(); }));
}
function playerJoin(){
  const code = document.getElementById("codeInput").value.trim().toUpperCase();
  if(code.length !== 4) return;
  player.isRegistered = !activeProfile.isGuest;
  doPlayerJoin(activeProfile.name, code, joinHandicapSeconds);
}
function doPlayerJoin(name, code, handicap){
  closeDirectoryChannel();
  localStorage.setItem("fdo_quiz_active_session", JSON.stringify({ name, code, ts: Date.now() }));
  player.name = name; player.roomCode = code; player.score = 0; player.myJoinHandicap = handicap || 0;
  subscribeChannel(code, {
    question: (payload) => onPlayerReceiveQuestion(payload),
    reveal: (payload) => onPlayerReceiveReveal(payload),
    end: (payload) => onPlayerReceiveEnd(payload),
    sync: (payload) => onPlayerReceiveSync(payload)
  });
  setTimeout(() => send("join", { name, handicap: handicap || 0 }), 400);
  player.phase = "waiting";
  installLobbyBackGuard();
  render();
}

function renderPlayerWaiting(){
  app.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:50px;margin-bottom:10px;">⏳</div>
      <h1 class="setup-title">En attente du lancement…</h1>
      <p class="setup-sub">L'hôte va bientôt démarrer la partie. Garde ton téléphone sous les yeux !</p>
      <button class="btn btn-ghost" id="leaveWaitingBtn" style="margin-top:18px;">‹ Quitter le salon</button>
    </div>
  `;
  app.querySelector("#leaveWaitingBtn").addEventListener("click", leaveToRoleSelect);
}

function onPlayerReceiveQuestion(payload){
  player.currentQuestion = payload;
  player.chosenIndex = null;
  player.lastKnownScores = payload.scores || {};
  player.eliminated = (payload.eliminated || []).includes(player.name);
  player.currentHandicap = payload.handicaps ? (payload.handicaps[player.name] || 0) : 0;
  player.phase = "question";
  player.questionReceivedAt = Date.now();
  render();
  if(!player.eliminated){
    if(payload.duration > 0) startTimer(player.questionReceivedAt, payload.duration);
    if(player.currentHandicap > 0) startHandicapCountdown(player.questionReceivedAt, player.currentHandicap, ()=>render());
  }
  scrollTop();
}
function playerAnswer(i){
  if(player.chosenIndex !== null || player.eliminated) return;
  if(remainingHandicapMs(player.questionReceivedAt, player.currentHandicap) > 0) return;
  player.chosenIndex = i;
  soundAnswer();
  const elapsed = Date.now() - player.questionReceivedAt;
  send("answer", { name: player.name, optionIndex: i, elapsed });
  render();
}
function renderPlayerQuestion(){
  const q = player.currentQuestion;
  const locked = player.chosenIndex !== null;
  const rank = computeRank(player.lastKnownScores, player.name);
  const myTeamIdx = q.teamMode && q.playerTeams ? q.playerTeams[player.name] : undefined;
  const handicapRemaining = remainingHandicapMs(player.questionReceivedAt, player.currentHandicap);
  app.innerHTML = `
    <div class="topbar"><div class="brand">🐼 <span>${q.catName}</span></div>
      <div class="round-badge">Q ${q.index+1}/${q.total}</div></div>
    ${rank ? `<div class="rank-badge">📊 Tu es ${rank.rank}ᵉ / ${rank.total}</div>` : ""}
    ${q.teamMode && myTeamIdx!==undefined ? `<div class="rank-badge team-${myTeamIdx}" style="border-color:transparent;">👥 ${q.teamNames[myTeamIdx]} — ${q.teamScores[myTeamIdx]||0} pts</div>` : ""}
    ${player.eliminated ? `
      <div class="card" style="text-align:center;">
        <div style="font-size:50px;">☠️</div>
        <h1 class="setup-title">Tu es éliminé(e)</h1>
        <p class="setup-sub">Regarde la suite sur l'écran principal — merci d'avoir joué !</p>
      </div>
    ` : `
      <div class="stage">
        ${q.duration > 0 ? `<div class="timer-bar"><div class="timer-fill" id="timerFill"></div></div>
        <div class="status-banner" id="timerLabel" style="margin-bottom:14px;"></div>` : ""}
        ${handicapRemaining > 0 ? `<div class="status-banner" id="handicapCountdown" style="margin-bottom:14px;"></div>` : ""}
        <p class="question-text">${q.q}</p>
        <div class="answer-grid">
          ${q.opts.map((opt,i)=>`
            <button class="answer-btn ${ANSWER_CLASSES[i]} ${player.chosenIndex===i?'chosen':''}" data-answer="${i}" ${(locked||handicapRemaining>0)?'disabled':''}>
              <span class="letter">${String.fromCharCode(65+i)}</span> ${opt}
            </button>
          `).join("")}
        </div>
        ${locked ? `<div class="status-banner">✅ Réponse envoyée, en attente des autres joueurs…</div>` : ""}
      </div>
    `}
  `;
  app.querySelectorAll("[data-answer]").forEach(b => b.addEventListener("click", () => playerAnswer(parseInt(b.dataset.answer,10))));
}

function onPlayerReceiveReveal(payload){
  stopTimer();
  stopHandicapCountdown();
  const mine = payload.results ? payload.results[player.name] : null;
  const wasCorrect = mine ? mine.optionIndex === payload.correct : false;
  const pointsThisRound = payload.scores[player.name] !== undefined ? payload.scores[player.name] - player.score : 0;
  player.score = payload.scores[player.name] !== undefined ? payload.scores[player.name] : player.score;
  player.lastKnownScores = payload.scores || player.lastKnownScores;
  const justGotEliminated = payload.justEliminated === player.name;
  player.eliminated = (payload.eliminated || []).includes(player.name);
  player.lastResult = {
    wasCorrect, pointsThisRound, correctIndex: payload.correct, fact: payload.fact, answered: !!mine,
    justEliminated: justGotEliminated,
    teamMode: payload.teamMode, teamNames: payload.teamNames, teamScores: payload.teamScores,
    myTeamIdx: payload.teamMode && payload.playerTeams ? payload.playerTeams[player.name] : undefined
  };
  player.phase = "reveal";
  render();
  if(justGotEliminated) soundEliminated();
  scrollTop();
}
function renderPlayerReveal(){
  const r = player.lastResult;
  const q = player.currentQuestion;
  const rank = computeRank(player.lastKnownScores, player.name);
  app.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:56px;margin-bottom:6px;">${r.justEliminated ? "☠️" : !r.answered ? "😴" : r.wasCorrect ? "🎉" : "😬"}</div>
      <h1 class="setup-title">${r.justEliminated ? "Tu es éliminé(e) !" : !r.answered ? "Pas de réponse envoyée" : r.wasCorrect ? "Bonne réponse !" : "Raté cette fois"}</h1>
      <p class="setup-sub">${r.answered ? `+${r.pointsThisRound} points ce tour` : "0 point ce tour"} · Score total : <strong style="color:var(--gold);">${player.score}</strong></p>
      ${rank ? `<div class="rank-badge">📊 Tu es ${rank.rank}ᵉ / ${rank.total}</div>` : ""}
      ${r.teamMode && r.myTeamIdx!==undefined ? `<div class="rank-badge team-${r.myTeamIdx}" style="border-color:transparent;display:block;margin-top:8px;">👥 ${r.teamNames[r.myTeamIdx]} — ${r.teamScores[r.myTeamIdx]||0} pts</div>` : ""}
    </div>
    <div class="stage" style="margin-top:16px;">
      <p class="question-text" style="font-size:18px;">${q ? q.q : ""}</p>
      <div class="answer-grid">
        ${q ? q.opts.map((opt,i)=>{
          const isCorrectReveal = i===r.correctIndex;
          const isWrongReveal = i!==r.correctIndex;
          const isChosenWrong = player.chosenIndex===i && i!==r.correctIndex;
          return `
          <div class="answer-btn ${ANSWER_CLASSES[i]} ${isCorrectReveal?'correctReveal':''} ${isWrongReveal?'wrongReveal':''} ${isChosenWrong?'chosenWrong':''}" style="cursor:default;position:relative;">
            <span class="letter">${String.fromCharCode(65+i)}</span> ${opt}
            ${player.chosenIndex===i ? '<span style="position:absolute;right:12px;">👈 toi</span>' : ''}
          </div>
        `;
        }).join("") : ""}
      </div>
      <div class="funfact">💡 ${r.fact}</div>
    </div>
    <p class="status-banner" style="margin-top:14px;">${player.eliminated ? "Tu peux suivre la suite en spectateur…" : "En attente de la question suivante…"}</p>
  `;
}

function onPlayerReceiveEnd(payload){
  player.finalScores = payload.scores;
  player.finalTeamInfo = payload.teamMode ? { teamMode:true, teamNames:payload.teamNames, teamScores:payload.teamScores } : null;
  player.phase = "end";
  localStorage.removeItem("fdo_quiz_active_session");
  saveHistoryIfRegistered(payload.scores);
  render();
  scrollTop();
  setTimeout(()=>{ soundFanfare(); burstConfetti(160); }, 200);
}
function saveHistoryIfRegistered(finalScores){
  if(!player.isRegistered) return;
  const rankInfo = computeRank(finalScores, player.name);
  supabaseClient.from("game_history").insert({
    profile_name: player.name,
    score: finalScores[player.name] !== undefined ? finalScores[player.name] : player.score,
    rank: rankInfo ? rankInfo.rank : null,
    total_players: rankInfo ? rankInfo.total : null,
    room_code: player.roomCode,
    mode: "multi",
    game: "Quiz de la Tribu"
  }).then(({error}) => { if(error) console.warn("Historique non enregistré :", error.message); });
}
function renderPlayerEnd(){
  let scoresForPodium = player.finalScores;
  if(player.finalTeamInfo && player.finalTeamInfo.teamMode){
    scoresForPodium = {};
    player.finalTeamInfo.teamNames.forEach((tn,i)=> scoresForPodium[tn] = player.finalTeamInfo.teamScores[i] || 0);
  }
  renderPodiumScreen(scoresForPodium, null, leaveToRoleSelect, player.name);
}

function onPlayerReceiveSync(payload){
  if(payload.phase === "lobby"){ player.phase = "waiting"; render(); return; }
  if(payload.phase === "question"){ onPlayerReceiveQuestion(payload.question); return; }
  if(payload.phase === "reveal"){ player.currentQuestion = payload.question; onPlayerReceiveReveal(payload.reveal); return; }
  if(payload.phase === "end"){ onPlayerReceiveEnd(payload.end); return; }
}

/* ================= SOLO ================= */
function renderSoloScreen(){
  if(solo.phase === "setup") renderSoloSetup();
  else if(solo.phase === "question") renderSoloQuestion();
  else if(solo.phase === "end") renderSoloEnd();
}

function renderSoloSetup(){
  app.innerHTML = `
    <div class="card">
      <h1 class="setup-title">Salut ${escAttr(activeProfile.name)} !</h1>
      <p class="setup-sub">Réponds à ton rythme : la bonne réponse s'affiche tout de suite après chaque question.</p>
      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Format</h3>
      <div class="btn-row" id="soloFormatRow" style="margin-bottom:26px;"></div>
      <h3 style="margin:22px 0 12px;font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Thèmes à inclure</h3>
      <div class="btn-row" id="soloThemeRow" style="margin-bottom:26px;"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="soloStartBtn">Démarrer 🎯</button>
      </div>
    </div>
  `;
  renderSoloFormatRow();
  renderSoloThemeRow();
  app.querySelector("#soloStartBtn").addEventListener("click", soloStart);
}
function renderSoloFormatRow(){
  const row = document.getElementById("soloFormatRow");
  row.innerHTML = FORMATS.map((f,i) => `
    <button class="btn ${solo.formatIndex===i ? 'btn-gold' : 'btn-ghost'}" data-format="${i}" style="flex:1;min-width:110px;">
      ${f.label}<br><span style="font-size:12px;font-weight:400;opacity:0.8;">${f.total} questions · ${f.sub}</span>
    </button>
  `).join("");
  row.querySelectorAll("[data-format]").forEach(b => b.addEventListener("click", () => { solo.formatIndex = parseInt(b.dataset.format,10); renderSoloFormatRow(); }));
}
function renderSoloThemeRow(){
  if(!solo.catsInitialized){ solo.selectedCats = [...CATEGORIES]; solo.catsInitialized = true; }
  const row = document.getElementById("soloThemeRow");
  const groupOrder = computeGroupOrder();
  const byGroup = {};
  CATEGORIES.forEach(c => {
    const g = groupForCategory(c);
    if(!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(c);
  });
  let html = `<div class="btn-row" style="margin-bottom:14px;">
    <button class="btn btn-gold btn-sm" data-action="select-all-themes">✅ Tout cocher</button>
    <button class="btn btn-ghost btn-sm" data-action="deselect-all-themes">⬜ Tout décocher</button>
  </div>`;
  groupOrder.forEach(g => {
    if(!byGroup[g] || byGroup[g].length === 0) return;
    const allChecked = byGroup[g].every(c => solo.selectedCats.includes(c));
    html += `
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
          <span style="font-size:13px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${g}</span>
          <button class="btn btn-ghost btn-sm" data-action="toggle-group" data-group="${escAttr(g)}">${allChecked ? 'Décocher le groupe' : 'Cocher le groupe'}</button>
        </div>
        <div class="btn-row">
          ${byGroup[g].map(c => `
            <button class="btn ${solo.selectedCats.includes(c) ? 'btn-gold' : 'btn-ghost'}" data-action="toggle-theme" data-cat="${escAttr(c)}" style="flex:1;min-width:140px;font-size:14px;">
              ${c}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  });
  row.innerHTML = html;
  row.addEventListener("click", handleSoloThemeRowClick);
  const btn = document.getElementById("soloStartBtn");
  if(btn) btn.disabled = solo.selectedCats.length < 1;
}
function handleSoloThemeRowClick(e){
  const themeBtn = e.target.closest('[data-action="toggle-theme"]');
  if(themeBtn){ toggleSoloTheme(themeBtn.dataset.cat); return; }
  const groupBtn = e.target.closest('[data-action="toggle-group"]');
  if(groupBtn){ toggleSoloGroup(groupBtn.dataset.group); return; }
  const selAll = e.target.closest('[data-action="select-all-themes"]');
  if(selAll){ selectAllSoloThemes(); return; }
  const deselAll = e.target.closest('[data-action="deselect-all-themes"]');
  if(deselAll){ deselectAllSoloThemes(); return; }
}
function toggleSoloTheme(cat){
  if(solo.selectedCats.includes(cat)) solo.selectedCats = solo.selectedCats.filter(c => c !== cat);
  else solo.selectedCats.push(cat);
  renderSoloThemeRow();
}
function toggleSoloGroup(group){
  const inGroup = CATEGORIES.filter(c => groupForCategory(c) === group);
  const allChecked = inGroup.every(c => solo.selectedCats.includes(c));
  if(allChecked) solo.selectedCats = solo.selectedCats.filter(c => !inGroup.includes(c));
  else solo.selectedCats = [...new Set([...solo.selectedCats, ...inGroup])];
  renderSoloThemeRow();
}
function deselectAllSoloThemes(){ solo.selectedCats = []; renderSoloThemeRow(); }
function selectAllSoloThemes(){ solo.selectedCats = [...CATEGORIES]; renderSoloThemeRow(); }
function soloStart(){
  solo.deck = buildDeck(FORMATS[solo.formatIndex].total, solo.selectedCats);
  solo.currentIndex = 0; solo.correctCount = 0; solo.history = [];
  solo.chosenIndex = null; solo.revealed = false;
  solo.phase = "question";
  render();
  scrollTop();
}

function renderSoloQuestion(){
  const q = solo.deck[solo.currentIndex];
  const answeredSoFar = solo.currentIndex + (solo.revealed ? 1 : 0);
  app.innerHTML = `
    <div class="topbar"><div class="brand">🐼 <span>${q.cat}</span></div>
      <div class="round-badge">Question ${solo.currentIndex+1} / ${solo.deck.length}</div></div>
    <div class="stage">
      <span class="category-tag">${q.cat}</span>
      <p class="question-text">${q.q}</p>
      <div class="answer-grid">
        ${q.opts.map((opt,i)=>{
          const isCorrectReveal = solo.revealed && i===q.correct;
          const isWrongReveal = solo.revealed && i!==q.correct;
          const isChosenWrong = solo.revealed && solo.chosenIndex===i && i!==q.correct;
          const cls = `${isCorrectReveal?'correctReveal':''} ${isWrongReveal?'wrongReveal':''} ${isChosenWrong?'chosenWrong':''}`;
          if(!solo.revealed){
            return `
              <button class="answer-btn ${ANSWER_CLASSES[i]} ${cls}" data-answer="${i}">
                <span class="letter">${String.fromCharCode(65+i)}</span> ${opt}
              </button>
            `;
          }
          return `
            <div class="answer-btn ${ANSWER_CLASSES[i]} ${solo.chosenIndex===i?'chosen':''} ${cls}" style="cursor:default;">
              <span class="letter">${String.fromCharCode(65+i)}</span> ${opt}
            </div>
          `;
        }).join("")}
      </div>
      ${solo.revealed ? `<div class="funfact">💡 ${q.fact}</div>` : ""}
      <div class="stage-actions">
        <div class="status-banner">Score : ${solo.correctCount} / ${answeredSoFar} bonne${solo.correctCount>1?'s':''} réponse${solo.correctCount>1?'s':''}</div>
        ${solo.revealed ? `<button class="btn btn-primary" id="soloNextBtn">${solo.currentIndex+1 >= solo.deck.length ? "Voir mon bilan 🏁" : "Question suivante ➜"}</button>` : ""}
        <button class="btn btn-ghost btn-sm" id="soloFlagBtn" ${q.flaggedThisSession ? 'disabled' : ''}>${q.flaggedThisSession ? '✅ Signalée' : '🚩 Signaler une erreur'}</button>
      </div>
    </div>
  `;
  app.querySelectorAll("[data-answer]").forEach(b => b.addEventListener("click", () => soloAnswer(parseInt(b.dataset.answer,10))));
  const nextBtn = app.querySelector("#soloNextBtn");
  if(nextBtn) nextBtn.addEventListener("click", soloNext);
  app.querySelector("#soloFlagBtn").addEventListener("click", flagCurrentSoloQuestion);
}
async function flagCurrentSoloQuestion(){
  const q = solo.deck[solo.currentIndex];
  if(!q.id || q.flaggedThisSession) return;
  q.flaggedThisSession = true;
  const btn = document.getElementById("soloFlagBtn");
  if(btn){ btn.disabled = true; btn.textContent = "✅ Signalée"; }
  try{
    await supabaseClient.from("questions").update({ flagged: true }).eq("id", q.id);
  }catch(e){ /* si ça échoue, la question reste marquée localement pour cette session */ }
}
function soloAnswer(i){
  if(solo.revealed) return;
  const q = solo.deck[solo.currentIndex];
  solo.chosenIndex = i;
  solo.revealed = true;
  const isCorrect = i === q.correct;
  if(isCorrect) solo.correctCount++;
  solo.history.push({ q: q.q, opts: q.opts, correct: q.correct, chosen: i, wasCorrect: isCorrect, fact: q.fact });
  soundReveal();
  render();
  scrollTop();
}
function soloNext(){
  if(solo.currentIndex+1 >= solo.deck.length){
    solo.phase = "end";
    saveSoloHistoryIfRegistered();
    render();
    scrollTop();
    if(solo.deck.length > 0 && solo.correctCount / solo.deck.length >= 0.5){
      setTimeout(()=>{ soundFanfare(); burstConfetti(120); }, 200);
    }
    return;
  }
  solo.currentIndex++;
  solo.chosenIndex = null;
  solo.revealed = false;
  render();
  scrollTop();
}
function saveSoloHistoryIfRegistered(){
  if(activeProfile.isGuest) return;
  supabaseClient.from("game_history").insert({
    profile_name: activeProfile.name,
    score: solo.correctCount,
    total_questions: solo.deck.length,
    mode: "solo",
    game: "Quiz de la Tribu"
  }).then(({error}) => { if(error) console.warn("Historique solo non enregistré :", error.message); });
}

function renderSoloEnd(){
  const total = solo.deck.length;
  const pct = total > 0 ? Math.round(100 * solo.correctCount / total) : 0;
  const missed = solo.history.filter(h => !h.wasCorrect);
  app.innerHTML = `
    <div class="end-card">
      <h1 class="end-title">${pct>=80 ? "Excellent ! 🌟" : pct>=50 ? "Pas mal du tout !" : "Encore un effort !"}</h1>
      <p class="setup-sub">${solo.correctCount} / ${total} bonnes réponses (${pct}%)</p>
    </div>
    ${missed.length>0 ? `
      <div class="scoreboard">
        <h3>À revoir (${missed.length})</h3>
        ${missed.map(h => `
          <div class="card" style="padding:18px;margin-top:12px;">
            <p style="margin:0 0 8px;font-weight:700;">${h.q}</p>
            <p style="margin:0;color:var(--teal);">✅ ${h.opts[h.correct]}</p>
            <p style="margin:6px 0 0;color:var(--muted);font-size:13px;">💡 ${h.fact}</p>
          </div>
        `).join("")}
      </div>
    ` : `<div class="card" style="text-align:center;"><p class="setup-sub" style="margin:0;">Sans fautes ! 🎉</p></div>`}
    <div class="btn-row" style="justify-content:center;margin-top:26px;">
      <button class="btn btn-primary" id="soloRestartBtn">Rejouer 🔁</button>
      <button class="btn btn-ghost" id="soloHomeBtn">Retour à l'accueil 🏠</button>
    </div>
  `;
  app.querySelector("#soloRestartBtn").addEventListener("click", soloRestart);
  app.querySelector("#soloHomeBtn").addEventListener("click", leaveToRoleSelect);
}
function soloRestart(){ solo.phase = "setup"; render(); scrollTop(); }

/* ============ ÉCRAN PODIUM PARTAGÉ ============ */
function podiumItem(name, rankIndex, cls, score){
  const medals = ["🥇","🥈","🥉"];
  return `
    <div class="podium-item ${cls}">
      <div class="rank">${medals[rankIndex]}</div>
      <div class="pname">${name}</div>
      <div class="pscore">${score} pts</div>
      <div class="ptitle">${TITLES[rankIndex]}</div>
    </div>
  `;
}
function renderPodiumScreen(scores, restartFn, leaveFn, highlightName){
  const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const podium = ranked.slice(0,3);
  const [first, second, third] = podium;
  const podiumHtml = `
    ${second ? podiumItem(second[0], 1, "second", second[1]) : ""}
    ${first ? podiumItem(first[0], 0, "first", first[1]) : ""}
    ${third ? podiumItem(third[0], 2, "third", third[1]) : ""}
  `;
  const restHtml = ranked.slice(3).map(([name,score]) => `
    <div class="player-card" style="min-width:auto;">
      <div class="name">${name}${name===highlightName?' (toi)':''}</div>
      <div class="score" style="font-size:18px;">${score} pts</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${TITLES[3]}</div>
    </div>
  `).join("");
  app.innerHTML = `
    <div class="end-card">
      <h1 class="end-title">C'est plié !</h1>
      <p class="setup-sub">Merci d'avoir joué — la revanche est déjà réclamée par les perdants.</p>
      <div class="podium">${podiumHtml}</div>
      ${restHtml ? `<div class="player-cards" style="justify-content:center;">${restHtml}</div>` : ""}
      <div class="btn-row" style="justify-content:center;margin-top:26px;">
        ${restartFn ? `<button class="btn btn-primary" id="podiumRestartBtn">Nouvelle partie (même salon) 🔁</button>` : ""}
        <button class="btn btn-ghost" id="podiumLeaveBtn">Retour à l'accueil 🏠</button>
      </div>
    </div>
  `;
  if(restartFn) app.querySelector("#podiumRestartBtn").addEventListener("click", restartFn);
  app.querySelector("#podiumLeaveBtn").addEventListener("click", leaveFn);
}

/* ============ RETOUR EN ARRIÈRE (salon/lobby) ============ */
// Sans ça, le bouton retour du téléphone ferme carrément l'app quand on est
// bloqué dans le salon (aucun changement de hash pour ces écrans internes).
// On pousse une entrée d'historique en entrant dans le salon, et un appui sur
// "retour" ramène à la sélection de rôle au lieu de quitter l'app.
let lobbyBackGuardActive = false;
function onLobbyBackPressed(){
  window.removeEventListener("popstate", onLobbyBackPressed);
  lobbyBackGuardActive = false;
  leaveToRoleSelect();
}
function installLobbyBackGuard(){
  if(lobbyBackGuardActive) return;
  lobbyBackGuardActive = true;
  history.pushState({ fdoQuizLobbyGuard: true }, "");
  window.addEventListener("popstate", onLobbyBackPressed);
}
function clearLobbyBackGuard(){
  if(!lobbyBackGuardActive) return;
  window.removeEventListener("popstate", onLobbyBackPressed);
  lobbyBackGuardActive = false;
  history.back();
}

/* ============ NAVIGATION ============ */
function leaveToRoleSelect(){
  clearLobbyBackGuard();
  stopTimer();
  stopHandicapCountdown();
  if(channel){ supabaseClient.removeChannel(channel); channel = null; }
  closeDirectoryChannel();
  cancelPendingReconnect();
  lastChannelCode = null; lastChannelHandlers = null;
  connectionStatus = "connected"; updateConnectionBanner();
  localStorage.removeItem("fdo_quiz_active_session");
  role = null; roomCode = "";
  host = freshHostState();
  player = { name:"", roomCode:"", score:0, phase:"join", currentQuestion:null, chosenIndex:null, lastResult:null,
    eliminated:false, lastKnownScores:{}, finalTeamInfo:null, currentHandicap:0, myJoinHandicap:0, isRegistered:false };
  solo = freshSoloState();
  render();
  scrollTop();
}

function renderLoading(){
  app.innerHTML = `<div class="card" style="text-align:center;"><p class="setup-sub">Chargement des questions…</p></div>`;
}
function renderReconnecting(){
  app.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:50px;margin-bottom:10px;">🔄</div>
      <p class="setup-sub">On te reconnecte à ta partie en cours…</p>
    </div>
  `;
}
function renderLoadError(err){
  app.innerHTML = `
    <div class="card">
      <h1 class="setup-title">Impossible de charger les questions</h1>
      <p class="setup-sub">La table <code>questions</code> doit exister dans le projet Supabase partagé.</p>
      <div class="config-warning">Détail technique : ${err.message}</div>
    </div>
  `;
}

/* ============ POINT D'ENTRÉE ============ */
export async function mountQuiz(container){
  app = container;
  app.classList.add("quiz-screen");
  activeProfile = getActiveProfile();
  if(!activeProfile){
    // Ne devrait pas arriver (le routeur vérifie déjà), filet de sécurité.
    app.innerHTML = `<div class="card"><p class="setup-sub">Aucun profil actif.</p></div>`;
    return;
  }
  if(!initialized){
    initialized = true;
    bindDelegatedClicks();
    renderLoading();
    try{
      await loadQuestions();
      const params = new URLSearchParams(location.hash.split("?")[1] || "");
      const joinCode = params.get("join");
      if(joinCode){
        pendingJoinCode = joinCode.toUpperCase().slice(0,4);
        role = "player";
        render();
        return;
      }
      let stored = null;
      try{ stored = JSON.parse(localStorage.getItem("fdo_quiz_active_session") || "null"); }catch(e){ stored = null; }
      if(stored && stored.name === activeProfile.name && stored.code && (Date.now() - stored.ts) < RECONNECT_WINDOW_MS){
        role = "player";
        renderReconnecting();
        doPlayerJoin(stored.name, stored.code);
        return;
      }
      render();
    }catch(err){
      renderLoadError(err);
    }
  } else {
    render();
  }
}

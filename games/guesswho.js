// Qui est-ce de la Tribu — duel de déduction à distance, sur le même modèle
// que connect4.js / paires.js (salons avec code, historique partagé).
// Particularité : c'est l'adversaire humain qui répond lui-même aux
// questions (pas l'app à sa place) ; l'app connaît quand même la vraie
// fiche de son personnage mystère et détecte donc les mensonges.
import { supabase as client, SUPABASE_URL, SUPABASE_ANON_KEY, CONFIG_OK } from "../shared/supabase-client.js";
import { getActiveProfile } from "../shared/profile.js";

export const GAME_NAME = "Qui est-ce de la Tribu";

/* ============================================================
   ROSTER — 24 personnages, mêmes traits que GUESS_WHO.md
   ============================================================ */
const CHARACTERS = [
  { id:"leo",     name:"Léo",     gender:"H", hair:"brun",  length:"court", glasses:false, hat:false, facial:"barbe",     img:"01-leo.png" },
  { id:"nina",    name:"Nina",    gender:"F", hair:"blond", length:"long",  glasses:false, hat:false, facial:null,        img:"02-nina.png" },
  { id:"max",     name:"Max",     gender:"H", hair:"noir",  length:"court", glasses:true,  hat:false, facial:null,        img:"03-max.png" },
  { id:"zoe",     name:"Zoé",     gender:"F", hair:"roux",  length:"long",  glasses:true,  hat:false, facial:null,        img:"04-zoe.png" },
  { id:"tom",     name:"Tom",     gender:"H", hair:"chauve",length:null,    glasses:false, hat:false, facial:"moustache", img:"05-tom.png" },
  { id:"lea",     name:"Léa",     gender:"F", hair:"brun",  length:"court", glasses:false, hat:true,  facial:null,        img:"06-lea.png" },
  { id:"nathan",  name:"Nathan",  gender:"H", hair:"blond", length:"court", glasses:true,  hat:false, facial:null,        img:"07-nathan.png" },
  { id:"chloe",   name:"Chloé",   gender:"F", hair:"noir",  length:"long",  glasses:false, hat:false, facial:null,        img:"08-chloe.png" },
  { id:"hugo",    name:"Hugo",    gender:"H", hair:"gris",  length:"court", glasses:false, hat:true,  facial:"barbe",     img:"09-hugo.png" },
  { id:"emma",    name:"Emma",    gender:"F", hair:"blond", length:"court", glasses:true,  hat:false, facial:null,        img:"10-emma.png" },
  { id:"lucas",   name:"Lucas",   gender:"H", hair:"roux",  length:"court", glasses:false, hat:false, facial:null,        img:"11-lucas.png" },
  { id:"ines",    name:"Inès",    gender:"F", hair:"brun",  length:"long",  glasses:true,  hat:true,  facial:null,        img:"12-ines.png" },
  { id:"adam",    name:"Adam",    gender:"H", hair:"noir",  length:"long",  glasses:true,  hat:false, facial:"barbe",     img:"13-adam.png" },
  { id:"julie",   name:"Julie",   gender:"F", hair:"gris",  length:"court", glasses:false, hat:false, facial:null,        img:"14-julie.png" },
  { id:"sacha",   name:"Sacha",   gender:"H", hair:"chauve",length:null,    glasses:true,  hat:false, facial:"moustache", img:"15-sacha.png" },
  { id:"rose",    name:"Rose",    gender:"F", hair:"roux",  length:"court", glasses:false, hat:true,  facial:null,        img:"16-rose.png" },
  { id:"noah",    name:"Noah",    gender:"H", hair:"brun",  length:"long",  glasses:false, hat:false, facial:null,        img:"17-noah.png" },
  { id:"mia",     name:"Mia",     gender:"F", hair:"noir",  length:"long",  glasses:true,  hat:false, facial:null,        img:"18-mia.png" },
  { id:"gabriel", name:"Gabriel", gender:"H", hair:"blond", length:"court", glasses:false, hat:true,  facial:"barbe",     img:"19-gabriel.png" },
  { id:"alice",   name:"Alice",   gender:"F", hair:"brun",  length:"court", glasses:true,  hat:false, facial:null,        img:"20-alice.png" },
  { id:"ethan",   name:"Ethan",   gender:"H", hair:"gris",  length:"long",  glasses:false, hat:false, facial:"moustache", img:"21-ethan.png" },
  { id:"camille", name:"Camille", gender:"F", hair:"blond", length:"long",  glasses:false, hat:true,  facial:null,        img:"22-camille.png" },
  { id:"theo",    name:"Théo",    gender:"H", hair:"roux",  length:"court", glasses:true,  hat:false, facial:null,        img:"23-theo.png" },
  { id:"sarah",   name:"Sarah",   gender:"F", hair:"noir",  length:"court", glasses:false, hat:false, facial:null,        img:"24-sarah.png" }
];
const TRAITS = [
  { id:"homme",    label:"Est un homme ?",              test:c => c.gender === "H" },
  { id:"femme",    label:"Est une femme ?",              test:c => c.gender === "F" },
  { id:"blond",    label:"A les cheveux blonds ?",       test:c => c.hair === "blond" },
  { id:"brun",     label:"A les cheveux bruns ?",        test:c => c.hair === "brun" },
  { id:"roux",     label:"A les cheveux roux ?",         test:c => c.hair === "roux" },
  { id:"noir",     label:"A les cheveux noirs ?",        test:c => c.hair === "noir" },
  { id:"gris",     label:"A les cheveux gris ?",         test:c => c.hair === "gris" },
  { id:"chauve",   label:"Est chauve ?",                 test:c => c.hair === "chauve" },
  { id:"long",     label:"A les cheveux longs ?",        test:c => c.length === "long" },
  { id:"lunettes", label:"Porte des lunettes ?",         test:c => c.glasses === true },
  { id:"chapeau",  label:"Porte un chapeau ?",           test:c => c.hat === true },
  { id:"poils",    label:"A de la barbe ou une moustache ?", test:c => !!c.facial }
];
function charById(id){ return CHARACTERS.find(c => c.id === id); }
function traitById(id){ return TRAITS.find(t => t.id === id); }

/* ============ CSS spécifique (scopé à .guesswho-screen) ============ */
if (!document.getElementById("guesswho-styles")) {
  const style = document.createElement("style");
  style.id = "guesswho-styles";
  style.textContent = `
  .guesswho-screen .screen{display:none;animation:qw-fade .28s ease;}
  .guesswho-screen .screen.on{display:block;}
  @keyframes qw-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .guesswho-screen .lead{color:var(--muted);font-size:15px;line-height:1.5;margin:6px 0 20px;}
  .guesswho-screen .status{border-radius:14px;padding:12px 15px;font-size:14px;line-height:1.45;margin:14px 0;}
  .guesswho-screen .status.ok{background:rgba(61,220,151,.13);border:1px solid var(--teal);color:#c9ffe6;}
  .guesswho-screen .status.err{background:rgba(255,93,115,.13);border:1px solid var(--coral);color:#ffd7dd;}
  .guesswho-screen .status.info{background:rgba(91,141,238,.13);border:1px solid var(--blue);color:#d7e3ff;}
  .guesswho-screen .status[hidden]{display:none;}
  .guesswho-screen .hidden{display:none !important;}
  .guesswho-screen .center{text-align:center;}
  .guesswho-screen .code{font-family:'Kalam',cursive;font-weight:700;font-size:42px;letter-spacing:8px;color:var(--gold);text-align:center;margin:10px 0 4px;}
  .guesswho-screen .rooms{display:flex;flex-direction:column;gap:8px;}
  .guesswho-screen .room{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--panel-light);border:2px solid rgba(255,200,87,.4);border-radius:16px;padding:13px 15px;cursor:pointer;color:var(--text);font:inherit;transition:border-color .15s ease, transform .15s ease;}
  .guesswho-screen .room:hover{border-color:var(--gold);transform:translateY(-2px);}
  .guesswho-screen .room .rc{font-family:'Kalam',cursive;font-weight:700;font-size:22px;color:var(--gold);letter-spacing:2px;flex:0 0 auto;}
  .guesswho-screen .room .ri{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}
  .guesswho-screen .room .rh{font-family:'Baloo 2',cursive;font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .guesswho-screen .room .rt{font-size:12px;color:var(--muted);margin-top:2px;}
  .guesswho-screen .room .go{font-size:20px;flex:0 0 auto;}
  .guesswho-screen .turnbar{border-radius:16px;padding:13px 16px;margin-bottom:14px;font-family:'Baloo 2',cursive;font-weight:700;font-size:17px;text-align:center;}
  .guesswho-screen .turnbar.mine{background:rgba(61,220,151,.15);border:1px solid var(--teal);}
  .guesswho-screen .turnbar.theirs{background:rgba(184,169,217,.12);border:1px solid var(--muted);}
  .guesswho-screen .qw-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}
  @media (min-width:480px){ .guesswho-screen .qw-board{grid-template-columns:repeat(6,minmax(0,1fr));} }
  .guesswho-screen .qw-card{position:relative;border-radius:12px;overflow:hidden;background:var(--panel-light);border:2px solid rgba(255,200,87,.35);cursor:pointer;transition:transform .12s ease,opacity .12s ease;}
  .guesswho-screen .qw-card.accusable{border-color:var(--gold);}
  .guesswho-screen .qw-card:active{transform:scale(.94);}
  .guesswho-screen .qw-card .qw-portrait{position:relative;aspect-ratio:1;display:grid;place-items:center;background:var(--bg);}
  .guesswho-screen .qw-card img{width:100%;height:100%;object-fit:cover;display:block;}
  .guesswho-screen .qw-card .qw-fallback{display:none;width:100%;height:100%;align-items:center;justify-content:center;font-family:'Baloo 2',cursive;font-weight:800;font-size:26px;color:var(--gold);}
  .guesswho-screen .qw-card.img-fallback img{display:none;}
  .guesswho-screen .qw-card.img-fallback .qw-fallback{display:flex;}
  .guesswho-screen .qw-card .qw-name{font-size:11px;text-align:center;padding:3px 2px;font-weight:700;}
  .guesswho-screen .qw-card.eliminated{opacity:.28;}
  .guesswho-screen .qw-card.eliminated .qw-portrait::after{content:'✕';position:absolute;inset:0;display:grid;place-items:center;font-size:34px;color:var(--coral);font-weight:900;}
  .guesswho-screen .qw-traits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px;}
  @media (min-width:480px){ .guesswho-screen .qw-traits{grid-template-columns:repeat(3,minmax(0,1fr));} }
  .guesswho-screen .qw-trait-btn{background:var(--panel-light);border:2px solid rgba(255,200,87,.35);border-radius:14px;padding:11px 10px;font-family:'Inter',sans-serif;font-weight:600;font-size:13px;color:var(--text);cursor:pointer;text-align:left;transition:border-color .15s ease;}
  .guesswho-screen .qw-trait-btn:hover{border-color:var(--gold);}
  .guesswho-screen .qw-trait-btn:disabled{opacity:.35;cursor:default;}
  .guesswho-screen .qw-mytho{position:fixed;inset:0;background:rgba(20,4,10,.88);z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;animation:qw-pop .25s ease;}
  .guesswho-screen .qw-mytho .big{font-family:'Baloo 2',cursive;font-weight:900;font-size:clamp(48px,14vw,90px);color:var(--coral);text-shadow:0 0 24px rgba(255,93,115,.7);letter-spacing:2px;}
  .guesswho-screen .qw-mytho .small{color:var(--text);font-size:16px;text-align:center;padding:0 20px;}
  @keyframes qw-pop{from{opacity:0;transform:scale(.8);}to{opacity:1;transform:scale(1);}}
  .guesswho-screen .qw-mychar{display:flex;justify-content:center;margin-bottom:10px;}
  .guesswho-screen .qw-mychar-chip{display:flex;align-items:center;gap:8px;background:var(--panel-light);border:2px solid rgba(255,200,87,.35);border-radius:999px;padding:4px 14px 4px 4px;font-size:13px;}
  .guesswho-screen .qw-mychar-chip .qw-portrait{width:32px;height:32px;border-radius:50%;overflow:hidden;}
  .guesswho-screen .qw-mychar-chip .qw-fallback{font-size:14px;}
  .guesswho-screen .qw-answer-q{font-family:'Baloo 2',cursive;font-weight:800;font-size:clamp(22px,6vw,32px);text-align:center;margin:18px 0 26px;}
  .guesswho-screen .qw-yn{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .guesswho-screen .qw-yn button{font-family:'Baloo 2',cursive;font-weight:800;font-size:24px;padding:26px;border-radius:20px;border:none;cursor:pointer;}
  .guesswho-screen .qw-yn .yes{background:var(--teal);color:#0e2c22;}
  .guesswho-screen .qw-yn .no{background:var(--coral);color:#3a0d14;}
  @media (max-width:560px){
    .guesswho-screen .card{padding:16px 10px;}
  }
  @media (prefers-reduced-motion:reduce){ .guesswho-screen *{animation:none !important;transition:none !important;} }
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
function randomCharId(excludeId){
  const pool = excludeId ? CHARACTERS.filter(c => c.id !== excludeId) : CHARACTERS;
  return pool[Math.floor(Math.random()*pool.length)].id;
}
function myCharChipHtml(charId){
  const c = charById(charId);
  if(!c) return "";
  return '<div class="qw-mychar-chip" title="Ton personnage secret">' +
    '<div class="qw-portrait">' +
      '<img src="./guesswho-images/' + c.img + '" alt="' + escAttr(c.name) + '" onerror="this.parentElement.parentElement.classList.add(\'img-fallback\')">' +
      '<span class="qw-fallback">' + c.name.charAt(0) + '</span>' +
    '</div>' +
    '<span>Toi : <b>' + escAttr(c.name) + '</b></span>' +
  '</div>';
}
function cardHtml(c, eliminated){
  return '<div class="qw-card' + (eliminated ? " eliminated" : "") + '" data-char="' + c.id + '">' +
    '<div class="qw-portrait">' +
      '<img src="./guesswho-images/' + c.img + '" alt="' + escAttr(c.name) + '" onerror="this.parentElement.parentElement.classList.add(\'img-fallback\')">' +
      '<span class="qw-fallback">' + c.name.charAt(0) + '</span>' +
    '</div>' +
    '<div class="qw-name">' + escAttr(c.name) + '</div>' +
  '</div>';
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
  tap   : () => beep(660,.05,"square",.07),
  ask   : () => beep(500,.08,"square",.10),
  yes   : () => beep(700,.12,"triangle",.14),
  no    : () => beep(260,.14,"sine",.12),
  mytho : () => [220,180,220,180].forEach((f,i)=>setTimeout(()=>beep(f,.16,"sawtooth",.18), i*110)),
  win   : () => [392,494,587,784].forEach((f,i)=>setTimeout(()=>beep(f,.22,"triangle",.17), i*140)),
  lose  : () => [392,330,262,175].forEach((f,i)=>setTimeout(()=>beep(f,.28,"sine",.15), i*180))
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
const roomLoad  = (code) => sb("guesswho_rooms?code=eq." + encodeURIComponent(code) + "&select=*").then(r => (r && r[0]) || null);
const roomPatch = (code, body) => sb("guesswho_rooms?code=eq." + encodeURIComponent(code), { method:"PATCH", body });

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
      await sb("guesswho_rooms?code=eq." + code, { method:"DELETE" });
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
  profile      : null,
  mode         : null,      // "solo" | "multi"
  role         : null,      // "host" | "guest"
  code         : null,
  foe          : "",
  myTarget     : null,      // id du personnage que JE dois faire deviner
  foeTarget    : null,      // id du personnage que je dois deviner (connu seulement en solo, via l'IA truquée côté app)
  eliminated   : [],        // mes croix sur mon plateau
  turn         : "host",
  pendingQuestion: null,    // {by, traitId}
  lastSeenSeq  : 0,
  mySkip       : false,     // vrai si ma dernière accusation a raté : je passe mon prochain tour
  accusing     : false,
  over         : false,
  ended        : false,
  fallback     : null
};

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
    if(m === "solo"){ startSolo(); }
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
   SOLO VS IA — 100% local, l'app répond pour toi des deux côtés
   ============================================================ */
function startSolo(){
  S.mode = "solo"; S.role = "host";
  S.foe = "l'ordinateur";
  showCharacterPicker("l'ordinateur", (picked) => {
    S.myTarget = picked;                          // ce que l'IA doit deviner (toi)
    S.foeTarget = randomCharId(picked);            // ce que tu dois deviner (l'IA)
    S.eliminated = [];
    S.aiEliminated = [];
    S.turn = "host"; // tu commences
    S.pendingQuestion = null;
    S.over = false; S.ended = false;
    startGame();
  });
}

/* ============================================================
   ÉCRAN "CHOISIS TON PERSONNAGE"
   ============================================================ */
let pickCallback = null;
function showCharacterPicker(forWhomText, onPicked){
  pickCallback = onPicked;
  $("#pickForWhom").textContent = forWhomText || "l'adversaire";
  $("#qwPickBoard").innerHTML = CHARACTERS.map(c => cardHtml(c, false)).join("");
  show("pick");
}
function bindPickScreen(){
  $("#qwPickBoard").addEventListener("click", (e) => {
    const card = e.target.closest(".qw-card");
    if(!card || !pickCallback || card.dataset.char === undefined) return;
    const char = charById(card.dataset.char);
    if(!char) return;
    if(!confirm("Tu choisis " + char.name + " comme personnage mystère ?")) return;
    const cb = pickCallback;
    pickCallback = null;
    cb(char.id);
  });
}
function aiPickTrait(){
  // Choisit le trait qui coupe le plus près en deux le nombre de candidats restants.
  const remaining = CHARACTERS.filter(c => !S.aiEliminated.includes(c.id));
  let best = null, bestScore = -1;
  const askable = TRAITS.filter(t => !S.aiAsked || !S.aiAsked.includes(t.id));
  const pool = askable.length ? askable : TRAITS;
  pool.forEach(t => {
    const yes = remaining.filter(c => t.test(c)).length;
    const score = Math.min(yes, remaining.length - yes);
    if(score > bestScore){ bestScore = score; best = t; }
  });
  return best || TRAITS[0];
}
async function aiTurn(){
  if(S.over) return;
  await new Promise(r => setTimeout(r, 700));
  const remaining = CHARACTERS.filter(c => !S.aiEliminated.includes(c.id));
  // Si l'IA a assez réduit le champ, elle tente une accusation.
  if(remaining.length <= 2 && Math.random() < 0.7){
    const guess = remaining[Math.floor(Math.random()*remaining.length)];
    if(guess.id === S.myTarget){
      S.over = true; SFX.lose();
      finish(false);
      return;
    }else{
      S.aiEliminated.push(guess.id);
      logMessage("L'ordinateur a accusé " + charById(guess.id).name + " — raté, il reprendra plus tard.");
      S.turn = "host";
      paintGame();
      return;
    }
  }
  const trait = aiPickTrait();
  S.aiAsked = (S.aiAsked || []).concat([trait.id]);
  const myChar = charById(S.myTarget);
  const answer = trait.test(myChar);
  S.aiEliminated = CHARACTERS.filter(c => trait.test(c) !== answer).map(c => c.id).concat(S.aiEliminated);
  S.aiEliminated = [...new Set(S.aiEliminated)];
  logMessage("L'ordinateur demande : \"" + trait.label + "\" → " + (answer ? "Oui" : "Non") + ".");
  S.turn = "host";
  paintGame();
}

/* ============================================================
   LOBBY MULTIJOUEUR
   ============================================================ */
function makeCode(){
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:4}, () => A.charAt(Math.floor(Math.random()*A.length))).join("");
}
async function purgeStaleRooms(){
  if(!CONFIG_OK) return;
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  try{ await sb("guesswho_rooms?created_at=lt." + encodeURIComponent(cutoff), { method:"DELETE" }); }catch(e){}
}
let lobbyChannel = null;
async function refreshLobby(){
  if(!CONFIG_OK) return;
  const me = encodeURIComponent(S.profile.name);
  purgeStaleRooms();
  try{
    const open = await sb("guesswho_rooms?select=code,host_name,status,created_at" +
      "&status=eq.waiting&guest_name=is.null&order=created_at.desc&limit=12");
    const mine = await sb("guesswho_rooms?select=*" +
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
        const myTurnNow = r.turn === (iAmHost ? "host" : "guest");
        return '<button class="room" data-resume="' + escAttr(r.code) + '">' +
               '<span class="rc">🕵️</span>' +
               '<span class="ri"><span class="rh">contre ' + escAttr(foe) + '</span>' +
               '<span class="rt">' + (myTurnNow ? "c'est à toi de jouer" : "au tour de l'adversaire") + ' · ' + ago(r.created_at) + '</span></span>' +
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
      '<span class="rc">🕵️</span>' +
      '<span class="ri"><span class="rh">' + escAttr(r.host_name) + ' attend un adversaire</span>' +
      '<span class="rt">ouvert ' + ago(r.created_at) + '</span></span>' +
      '<span class="go">▶</span></button>').join("");
  }
  if(own.length){
    html += own.map(r =>
      '<button class="room" data-join="' + escAttr(r.code) + '" style="border-color:rgba(184,169,217,.3)">' +
      '<span class="rc">🕵️</span>' +
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
      await sb("guesswho_rooms?status=eq.waiting&host_name=neq." + encodeURIComponent(S.profile.name), { method:"DELETE" });
    }catch(e){}
    btn.disabled = false; btn.textContent = "🧹 Vider les salons inactifs";
    refreshLobby();
  });
}
function startLobbyWatch(){
  if(!client || lobbyChannel) return;
  lobbyChannel = client
    .channel("guesswho-lobby")
    .on("postgres_changes", { event:"*", schema:"public", table:"guesswho_rooms" }, () => {
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
      const mine = await sb("guesswho_rooms?select=code&host_name=eq." + encodeURIComponent(S.profile.name) +
        "&status=in.(waiting,playing)&order=created_at.desc&limit=1");
      if(mine && mine[0]){ return resumeRoom(mine[0].code); }
    }catch(e){}
    showCharacterPicker("ton futur adversaire", async (myTarget) => {
      const code = makeCode();
      try{
        await sb("guesswho_rooms", { method:"POST", body:{
          code, host_name:S.profile.name, status:"waiting", turn:"host",
          host_target: myTarget, host_eliminated: [], guest_eliminated: []
        }});
      }catch(e){
        $("#multiErr").hidden = false;
        $("#multiErr").textContent = "Le salon n'a pas pu être ouvert. Vérifie la table guesswho_rooms.";
        show("multi");
        return;
      }
      S.role = "host"; S.code = code; S.foe = "";
      S.myTarget = myTarget; S.eliminated = [];
      S.turn = "host"; S.pendingQuestion = null; S.lastSeenSeq = 0;
      S.over = false; S.ended = false;
      joinRoomChannel(code);
      startGame();
    });
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
    showCharacterPicker(r.host_name, async (myTarget) => {
      try{
        await roomPatch(code, { guest_name:S.profile.name, guest_target:myTarget, status:"playing" });
      }catch(e2){
        $("#multiErr").hidden = false;
        $("#multiErr").textContent = "Impossible de rejoindre ce salon.";
        show("multi");
        return;
      }
      S.role = "guest"; S.code = code; S.foe = r.host_name;
      S.myTarget = myTarget; S.eliminated = [];
      S.turn = r.turn || "host"; S.pendingQuestion = r.pending_question || null; S.lastSeenSeq = r.seq || 0;
      S.over = false; S.ended = false;
      joinRoomChannel(code);
      startGame();
    });
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
  S.myTarget = S.role === "host" ? r.host_target : r.guest_target;
  S.eliminated = (S.role === "host" ? r.host_eliminated : r.guest_eliminated) || [];
  S.turn = r.turn || "host";
  S.pendingQuestion = r.pending_question || null;
  S.lastSeenSeq = r.seq || 0;
  S.mySkip = !!(S.role === "host" ? r.host_skip : r.guest_skip);
  S.over = false; S.ended = false;
  joinRoomChannel(code);
  startGame();
  if(r.status === "cancelled" || r.status === "finished"){
    onRoomUpdate(r);
  }else{
    consumeSkipIfNeeded();
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
      .channel("guesswho-room-" + code)
      .on("postgres_changes",
          { event:"UPDATE", schema:"public", table:"guesswho_rooms", filter:"code=eq." + code },
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
    show("mode");
    refreshLobby();
    return;
  }

  if(S.role === "host" && r.guest_name && S.foe !== r.guest_name){
    S.foe = r.guest_name;
  }

  S.eliminated = (S.role === "host" ? r.host_eliminated : r.guest_eliminated) || S.eliminated;
  S.turn = r.turn;
  S.pendingQuestion = r.pending_question || null;
  S.mySkip = !!(S.role === "host" ? r.host_skip : r.guest_skip);

  if(r.last_answer && r.last_answer.seq > S.lastSeenSeq){
    S.lastSeenSeq = r.last_answer.seq;
    reactToAnswer(r.last_answer);
  }
  paintGame();

  if(r.status === "finished" && !S.ended){
    S.ended = true; S.over = true;
    finish(r.winner === S.profile.name);
  }else{
    consumeSkipIfNeeded();
  }
}

/* ============================================================
   ÉCRAN "PARTIE"
   ============================================================ */
function isMyTurn(){ return S.mode === "solo" ? S.turn === "host" : S.turn === S.role; }

function startGame(){
  show("game", S.mode === "solo" ? null : "mode");
  paintGame();
  consumeSkipIfNeeded();
}

async function consumeSkipIfNeeded(){
  if(S.mode !== "multi" || S.over || S.pendingQuestion) return;
  if(!isMyTurn() || !S.mySkip) return;
  const nextTurn = S.role === "host" ? "guest" : "host";
  const skipField = S.role === "host" ? "host_skip" : "guest_skip";
  S.mySkip = false; S.turn = nextTurn;
  logMessage("⏭️ Tour passé (accusation ratée précédemment).");
  paintGame();
  try{ await roomPatch(S.code, { [skipField]: false, turn: nextTurn }); }catch(e){}
}

function logMessage(text){
  const log = $("#qwLog");
  if(!log) return;
  log.hidden = false;
  log.innerHTML = '<div>' + text + '</div>' + log.innerHTML;
}

function paintGame(){
  const board = $("#qwBoard");
  if(!board) return;
  $("#foeName").textContent = S.mode === "solo" ? S.foe : (S.foe || "adversaire à venir");
  const myCharBox = $("#qwMyChar");
  if(myCharBox) myCharBox.innerHTML = myCharChipHtml(S.myTarget);
  board.innerHTML = CHARACTERS.map(c => cardHtml(c, S.eliminated.includes(c.id))).join("");
  board.classList.toggle("accuse-mode", S.accusing);
  $$("#qwBoard .qw-card").forEach(el => el.classList.toggle("accusable", S.accusing));

  const turnBar = $("#turnBar");
  if(turnBar){
    if(S.over){
      turnBar.textContent = "Partie terminée.";
      turnBar.className = "turnbar theirs";
    }else if(S.mode === "multi" && !S.foe){
      turnBar.textContent = "En attente d'un adversaire…";
      turnBar.className = "turnbar theirs";
    }else if(S.pendingQuestion && S.pendingQuestion.by === (S.mode==="solo"?"host":S.role)){
      turnBar.textContent = "En attente de la réponse de " + (S.foe || "l'adversaire") + "…";
      turnBar.className = "turnbar theirs";
    }else{
      const mine = isMyTurn() && !S.pendingQuestion;
      turnBar.textContent = mine ? "À toi de jouer" : (S.foe || "L'ordinateur") + " réfléchit…";
      turnBar.className = "turnbar " + (mine ? "mine" : "theirs");
    }
  }

  const traitsBox = $("#qwTraits");
  const canAct = !S.over && isMyTurn() && !S.pendingQuestion && (S.mode === "solo" || !!S.foe);
  if(traitsBox){
    traitsBox.innerHTML = TRAITS.map(t =>
      '<button class="qw-trait-btn" data-trait="' + t.id + '"' + (canAct ? "" : " disabled") + '>' + t.label + '</button>'
    ).join("");
  }
  const accuseBtn = $("#btnAccuse");
  if(accuseBtn) accuseBtn.disabled = !canAct;
  const cancelBtn = $("#btnCancelGame");
  if(cancelBtn) cancelBtn.classList.toggle("hidden", S.mode !== "multi" || S.over);

  // Réception d'une question qui m'est adressée : bascule sur l'écran de réponse.
  if(S.mode === "multi" && S.pendingQuestion && S.pendingQuestion.by !== S.role && !S.over){
    showAnswerScreen(S.pendingQuestion.traitId);
  }
}

function bindGameScreen(){
  $("#qwBoard").addEventListener("click", (e) => {
    const card = e.target.closest(".qw-card");
    if(!card) return;
    const charId = card.dataset.char;
    if(S.accusing){
      accuse(charId);
      return;
    }
    toggleEliminated(charId);
  });
  $("#qwTraits").addEventListener("click", (e) => {
    const b = e.target.closest("[data-trait]");
    if(!b || b.disabled) return;
    askTrait(b.dataset.trait);
  });
  $("#btnAccuse").addEventListener("click", () => {
    S.accusing = !S.accusing;
    paintGame();
  });
  $("#btnCancelGame").addEventListener("click", () => {
    if(confirm("Annuler ce salon ? Si un adversaire l'a déjà rejoint, la partie s'arrêtera aussi pour lui.")) cancelRoom();
  });
}

async function toggleEliminated(charId){
  if(S.eliminated.includes(charId)) S.eliminated = S.eliminated.filter(id => id !== charId);
  else S.eliminated = S.eliminated.concat([charId]);
  paintGame();
  if(S.mode === "multi"){
    const field = S.role === "host" ? "host_eliminated" : "guest_eliminated";
    try{ await roomPatch(S.code, { [field]: S.eliminated }); }catch(e){}
  }
}

async function askTrait(traitId){
  SFX.ask();
  if(S.mode === "solo"){
    const trait = traitById(traitId);
    const foeChar = charById(S.foeTarget);
    const answer = trait.test(foeChar);
    logMessage('Tu demandes : "' + trait.label + '" → <b>' + (answer ? "Oui" : "Non") + '</b>. À toi d\'éliminer les personnages qui ne correspondent plus.');
    answer ? SFX.yes() : SFX.no();
    S.turn = "ai";
    paintGame();
    setTimeout(aiTurn, 600);
    return;
  }
  S.pendingQuestion = { by: S.role, traitId };
  paintGame();
  try{ await roomPatch(S.code, { pending_question: S.pendingQuestion }); }catch(e){}
}

function showAnswerScreen(traitId){
  const trait = traitById(traitId);
  $("#qwAnswerQuestion").textContent = trait.label;
  const myCharBox = $("#qwAnswerMyChar");
  if(myCharBox) myCharBox.innerHTML = myCharChipHtml(S.myTarget);
  show("answer");
  const yesBtn = $("#btnYes"), noBtn = $("#btnNo");
  yesBtn.onclick = () => submitAnswer(traitId, true);
  noBtn.onclick = () => submitAnswer(traitId, false);
}
async function submitAnswer(traitId, answerGiven){
  const trait = traitById(traitId);
  const myChar = charById(S.myTarget);
  const truth = trait.test(myChar);
  const wasLie = answerGiven !== truth;
  answerGiven ? SFX.yes() : SFX.no();
  const nextSeq = (S.lastSeenSeq || 0) + 1;
  const lastAnswer = {
    traitId, answer: answerGiven, truth,
    askedBy: S.pendingQuestion.by, answeredBy: S.role,
    wasLie, seq: nextSeq
  };
  S.pendingQuestion = null;
  S.lastSeenSeq = nextSeq;
  S.turn = S.role; // celui qui vient de répondre enchaîne en posant sa question
  show("game");
  paintGame();
  try{
    await roomPatch(S.code, {
      pending_question: null, last_answer: lastAnswer, seq: nextSeq, turn: S.role
    });
  }catch(e){}
  reactToAnswer(lastAnswer, true);
}

function reactToAnswer(a, isMine){
  if(!a) return;
  const trait = traitById(a.traitId);
  if(a.wasLie && a.answeredBy === S.role){
    showMytho(trait.label);
  }else if(a.wasLie && a.askedBy === S.role){
    logMessage('🚩 <b>' + escAttr(S.foe || "L\'adversaire") + ' a menti !</b> La vraie réponse à "' + trait.label + '" est <b>' + (a.truth ? "Oui" : "Non") + '</b>. À toi d\'éliminer les personnages qui ne correspondent plus.');
    paintGame();
  }else if(a.askedBy === S.role){
    logMessage('"' + trait.label + '" → <b>' + (a.answer ? "Oui" : "Non") + '</b>. À toi d\'éliminer les personnages qui ne correspondent plus.');
    paintGame();
  }
}
function showMytho(traitLabel){
  SFX.mytho();
  const overlay = document.createElement("div");
  overlay.className = "qw-mytho";
  overlay.innerHTML = '<div class="big">MYTHO ! 🤥</div><div class="small">Tu as menti sur : ' + escAttr(traitLabel) + '</div>';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2600);
}

async function accuse(charId){
  S.accusing = false;
  const char = charById(charId);
  if(!confirm("Tu penses que le personnage mystère est " + char.name + " ?")) { paintGame(); return; }
  if(S.mode === "solo"){
    if(charId === S.foeTarget){
      S.over = true; SFX.win(); finish(true);
    }else{
      S.eliminated = S.eliminated.concat([charId]);
      logMessage("Raté ! Ce n'était pas " + char.name + ".");
      S.turn = "ai";
      paintGame();
      setTimeout(aiTurn, 600);
    }
    return;
  }
  const r = await roomLoad(S.code).catch(()=>null);
  if(!r) return;
  const foeTargetId = S.role === "host" ? r.guest_target : r.host_target;
  if(charId === foeTargetId){
    try{ await roomPatch(S.code, { status:"finished", winner:S.profile.name }); }catch(e){}
    S.over = true; SFX.win();
    finish(true);
  }else{
    const skipField = S.role === "host" ? "host_skip" : "guest_skip";
    const nextTurn = S.role === "host" ? "guest" : "host";
    try{ await roomPatch(S.code, { [skipField]: true, turn: nextTurn }); }catch(e){}
    S.turn = nextTurn;
    logMessage("Raté ! Ce n'était pas " + char.name + ". Tour suivant passé.");
    paintGame();
  }
}

/* ============================================================
   FIN DE PARTIE
   ============================================================ */
async function finish(won){
  leaveRoomChannel();
  const myChar = charById(S.myTarget);
  const foeCharId = S.mode === "solo" ? S.foeTarget : null;
  $("#endIcon").textContent = won ? "🏆" : "😅";
  $("#endTitle").textContent = won ? "Bien joué, tu as trouvé !" : "Perdu !";
  $("#endText").textContent = won
    ? "Tu as démasqué le personnage mystère de " + (S.foe || "l'ordinateur") + "."
    : (S.foe || "L'ordinateur") + " a trouvé ton personnage mystère avant toi. Revanche ?";
  won ? SFX.win() : SFX.lose();
  show("end");

  const revealBox = $("#qwEndReveal");
  if(revealBox){
    let foeChar = null;
    if(S.mode === "solo") foeChar = charById(S.foeTarget);
    else {
      try{
        const r = await roomLoad(S.code);
        foeChar = r ? charById(S.role === "host" ? r.guest_target : r.host_target) : null;
      }catch(e){}
    }
    revealBox.innerHTML =
      '<div class="center"><p class="lead" style="margin-bottom:6px;">Ton personnage était</p>' + cardHtml(myChar, false) + '</div>' +
      (foeChar ? '<div class="center" style="margin-top:14px;"><p class="lead" style="margin-bottom:6px;">Celui de ' + escAttr(S.foe || "l'adversaire") + ' était</p>' + cardHtml(foeChar, false) + '</div>' : '');
  }

  const msg = $("#saveMsg");
  if(CONFIG_OK && !S.profile.isGuest){
    try{
      await sb("game_history", { method:"POST", prefer:"return=minimal", body:{
        profile_name : S.profile.name,
        game         : GAME_NAME,
        mode         : S.mode,
        score        : won ? 1 : 0,
        rank         : won ? 1 : 2,
        total_players: 2,
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
    if(S.mode === "solo"){ startSolo(); }
    else { S.code = null; S.mode = null; show("mode"); }
  });
  $("#btnHome").addEventListener("click", () => { S.code = null; S.mode = null; show("mode"); });
}

/* ============================================================
   MARKUP
   ============================================================ */
function shellHtml(){
  return `
    <button class="btn btn-ghost btn-sm hidden" id="btnBack" style="margin-bottom:14px;">‹ Retour</button>

    <section class="screen on" data-screen="mode">
      <div class="card" style="text-align:center;padding:18px;">
        <img src="./logos/guesswho-logo.png" alt="Qui est-ce de la Tribu" style="width:100%;max-width:420px;border-radius:20px;" onerror="this.style.display='none';">
      </div>
      <div class="card">
        <h2>Comment tu joues ?</h2>
        <p class="lead">Devine le personnage mystère de l'adversaire avant lui, en posant des questions.</p>
        <div class="role-grid role-grid-3">
          <div class="role-card" data-mode="solo">
            <div class="emoji">🤖</div><h3>Contre l'ordinateur</h3>
            <p>Une partie tout de suite, hors ligne.</p>
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

    <section class="screen" data-screen="pick">
      <div class="card">
        <h2>Choisis ton personnage</h2>
        <p class="lead">C'est celui que <b id="pickForWhom">l'ordinateur</b> devra deviner — choisis-le bien !</p>
        <div class="qw-board" id="qwPickBoard"></div>
      </div>
    </section>

    <section class="screen" data-screen="game">
      <div class="card">
        <div class="turnbar theirs" id="turnBar">…</div>
        <p class="lead center" style="margin-bottom:8px;">Face à <b id="foeName">…</b></p>
        <div class="qw-mychar" id="qwMyChar"></div>
        <div class="qw-board" id="qwBoard"></div>
        <div class="qw-traits" id="qwTraits"></div>
        <div class="btn-row" style="justify-content:center;margin-top:16px">
          <button class="btn btn-gold" id="btnAccuse">🎯 Accuser</button>
          <button class="btn btn-ghost btn-sm hidden" id="btnCancelGame">Annuler le salon</button>
        </div>
        <div class="log hidden" id="qwLog" style="margin-top:14px;"></div>
      </div>
    </section>

    <section class="screen" data-screen="answer">
      <div class="card center">
        <div class="qw-mychar" id="qwAnswerMyChar"></div>
        <p class="lead">On te demande :</p>
        <div class="qw-answer-q" id="qwAnswerQuestion">…</div>
        <div class="qw-yn">
          <button class="yes" id="btnYes">Oui</button>
          <button class="no" id="btnNo">Non</button>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="end">
      <div class="card center">
        <div style="font-size:56px" id="endIcon">🏆</div>
        <h2 id="endTitle">Victoire !</h2>
        <p class="lead" id="endText"></p>
        <div id="qwEndReveal" style="margin-top:14px;"></div>
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
export async function mountGuessWho(container){
  root = container;
  root.classList.add("guesswho-screen");
  const activeProfile = getActiveProfile();
  if(!activeProfile){
    root.innerHTML = `<div class="card"><p class="setup-sub">Aucun profil actif.</p></div>`;
    return;
  }
  S.profile = { name: activeProfile.name, avatar: activeProfile.avatar, isGuest: !!activeProfile.isGuest };

  root.innerHTML = shellHtml();
  $("#btnBack").addEventListener("click", () => {
    leaveRoomChannel();
    if(backTo) show(backTo, null);
  });

  bindModeScreen();
  bindPickScreen();
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

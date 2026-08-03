// Écran d'historique unifié : agrège game_history pour tous les jeux,
// filtrable par jeu et par profil. Inspiré du dashboard du Quiz et de
// l'écran "Historique des batailles" de la Bataille Navale.
import { supabase, CONFIG_OK } from "./supabase-client.js";
import { getActiveProfile } from "./profile.js";

export const GAMES = ["Quiz de la Tribu", "Bataille Navale", "Puissance 4 de la Tribu", "Jeu des Paires de la Tribu", "Qui est-ce de la Tribu"];

function escAttr(str) {
  return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }); }
  catch (e) { return ""; }
}

let filterGame = "all"; // 'all' | 'Quiz de la Tribu' | 'Bataille Navale'
let filterProfile = "all"; // 'all' | profile name

export async function renderHistoryScreen(container) {
  const active = getActiveProfile();
  filterProfile = active ? active.name : "all";

  container.innerHTML = `
    <div class="card">
      <h1 class="setup-title" style="font-size:24px;">📊 Historique de la famille</h1>
      <p class="setup-sub">Toutes les parties jouées, tous jeux confondus.</p>
      <div id="historyFilters"></div>
      <div id="historyBody"><p class="status-banner">Chargement…</p></div>
    </div>
  `;

  if (!CONFIG_OK || !supabase) {
    container.querySelector("#historyBody").innerHTML = `<p class="status-banner">Configuration Supabase manquante.</p>`;
    return;
  }

  let rows = [];
  try {
    const { data, error } = await supabase.from("game_history").select("*").order("played_at", { ascending: false });
    if (error) throw error;
    rows = data || [];
  } catch (err) {
    container.querySelector("#historyBody").innerHTML = `<p class="status-banner">Impossible de charger l'historique (${err.message || "erreur"}).</p>`;
    return;
  }

  const profileNames = [...new Set(rows.map((r) => r.profile_name).filter(Boolean))].sort();

  function renderFilters() {
    const el = container.querySelector("#historyFilters");
    el.innerHTML = `
      <div class="btn-row" style="margin-bottom:10px;">
        <button class="btn btn-sm ${filterGame === "all" ? "btn-gold" : "btn-ghost"}" data-game-filter="all">Tous les jeux</button>
        ${GAMES.map((g) => `<button class="btn btn-sm ${filterGame === g ? "btn-gold" : "btn-ghost"}" data-game-filter="${escAttr(g)}">${g}</button>`).join("")}
      </div>
      <div class="btn-row" style="margin-bottom:20px;">
        <button class="btn btn-sm ${filterProfile === "all" ? "btn-gold" : "btn-ghost"}" data-profile-filter="all">Toute la tribu</button>
        ${profileNames.map((n) => `<button class="btn btn-sm ${filterProfile === n ? "btn-gold" : "btn-ghost"}" data-profile-filter="${escAttr(n)}">${escAttr(n)}</button>`).join("")}
      </div>
    `;
    el.querySelectorAll("[data-game-filter]").forEach((b) => b.addEventListener("click", () => { filterGame = b.dataset.gameFilter; renderFilters(); renderBody(); }));
    el.querySelectorAll("[data-profile-filter]").forEach((b) => b.addEventListener("click", () => { filterProfile = b.dataset.profileFilter; renderFilters(); renderBody(); }));
  }

  function filteredRows() {
    return rows.filter((r) =>
      (filterGame === "all" || r.game === filterGame) &&
      (filterProfile === "all" || r.profile_name === filterProfile)
    );
  }

  function renderBody() {
    const el = container.querySelector("#historyBody");
    const list = filteredRows();
    if (list.length === 0) {
      el.innerHTML = `<p class="status-banner">Aucune partie enregistrée pour ces filtres.</p>`;
      return;
    }

    // Classement agrégé (uniquement pertinent si on regarde toute la tribu)
    const byProfile = {};
    list.forEach((r) => {
      if (!byProfile[r.profile_name]) byProfile[r.profile_name] = { games: 0, totalScore: 0, wins: 0 };
      const s = byProfile[r.profile_name];
      s.games++;
      s.totalScore += r.score || 0;
      if (r.rank === 1) s.wins++;
    });
    const ranked = Object.entries(byProfile).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.totalScore - a.totalScore);
    const medals = ["🥇", "🥈", "🥉"];

    el.innerHTML = `
      <div class="scoreboard" style="margin-top:0;">
        <h3>Classement (score cumulé)</h3>
        <div class="player-cards">
          ${ranked.map((p, i) => `
            <div class="player-card">
              <div class="name">${medals[i] || ("#" + (i + 1))} ${escAttr(p.name)}</div>
              <div class="score">${p.totalScore}</div>
              <div style="font-size:12px;color:var(--muted);">${p.games} partie(s) · ${p.wins} victoire(s)</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="scoreboard">
        <h3>Dernières parties (${list.length})</h3>
        ${list.slice(0, 40).map((r) => `
          <div class="player-card" style="min-width:auto;text-align:left;margin-bottom:8px;">
            <div class="name">${r.rank === 1 ? "🏆" : ""} ${escAttr(r.profile_name)} · <span style="color:var(--muted);font-weight:400;font-size:13px;">${escAttr(r.game || "")}</span></div>
            <div style="font-size:13px;color:var(--muted);">
              ${fmtDate(r.played_at)} · ${r.mode === "solo" ? "Solo" : "Multi"}${r.room_code ? " · " + escAttr(r.room_code) : ""}
              ${r.rank ? " · " + r.rank + "ᵉ/" + (r.total_players || "?") : ""}
            </div>
            <div class="score" style="font-size:16px;">${r.score}${r.total_questions ? "/" + r.total_questions : " pts"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  renderFilters();
  renderBody();
}

// Gestion du profil de session partagé entre tous les jeux.
// Un seul choix de profil pour toute la navigation (portail, quiz, bataille navale).
import { supabase, CONFIG_OK } from "./supabase-client.js";

const ACTIVE_PROFILE_KEY = "fdo_active_profile";

/* ============ PROFIL ACTIF (session) ============ */

export function getActiveProfile() {
  try {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.name) return null;
    return p;
  } catch (e) {
    return null;
  }
}

export function setActiveProfile(profile) {
  // profile: { name, avatar, isGuest }
  localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
}

export function clearActiveProfile() {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

/* ============ ANNUAIRE DES PROFILS (table `profiles`) ============ */

let cachedProfiles = null; // [{name, avatar}]

export async function loadProfiles(force) {
  if (cachedProfiles && !force) return cachedProfiles;
  if (!CONFIG_OK || !supabase) { cachedProfiles = []; return cachedProfiles; }
  try {
    const { data, error } = await supabase.from("profiles").select("name, avatar").order("name");
    if (error) throw error;
    cachedProfiles = data || [];
  } catch (e) {
    console.warn("Impossible de charger les profils :", e.message || e);
    cachedProfiles = [];
  }
  return cachedProfiles;
}

export function profileAvatar(name) {
  const found = (cachedProfiles || []).find((p) => p.name === name);
  if (found && found.avatar) return found.avatar;
  return name ? name.charAt(0).toUpperCase() : "?";
}

export async function createProfile(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const avatar = trimmed.charAt(0).toUpperCase();
  if (CONFIG_OK && supabase) {
    try {
      const { error } = await supabase.from("profiles").upsert({ name: trimmed, avatar }, { onConflict: "name" });
      if (error) throw error;
    } catch (e) {
      alert("Impossible d'enregistrer ce profil dans Supabase (" + (e.message || "erreur") + ").");
      return null;
    }
  }
  if (cachedProfiles && !cachedProfiles.some((p) => p.name === trimmed)) {
    cachedProfiles.push({ name: trimmed, avatar });
  }
  return { name: trimmed, avatar, isGuest: false };
}

/* ============ ÉCRAN DE SÉLECTION / CRÉATION DE PROFIL ============ */

function escAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Affiche un écran de choix de profil dans `container` (un élément DOM).
 * Appelle onSelected(profile) une fois choisi, ET met déjà à jour le profil actif.
 * options: { title, subtitle, allowGuest }
 */
export async function renderProfilePicker(container, onSelected, options) {
  const opts = options || {};
  const title = opts.title || "Qui es-tu ?";
  const subtitle = opts.subtitle || "Choisis ton profil pour garder ton historique de scores partagé entre les jeux.";
  const allowGuest = opts.allowGuest !== false;

  container.innerHTML = `
    <div class="card">
      <h1 class="setup-title" style="font-size:22px;">${title}</h1>
      <p class="setup-sub">${subtitle}</p>
      <p class="status-banner" id="profilePickerLoading" style="text-align:left;">Chargement des profils…</p>
      <div class="profile-grid" id="profilePickerGrid"></div>
      <div style="margin-top:18px;">
        <label class="field-label">Pas encore de profil ? Ajoute-toi</label>
        <div class="btn-row">
          <input type="text" id="newProfileNameInput" placeholder="Ton prénom" maxlength="24" style="flex:1 1 180px;min-width:0;">
          <button class="btn btn-ghost btn-sm" id="createProfileBtn">Créer le profil</button>
        </div>
      </div>
    </div>
  `;

  async function refreshGrid() {
    const profiles = await loadProfiles();
    const loadingEl = container.querySelector("#profilePickerLoading");
    if (loadingEl) loadingEl.remove();
    const grid = container.querySelector("#profilePickerGrid");
    if (!grid) return;
    grid.innerHTML = profiles.map((p) => `
      <div class="profile-card" data-profile-pick="${escAttr(p.name)}" data-avatar="${escAttr(p.avatar || "")}">
        <div class="avatar-letter">${escAttr(p.avatar || p.name.charAt(0).toUpperCase())}</div>
        <div class="pname">${escAttr(p.name)}</div>
      </div>
    `).join("") + (allowGuest ? `
      <div class="profile-card special" data-profile-guest="1">
        <div class="avatar-letter">🕵️</div><div class="pname">Invité</div>
      </div>
    ` : "");
    if (profiles.length === 0 && !allowGuest) {
      grid.innerHTML = `<p class="status-banner" style="text-align:left;">Aucun profil enregistré pour l'instant — crée-en un ci-dessous.</p>`;
    }
  }
  await refreshGrid();

  container.querySelector("#profilePickerGrid").addEventListener("click", (e) => {
    const pickBtn = e.target.closest("[data-profile-pick]");
    if (pickBtn) {
      const profile = { name: pickBtn.dataset.profilePick, avatar: pickBtn.dataset.avatar || undefined, isGuest: false };
      setActiveProfile(profile);
      onSelected(profile);
      return;
    }
    const guestBtn = e.target.closest("[data-profile-guest]");
    if (guestBtn) {
      const name = prompt("Quel prénom veux-tu utiliser pour cette partie (invité, sans historique) ?");
      if (!name || !name.trim()) return;
      const profile = { name: name.trim(), avatar: name.trim().charAt(0).toUpperCase(), isGuest: true };
      setActiveProfile(profile);
      onSelected(profile);
    }
  });

  container.querySelector("#createProfileBtn").addEventListener("click", async () => {
    const input = container.querySelector("#newProfileNameInput");
    const name = input.value.trim();
    if (!name) return;
    const profile = await createProfile(name);
    if (!profile) return;
    setActiveProfile(profile);
    onSelected(profile);
  });
}

/**
 * Petit widget topbar : nom du profil actif + lien "changer de profil".
 * `onChange` est appelé après que le profil actif a été effacé (à toi de re-render).
 */
export function activeProfileBadgeHtml() {
  const p = getActiveProfile();
  if (!p) return "";
  return `
    <span class="active-profile-badge">
      👤 ${escAttr(p.name)}${p.isGuest ? " (invité)" : ""}
      <button class="back-link" data-change-profile="1" style="margin-left:8px;">changer de profil</button>
    </span>
  `;
}

export function bindChangeProfileHandler(container, onChange) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-change-profile]");
    if (!btn) return;
    clearActiveProfile();
    if (onChange) onChange();
  });
}

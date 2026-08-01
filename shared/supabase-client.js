// Client Supabase unique, partagé par tous les jeux (Quiz + Bataille Navale).
// Mêmes URL / clé anon que les deux repos d'origine (déjà identiques dans les deux).
export const SUPABASE_URL = "https://ffiowczdhwudkmailhtp.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaW93Y3pkaHd1ZGttYWlsaHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTM4ODcsImV4cCI6MjA5NzAyOTg4N30.Y0KYSPDTqZis2wmzOp2dyfYbYQAwIECxKdVNTNdDq4E";

export const CONFIG_OK = SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

// Le SDK Supabase JS est chargé globalement via le tag <script> UMD dans index.html
// (window.supabase), pour rester 100% statique sans bundler/import npm.
export const supabase = (CONFIG_OK && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ==========================================================
   Yakultind — shared app.js
   Dipakai oleh semua halaman publik (index, watch, kontak,
   privacy, terms, disclaimer). Berisi koneksi Supabase, cache
   LocalStorage, header/footer/nav, skeleton, pagination, dsb.
   ========================================================== */

const SUPABASE_URL = "https://agnxigqfdymitvqoapyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbnhpZ3FmZHltaXR2cW9hcHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDU2MzgsImV4cCI6MjEwMjUyMTYzOH0.g_BvtGPk7uVNuuhlMz7aYil3ZHfQvw8WPPdWpdQ0G3g";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = 'foto-post';
const SITE_NAME = 'Yakultind';
const POSTS_PER_PAGE = 12;

/* ---------- Util ---------- */
function escapeHtml(str){
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function fmtDate(iso){
  return new Date(iso).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
}

/* ---------- Ikon bar link: dideteksi otomatis dari nama yang diisi di dashboard ---------- */
const SOCIAL_ICONS = {
  whatsapp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.5 8.5 0 01-12.36 7.56L3 20l1.05-5.4A8.5 8.5 0 1121 11.5z"/><path d="M8.5 10.5c0 3 2.5 5.5 5.5 5.5"/></svg>`,
  telegram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  discord: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="10" rx="4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M8 8l1-3h6l1 3"/></svg>`,
  tv: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 18v3"/><path d="M17 5l-3-3"/></svg>`,
  pc: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>`,
  tutorial: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><polygon points="10,8 10,13 15,10.5" fill="currentColor" stroke="none"/></svg>`,
  terbatas: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>`,
  default: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>`,
};
function detectSocialIcon(nama){
  const n = (nama || '').toLowerCase();
  if(n.includes('wa') || n.includes('whatsapp')) return SOCIAL_ICONS.whatsapp;
  if(n.includes('telegram') || n.includes('tele') || n.includes('tg')) return SOCIAL_ICONS.telegram;
  if(n.includes('discord') || n.includes('disc')) return SOCIAL_ICONS.discord;
  if(n.includes('terbatas') || n.includes('18+') || n.includes('dewasa')) return SOCIAL_ICONS.terbatas;
  if(n.includes('tutorial') || n.includes('cara')) return SOCIAL_ICONS.tutorial;
  if(n.includes('tv')) return SOCIAL_ICONS.tv;
  if(n.includes('pc') || n.includes('komputer') || n.includes('desktop')) return SOCIAL_ICONS.pc;
  return SOCIAL_ICONS.default;
}

/* ---------- Render satu baris bar link dari pasangan kolom [nama,link] site_settings ---------- */
function renderLinkBar(mountEl, data, pairs){
  if(!mountEl || !data) return;
  const bars = pairs.map(([namaKey, linkKey]) => [data[namaKey], data[linkKey]])
    .filter(([nama, link]) => nama && link);
  mountEl.innerHTML = bars.map(([nama, link]) =>
    `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${detectSocialIcon(nama)}${escapeHtml(nama)}</a>`
  ).join('');
}

/* ==========================================================
   CACHE (LocalStorage) — bukan pengganti Supabase, hanya
   mempercepat tampilan awal saat refresh dan mengurangi flicker.
   ========================================================== */
const CACHE_POSTS_KEY = 'yk_cache_posts_v1';
const CACHE_STATE_KEY = 'yk_cache_state_v1';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 jam — cache lebih tua dari ini dianggap tidak ada

function cacheGetPosts(){
  try{
    const raw = localStorage.getItem(CACHE_POSTS_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.posts) || !parsed.ts) return null;
    if(Date.now() - parsed.ts > CACHE_MAX_AGE) return null;
    return parsed;
  } catch(e){ return null; }
}
function cacheSetPosts(posts){
  try{
    localStorage.setItem(CACHE_POSTS_KEY, JSON.stringify({ posts, ts: Date.now() }));
  } catch(e){ /* storage penuh/diblokir — abaikan, cache bersifat opsional */ }
}
function cacheGetState(){
  try{
    const raw = localStorage.getItem(CACHE_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}
function cacheSetState(state){
  try{ localStorage.setItem(CACHE_STATE_KEY, JSON.stringify(state)); } catch(e){}
}

/* ==========================================================
   HEADER: logo, ikon pencarian (toggle), tombol Home, bar-slots
   ========================================================== */
function initHeader(){
  const toggleBtn = document.getElementById('search-toggle');
  const panel = document.getElementById('search-panel');
  const input = document.getElementById('global-search-input');
  const form = document.getElementById('global-search-form');
  const onIndexPage = !!document.getElementById('grid');

  if(toggleBtn && panel){
    toggleBtn.addEventListener('click', () => {
      const willOpen = !panel.classList.contains('open');
      panel.classList.toggle('open', willOpen);
      toggleBtn.classList.toggle('active', willOpen);
      toggleBtn.setAttribute('aria-expanded', String(willOpen));
      if(willOpen && input) setTimeout(() => input.focus(), 180);
    });
  }

  // Prefill dari ?q= jika ada
  const qParam = new URLSearchParams(window.location.search).get('q');
  if(qParam && input){
    input.value = qParam;
    if(panel){ panel.classList.add('open'); toggleBtn && toggleBtn.classList.add('active'); }
  }

  if(form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (input && input.value.trim()) || '';
      if(onIndexPage){
        // Sudah difilter langsung via event 'input', submit cukup ditutup
        if(typeof window.onSearchChange === 'function') window.onSearchChange(q);
      } else {
        window.location.href = 'index.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
      }
    });
  }
  if(input){
    input.addEventListener('input', () => {
      if(onIndexPage && typeof window.onSearchChange === 'function'){
        window.onSearchChange(input.value.trim());
      }
    });
  }

  // Bar link header (opsional, gagal diam-diam agar tidak mengganggu tampilan)
  const barsEl = document.getElementById('bar-slots');
  if(barsEl){
    sb.from('site_settings').select('*').eq('id', 1).single().then(({ data }) => {
      renderLinkBar(barsEl, data, [['bar1_nama','bar1_link'],['bar2_nama','bar2_link'],['bar3_nama','bar3_link']]);
    }).catch(() => {});
  }
}

/* ---------- Bar link khusus watch page — dipanggil manual SETELAH konten post
   dirender, karena elemen mount-nya baru ada di DOM saat itu ---------- */
function loadWatchLinkBar(){
  const watchBarEl = document.getElementById('watch-link-bar');
  if(!watchBarEl) return;
  sb.from('site_settings').select('*').eq('id', 1).single().then(({ data }) => {
    renderLinkBar(watchBarEl, data, [['watch_bar1_nama','watch_bar1_link'],['watch_bar2_nama','watch_bar2_link'],['watch_bar3_nama','watch_bar3_link']]);
  }).catch(() => {});
}

/* ==========================================================
   NAVIGASI: dihapus sesuai permintaan (tombol Kembali & Home
   di bawah header tidak lagi ditampilkan)
   ========================================================== */
function renderNav(){
  const el = document.getElementById('nav-row');
  if(!el) return;
  el.innerHTML = '';
}

/* ---------- Footer ---------- */
function renderFooter(){
  const el = document.getElementById('site-footer-mount');
  if(!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <a href="index.html" class="footer-brand">Yakult<em>ind</em></a>
        <nav class="footer-links">
          <a href="kontak.html">Kontak</a>
          <a href="privacy.html">Privacy Policy</a>
          <a href="terms.html">Terms</a>
          <a href="disclaimer.html">Disclaimer</a>
        </nav>
      </div>
      <div class="footer-bottom">&copy; ${new Date().getFullYear()} Yakultind. Semua hak dilindungi.</div>
    </footer>`;
}

/* ---------- Lightbox (dipakai di watch.html) ---------- */
function ensureLightbox(){
  if(document.getElementById('lightbox')) return;
  const div = document.createElement('div');
  div.id = 'lightbox';
  div.innerHTML = `<button id="lightbox-close" aria-label="Tutup">&times;</button><img id="lightbox-img" src="" alt="">`;
  document.body.appendChild(div);
  document.getElementById('lightbox-close').onclick = () => div.classList.remove('open');
  div.addEventListener('click', e => { if(e.target.id === 'lightbox') div.classList.remove('open'); });
}
function openLightbox(url){
  ensureLightbox();
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox').classList.add('open');
}

/* ---------- SEO helper ---------- */
function setSeo({ title, description, keywords, image }){
  if(title) document.title = title + ' — ' + SITE_NAME;
  const setMeta = (name, content, attr='name') => {
    if(!content) return;
    let tag = document.querySelector(`meta[${attr}="${name}"]`);
    if(!tag){ tag = document.createElement('meta'); tag.setAttribute(attr, name); document.head.appendChild(tag); }
    tag.setAttribute('content', content);
  };
  setMeta('description', description);
  setMeta('keywords', keywords);
  setMeta('og:title', title, 'property');
  setMeta('og:description', description, 'property');
  if(image) setMeta('og:image', image, 'property');
}

/* ==========================================================
   SKELETON LOADING
   ========================================================== */
function skeletonGridHtml(count){
  let out = '';
  for(let i = 0; i < count; i++){
    out += `<div class="skel-card"><div class="skel-thumb"></div><div class="skel-line w1"></div><div class="skel-line w2"></div></div>`;
  }
  return out;
}
function skeletonLinesHtml(){
  return `<div class="skel-line w1" style="height:16px;"></div><div class="skel-line" style="margin:14px 0;"></div><div class="skel-line w2" style="margin-left:0;"></div>`;
}

/* ==========================================================
   ERROR STATE RAMAH PENGGUNA (tidak menampilkan pesan teknis)
   ========================================================== */
function errorStateHtml(retryFnName){
  return `<div class="state-msg">
    <p>Konten belum dapat dimuat. Silakan coba lagi.</p>
    <button class="retry-btn" onclick="${retryFnName}()">Coba Lagi</button>
  </div>`;
}

/* ==========================================================
   PAGINATION
   ========================================================== */
function renderPagination(mountEl, totalItems, currentPage, onPageChange){
  const totalPages = Math.max(1, Math.ceil(totalItems / POSTS_PER_PAGE));
  if(totalPages <= 1){ mountEl.innerHTML = ''; return; }

  const pages = [];
  const add = (p) => { if(!pages.includes(p)) pages.push(p); };
  add(1); add(totalPages);
  for(let p = currentPage - 1; p <= currentPage + 1; p++){ if(p >= 1 && p <= totalPages) add(p); }
  pages.sort((a,b) => a - b);

  let html = `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Sebelumnya">&larr;</button>`;
  let prev = 0;
  pages.forEach(p => {
    if(prev && p - prev > 1) html += `<span class="page-dots">&hellip;</span>`;
    html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    prev = p;
  });
  html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Berikutnya">&rarr;</button>`;

  mountEl.innerHTML = html;
  mountEl.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderNav();
  renderFooter();
});

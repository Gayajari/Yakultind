const SUPABASE_URL = "https://agnxigqfdymitvqoapyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbnhpZ3FmZHltaXR2cW9hcHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDU2MzgsImV4cCI6MjEwMjUyMTYzOH0.g_BvtGPk7uVNuuhlMz7aYil3ZHfQvw8WPPdWpdQ0G3g";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = 'foto-post';
const SITE_NAME = 'Yakultind';

function escapeHtml(str){
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function fmtDate(iso){
  return new Date(iso).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
}

/* ---------- Header: search + 3 bar slots ---------- */
async function initHeader(){
  const form = document.getElementById('global-search-form');
  if(form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('global-search-input').value.trim();
      window.location.href = 'index.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
    });
  }
  const barsEl = document.getElementById('bar-slots');
  if(barsEl){
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if(data){
      const bars = [
        [data.bar1_nama, data.bar1_link],
        [data.bar2_nama, data.bar2_link],
        [data.bar3_nama, data.bar3_link],
      ].filter(([nama, link]) => nama && link);
      barsEl.innerHTML = bars.map(([nama, link]) =>
        `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(nama)}</a>`
      ).join('');
    }
  }
}

/* ---------- Footer ---------- */
function renderFooter(){
  const el = document.getElementById('site-footer-mount');
  if(!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">Yakult<em>ind</em></div>
        <nav class="footer-links">
          <a href="index.html">Beranda</a>
          <a href="kontak.html">Kontak</a>
          <a href="privacy.html">Privacy Policy</a>
          <a href="terms.html">Terms</a>
          <a href="disclaimer.html">Disclaimer</a>
        </nav>
      </div>
      <div class="footer-bottom">&copy; ${new Date().getFullYear()} Yakultind. Semua hak dilindungi.</div>
    </footer>`;
}

/* ---------- Back buttons (top + bottom) ---------- */
function renderBackButtons(){
  const backHtml = `<div class="back-wrap"><a href="#" class="back-btn" onclick="goBack(event)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    Kembali</a></div>`;
  document.querySelectorAll('.back-top').forEach(el => el.innerHTML = backHtml);
  document.querySelectorAll('.back-bottom').forEach(el => el.innerHTML = backHtml);
}
function goBack(e){
  e.preventDefault();
  if(document.referrer && document.referrer.includes(window.location.host)){
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
}

/* ---------- Lightbox (shared) ---------- */
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

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderFooter();
  renderBackButtons();
});

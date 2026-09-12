/* lang.js — sistem multi-bahasa untuk Yakultind.
   Bahasa default: Indonesia (id). Tambahan: English (en), Arabic (ar), Urdu (ur).
   Arab & Urdu otomatis di-set RTL (kanan ke kiri).

   PENTING — batasan sistem ini:
   - Cuma menerjemahkan teks ANTARMUKA/SISTEM (tombol, label, pesan kosong, dll).
   - TIDAK menerjemahkan konten yang diketik admin sendiri (judul post, nama
     kategori, isi halaman Privacy/Terms/dll, nama slot link) — itu tetap apa
     adanya sesuai yang admin tulis.

   Cara pakai di HTML:
   - Elemen statis: <span data-i18n="home">Home</span>
   - Placeholder input: <input data-i18n-placeholder="search_placeholder" placeholder="Pencarian...">
   - Di JS: panggil t('key') buat ambil teks sesuai bahasa aktif. */
(function(){
  const DICT = {
    id: {
      home: 'Home',
      search_placeholder: 'Pencarian...',
      terbaru: 'Terbaru',
      terlama: 'Terlama',
      terpopuler: 'Terpopuler',
      semua: 'Semua',
      lihat: 'Lihat',
      foto: 'foto',
      buka_link: 'Buka Link',
      unduh: 'Unduh',
      pencarian_terkait: 'Pencarian Terkait',
      kontak_kosong: 'Kontak belum diatur oleh admin.',
      dipublikasikan: 'Dipublikasikan',
      lang_name: 'Indonesia'
    },
    en: {
      home: 'Home',
      search_placeholder: 'Search...',
      terbaru: 'Newest',
      terlama: 'Oldest',
      terpopuler: 'Most Viewed',
      semua: 'All',
      lihat: 'View',
      foto: 'photos',
      buka_link: 'Open Link',
      unduh: 'Download',
      pencarian_terkait: 'Related Posts',
      kontak_kosong: 'Contact info not set up yet.',
      dipublikasikan: 'Published',
      lang_name: 'English'
    },
    ar: {
      home: 'الرئيسية',
      search_placeholder: 'بحث...',
      terbaru: 'الأحدث',
      terlama: 'الأقدم',
      terpopuler: 'الأكثر مشاهدة',
      semua: 'الكل',
      lihat: 'عرض',
      foto: 'صور',
      buka_link: 'فتح الرابط',
      unduh: 'تحميل',
      pencarian_terkait: 'منشورات ذات صلة',
      kontak_kosong: 'لم يتم إعداد معلومات الاتصال بعد.',
      dipublikasikan: 'نُشر في',
      lang_name: 'العربية'
    },
    ur: {
      home: 'ہوم',
      search_placeholder: 'تلاش کریں...',
      terbaru: 'تازہ ترین',
      terlama: 'پرانے',
      terpopuler: 'زیادہ دیکھی گئی',
      semua: 'تمام',
      lihat: 'دیکھیں',
      foto: 'تصاویر',
      buka_link: 'لنک کھولیں',
      unduh: 'ڈاؤن لوڈ',
      pencarian_terkait: 'متعلقہ پوسٹس',
      kontak_kosong: 'رابطہ کی معلومات ابھی ترتیب نہیں دی گئی۔',
      dipublikasikan: 'شائع شدہ',
      lang_name: 'اردو'
    }
  };

  const RTL_LANGS = ['ar', 'ur'];
  const STORAGE_KEY = 'yk_lang';

  function getLang(){
    return localStorage.getItem(STORAGE_KEY) || 'id';
  }

  function setLang(lang){
    localStorage.setItem(STORAGE_KEY, lang);
    location.reload(); // reload paling aman: semua teks (statis & yang di-generate JS) ikut ke-render ulang benar
  }

  // Fungsi global t('key') — dipanggil dari script lain (index.html, watch.html, dst)
  // buat ambil teks sesuai bahasa yang lagi aktif.
  window.t = function(key){
    const lang = getLang();
    return (DICT[lang] && DICT[lang][key]) || (DICT.id && DICT.id[key]) || key;
  };
  window.currentLang = getLang();

  function applyTranslations(){
    const lang = getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = window.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = window.t(el.dataset.i18nPlaceholder);
    });
  }

  function buildSwitcher(){
    if(document.getElementById('lang-switcher')) return;
    const siteHeader = document.querySelector('.site-header');
    const barSlots = document.getElementById('bar-slots');
    if(!siteHeader) return;

    const wrap = document.createElement('div');
    wrap.id = 'lang-switcher';
    wrap.className = 'lang-switcher';

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Language');
    Object.keys(DICT).forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = DICT[code].lang_name;
      if(code === getLang()) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => setLang(select.value));

    wrap.appendChild(select);

    // Taruh sebagai baris baru setelah bar-slots (kalau ada), supaya tidak
    // menumpuk di grid 3-kolom .header-top yang sudah pas isinya.
    if(barSlots && barSlots.parentElement === siteHeader){
      barSlots.insertAdjacentElement('afterend', wrap);
    } else {
      siteHeader.appendChild(wrap);
    }
  }

  function init(){
    applyTranslations();
    buildSwitcher();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Rekomendasi/autocomplete untuk kotak pencarian global — mirip pencarian di aplikasi modern:
   ketik sebagian nama, muncul daftar post asli (thumbnail + judul), klik salah satu
   langsung ke halaman watch post itu (tidak perlu Enter/submit dulu).
   File ini berdiri sendiri, tidak mengubah app.js atau logic pencarian utama yang sudah ada. */
(function(){
  const form = document.getElementById('global-search-form');
  const input = document.getElementById('global-search-input');
  if(!form || !input) return;

  const box = document.createElement('div');
  box.className = 'search-suggest';
  box.id = 'search-suggest';
  form.appendChild(box);

  let pool = null;
  let poolPromise = null;

  function lightweight(posts){
    return (posts || []).map(p => ({
      id: p.id,
      slug: p.slug || '',
      judul: p.judul || '',
      kategori: p.kategori || '',
      cover: (p.foto_urls || [])[0] || ''
    }));
  }

  function getPool(){
    if(pool) return Promise.resolve(pool);
    // Kalau halaman ini (index.html) sudah punya data post yang dimuat, pakai itu — tidak perlu fetch lagi.
    if(typeof allPosts !== 'undefined' && allPosts && allPosts.length){
      pool = lightweight(allPosts);
      return Promise.resolve(pool);
    }
    if(poolPromise) return poolPromise;
    if(typeof sb === 'undefined'){ pool = []; return Promise.resolve(pool); }
    poolPromise = sb.from('posts').select('id, judul, kategori, tags, foto_urls, slug').limit(300)
      .then(({ data }) => { pool = lightweight(data || []); return pool; })
      .catch(() => { pool = []; return pool; });
    return poolPromise;
  }

  function closeBox(){
    box.classList.remove('open');
    box.innerHTML = '';
  }

  function escapeHtmlLocal(str){
    return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function renderSuggestions(matches){
    if(!matches.length){ closeBox(); return; }
    box.innerHTML = matches.map(p => `
      <a class="search-suggest-item" href="watch.html?id=${encodeURIComponent(p.slug || p.id)}" data-id="${escapeHtmlLocal(p.id)}">
        <img src="${escapeHtmlLocal(p.cover)}" alt="" loading="lazy">
        <span class="search-suggest-text">
          <span class="search-suggest-name">${escapeHtmlLocal(p.judul)}</span>
          <span class="search-suggest-cat">${escapeHtmlLocal(p.kategori)}</span>
        </span>
      </a>
    `).join('');
    box.classList.add('open');
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if(q.length < 1){ closeBox(); return; }
    getPool().then(list => {
      const matches = list
        .filter(p => p.judul.toLowerCase().includes(q) || p.kategori.toLowerCase().includes(q))
        .slice(0, 6);
      renderSuggestions(matches);
    });
  });

  input.addEventListener('focus', () => {
    getPool();
    if(input.value.trim().length >= 1) input.dispatchEvent(new Event('input'));
  });
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeBox();
  });
  document.addEventListener('click', (e) => {
    if(!form.contains(e.target)) closeBox();
  });
})();

/* Smart-back untuk tombol Home/logo di header — CUMA jalan di halaman selain index.html
   (index.html sudah punya logic sendiri: reset kategori ke Semua kalau tombol Home diklik dari sana). */
(function(){
  const path = location.pathname.split('/').pop();
  if(path === '' || path === 'index.html') return; // biar tidak bentrok sama logic Home di index.html

  const homeBtn = document.querySelector('.home-btn');
  if(!homeBtn) return;

  homeBtn.addEventListener('click', (e) => {
    let sameOrigin = false;
    try{ sameOrigin = !!document.referrer && new URL(document.referrer).origin === location.origin; }
    catch(err){ sameOrigin = false; }

    if(sameOrigin && window.history.length > 1){
      e.preventDefault();
      history.back();
    }
    // Kalau tidak memenuhi syarat di atas, biarkan link <a href="index.html"> jalan normal.
  });
})();

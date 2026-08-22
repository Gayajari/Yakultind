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
    poolPromise = sb.from('posts').select('id, judul, kategori, tags, foto_urls').limit(300)
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
      <a class="search-suggest-item" href="watch.html?id=${encodeURIComponent(p.id)}" data-id="${escapeHtmlLocal(p.id)}">
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

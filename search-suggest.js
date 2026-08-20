/* Rekomendasi/autocomplete untuk kotak pencarian global.
   File ini berdiri sendiri (tidak mengubah app.js atau logic pencarian yang sudah ada) —
   cuma nambah dropdown saran di bawah input, dibangun dari kata-kata yang ada di
   judul, kategori, dan tag semua post. Dipakai bareng di semua halaman. */
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

  function extractTerms(posts){
    const set = new Set();
    (posts || []).forEach(p => {
      if(p.judul){
        p.judul.split(/\s+/).forEach(w => {
          const clean = w.replace(/[^\p{L}\p{N}]/gu, '');
          if(clean.length >= 3) set.add(clean);
        });
      }
      if(p.kategori) set.add(p.kategori.trim());
      if(p.tags){
        p.tags.split(',').forEach(t => {
          const clean = t.trim();
          if(clean) set.add(clean);
        });
      }
    });
    return [...set];
  }

  function getPool(){
    if(pool) return Promise.resolve(pool);
    // Kalau halaman ini (index.html) sudah punya data post yang dimuat, pakai itu — tidak perlu fetch lagi.
    if(typeof allPosts !== 'undefined' && allPosts && allPosts.length){
      pool = extractTerms(allPosts);
      return Promise.resolve(pool);
    }
    if(poolPromise) return poolPromise;
    if(typeof sb === 'undefined'){ pool = []; return Promise.resolve(pool); }
    poolPromise = sb.from('posts').select('judul, kategori, tags').limit(300)
      .then(({ data }) => { pool = extractTerms(data || []); return pool; })
      .catch(() => { pool = []; return pool; });
    return poolPromise;
  }

  function closeBox(){
    box.classList.remove('open');
    box.innerHTML = '';
  }

  function renderSuggestions(matches){
    if(!matches.length){ closeBox(); return; }
    box.innerHTML = matches.map(m => `<button type="button" class="search-suggest-item">${m}</button>`).join('');
    box.classList.add('open');
    box.querySelectorAll('.search-suggest-item').forEach(btn => {
      // mousedown (bukan click) supaya jalan duluan sebelum input blur menutup box
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = btn.textContent;
        closeBox();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    });
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if(q.length < 2){ closeBox(); return; }
    getPool().then(list => {
      const matches = list
        .filter(w => w.toLowerCase().includes(q))
        .slice(0, 6);
      renderSuggestions(matches);
    });
  });

  input.addEventListener('focus', () => { getPool(); });
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeBox();
  });
  document.addEventListener('click', (e) => {
    if(!form.contains(e.target)) closeBox();
  });
})();

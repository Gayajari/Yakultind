/* ads.js — satu sumber untuk semua unit iklan Adsterra yang dipakai berulang
   di banyak halaman (sticky banner + banner 320x50 + banner 300x250 + native banner).
   Ganti key/ukuran cukup di sini kalau perlu update — tidak perlu edit satu-satu
   di tiap file HTML.

   Cara pakai di HTML:
   1. Slot biasa (inline, di posisi tertentu):
      <div class="ad-slot" data-ad="banner50"></div>   (atau "banner250" / "native")
   2. Native banner 2 kartu di mobile (kecil-kecil seperti grid post):
      <div class="ad-slot" data-ad="native" data-cols="2"></div>
      (tanpa data-cols, native tetap 1 kartu seperti sebelumnya)
   3. Sticky banner (nempel di bawah layar, sekali per halaman):
      <div id="ad-sticky-mount"></div>  — taruh sebelum </body>

   Semua logic dijalankan setelah DOMContentLoaded, supaya aman dipanggil dari
   <script> di mana pun posisinya di halaman (tidak harus di paling bawah). */
(function(){
  const ADS = {
    banner50:  { key:'6ca5307a6ef38e22503075886cf53aad', width:320, height:50 },
    banner250: { key:'7dd632ad0425a42886831218dcf14802', width:300, height:250 },
    native:    { key:'245e769cf203c22c9b8fe4b2394bec6d', native:true },
    stickyDesktop: { key:'9185f3cf2c5c810da2b1f2f335ba496e', width:728, height:90 }
  };

  /* Native 2 kartu di mobile (aktif kalau slot punya data-cols="2").
     Widget Adsterra dirender di kanvas lebar (canvasWidth) sehingga tampil BARIS
     seperti di desktop. Lalu script MENGUKUR sendiri posisi kartu di dalam widget
     (iframe ini same-origin) dan memotong tepat di 2 kartu pertama, kemudian
     memperkecilnya supaya pas selebar layar. Jadi tidak perlu tebak-tebak angka.
     - canvasWidth : lebar kanvas. Kalau yang muncul cuma 1 kartu per baris,
                     besarkan (mis. 1100 / 1200).
     - visibleWidth, rowHeight : HANYA dipakai sebagai cadangan kalau pengukuran
                     otomatis gagal (mis. widget belum termuat setelah ±15 detik).
     Bisa di-override per slot:
     data-canvas-width="1100" data-visible-width="510" data-row-height="400" */
  const NATIVE_2COL = { canvasWidth: 1000, visibleWidth: 510, rowHeight: 400 };

  /* OPSIONAL: key unit native KEDUA dari dashboard Adsterra (buat 1 unit native baru).
     Dipakai di mode terpisah supaya 2 iklan pasti berbeda. Kosongkan kalau belum punya. */
  const SECOND_NATIVE_KEY = '';

  function buildSrcdoc(ad){
    if(ad.native){
      return `<html><body style='margin:0;background:transparent;overflow:hidden'><script async data-cfasync='false' src='https://inputoppose.com/${ad.key}/invoke.js'></script><div id='container-${ad.key}'></div></body></html>`;
    }
    return `<html><body style='margin:0;background:transparent;overflow:hidden'><script>atOptions={'key':'${ad.key}','format':'iframe','height':${ad.height},'width':${ad.width},'params':{}};</script><script src='https://inputoppose.com/${ad.key}/invoke.js'></script></body></html>`;
  }

  /* Bangun 1 "jendela" native yang dipotong otomatis ke kartu tertentu.
     o.canvasWidth : lebar kanvas iframe
     o.count       : 2 = tampilkan 2 kartu pertama sebaris, 1 = tampilkan 1 kartu
     o.pick        : (count 1) kartu ke berapa yang diambil (0 = pertama, 1 = kedua)
     o.fallback    : {width,height} cadangan kalau pengukuran gagal
     o.onShort     : dipanggil kalau count=2 tapi widget hanya memberi 1 kartu per baris */
  function buildNativeCrop(ad, o){
    const canvasWidth = o.canvasWidth;
    const count = o.count || 1;
    const pick = o.pick || 0;
    const fallback = { left:0, top:0, width:o.fallback.width, height:o.fallback.height };

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.loading = 'lazy';
    iframe.title = 'Sponsored';
    iframe.srcdoc = buildSrcdoc(ad);
    iframe.style.cssText = `width:${canvasWidth}px; max-width:none; height:700px; border:0; display:block; transform-origin:0 0;`;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%; height:0; overflow:hidden; border-radius:12px; position:relative;';
    wrap.appendChild(iframe);

    let crop = null;
    let useFallback = false;

    const apply = () => {
      const c = crop || (useFallback ? fallback : null);
      const w = wrap.clientWidth;
      if(!c || !w) return;
      const scale = w / c.width;
      iframe.style.transform = `translate(${-c.left * scale}px, ${-c.top * scale}px) scale(${scale})`;
      wrap.style.height = Math.round(c.height * scale) + 'px';
    };

    const measure = () => {
      let doc;
      try { doc = iframe.contentDocument; } catch(e){ return null; }
      if(!doc || !doc.body) return null;
      const root = doc.getElementById('container-' + ad.key) || doc.body;

      const seen = {};
      const cards = [];
      root.querySelectorAll('img').forEach(img => {
        if(!img.complete || !img.naturalWidth) return;
        const ir = img.getBoundingClientRect();
        if(ir.width < 60 || ir.height < 40 || ir.width > canvasWidth * 0.8) return;
        let el = img;
        while(el.parentElement && el.parentElement !== root && el.parentElement !== doc.body){
          const pr = el.parentElement.getBoundingClientRect();
          if(pr.width > ir.width * 1.35) break;
          el = el.parentElement;
        }
        const r = el.getBoundingClientRect();
        const k = Math.round(r.left) + '_' + Math.round(r.top);
        if(seen[k]) return;
        seen[k] = true;
        cards.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      });
      if(!cards.length) return null;
      cards.sort((a, b) => a.top - b.top || a.left - b.left);

      let picked;
      if(count >= 2){
        picked = cards.filter(c => Math.abs(c.top - cards[0].top) < 40)
                      .sort((a, b) => a.left - b.left)
                      .slice(0, 2);
      } else {
        picked = [cards[pick] || cards[0]];
      }
      const left = Math.min(...picked.map(c => c.left));
      const right = Math.max(...picked.map(c => c.right));
      const top = Math.min(...picked.map(c => c.top));
      const bottom = Math.max(...picked.map(c => c.bottom));
      if(right - left < 50 || bottom - top < 50) return null;
      return { left, top, width: right - left, height: bottom - top, n: picked.length };
    };

    let tries = 0, firstSeen = 0, switched = false;
    const timer = setInterval(() => {
      tries++;
      let m = null;
      try { m = measure(); } catch(e){ m = null; }
      if(m){
        if(!firstSeen) firstSeen = tries;
        crop = m;
        apply();
        // Widget hanya memberi 1 kartu per baris (walau kanvas lebar) -> pindah ke mode terpisah
        if(count >= 2 && m.n < 2 && tries - firstSeen >= 17 && !switched && o.onShort){
          switched = true;
          clearInterval(timer);
          o.onShort(wrap);
          return;
        }
      }
      if(tries >= 50){
        clearInterval(timer);
        if(!crop){ useFallback = true; apply(); }
      }
    }, 300);

    if(window.ResizeObserver){
      new ResizeObserver(apply).observe(wrap);
    }
    window.addEventListener('resize', apply);
    return wrap;
  }

  /* Mode terpisah: 2 kotak iklan berdampingan (grid 2 kolom, jarak 14px seperti grid post).
     Tiap kotak memuat widget native sendiri. Kalau SECOND_NATIVE_KEY diisi, kotak kedua
     memakai unit iklan kedua (iklan pasti beda). Kalau kosong, kotak kedua mengambil
     kartu ke-2 dari widget-nya sendiri supaya kecil kemungkinan sama dengan kotak pertama. */
  function buildSplitGrid(ad){
    const grid = document.createElement('div');
    grid.style.cssText = 'width:100%; display:grid; grid-template-columns:1fr 1fr; gap:14px;';
    const ad2 = SECOND_NATIVE_KEY ? { key: SECOND_NATIVE_KEY, native: true } : ad;
    const cell = (a, pick) => buildNativeCrop(a, {
      canvasWidth: 340, count: 1, pick: pick,
      fallback: { width: 320, height: 295 }
    });
    grid.appendChild(cell(ad, 0));
    grid.appendChild(cell(ad2, SECOND_NATIVE_KEY ? 0 : 1));
    return grid;
  }

  function makeIframe(adName, cropHeight, opts){
    opts = opts || {};
    const ad = ADS[adName];
    if(!ad) return null;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.loading = 'lazy';
    iframe.title = 'Sponsored';
    iframe.srcdoc = buildSrcdoc(ad);

    if(ad.native){
      const isDesktop = window.innerWidth >= 900;
      if(isDesktop){
        // Desktop sudah pas sebagaimana adanya — tidak disentuh.
        iframe.style.cssText = 'width:100%; height:420px; border:0;';
        return iframe;
      }

      // Mobile, mode 2 kartu (opt-in lewat data-cols="2"):
      // 1) coba render di kanvas lebar (tampil baris) & potong 2 kartu pertama;
      // 2) kalau widget tetap hanya memberi 1 kartu per baris, otomatis pindah
      //    ke mode terpisah (2 kotak iklan berdampingan).
      if(opts.cols === 2){
        return buildNativeCrop(ad, {
          canvasWidth: opts.canvasWidth || NATIVE_2COL.canvasWidth,
          count: 2,
          fallback: {
            width: opts.visibleWidth || NATIVE_2COL.visibleWidth,
            height: opts.rowHeight || NATIVE_2COL.rowHeight
          },
          onShort: (oldWrap) => {
            const grid = buildSplitGrid(ad);
            if(oldWrap.parentNode) oldWrap.parentNode.replaceChild(grid, oldWrap);
          }
        });
      }

      // Mobile, mode 1 kartu (default): kasih iframe ruang lega di dalam (500px) supaya kartu pertama
      // PASTI render utuh tanpa kepotong teksnya, lalu crop tampilan luarnya
      // persis di batas 1 kartu lewat wrapper overflow:hidden. cropHeight bisa
      // beda-beda per halaman (lewat atribut data-crop) karena tinggi kartu
      // asli Adsterra bisa sedikit berbeda tergantung lebar kontainer halaman.
      iframe.style.cssText = 'width:100%; height:500px; border:0; display:block;';
      const crop = document.createElement('div');
      crop.style.cssText = `width:100%; height:${cropHeight || 345}px; overflow:hidden; border-radius:12px;`;
      crop.appendChild(iframe);
      return crop;
    }

    iframe.width = ad.width;
    iframe.height = ad.height;
    iframe.style.cssText = 'border:0;';
    return iframe;
  }

  function init(){
    // Isi semua slot iklan biasa yang ada di halaman ini
    document.querySelectorAll('.ad-slot[data-ad]').forEach(slot => {
      const cropHeight = slot.dataset.crop ? Number(slot.dataset.crop) : undefined;
      const opts = {
        cols: slot.dataset.cols ? Number(slot.dataset.cols) : 1,
        canvasWidth: slot.dataset.canvasWidth ? Number(slot.dataset.canvasWidth) : undefined,
        visibleWidth: slot.dataset.visibleWidth ? Number(slot.dataset.visibleWidth) : undefined,
        rowHeight: slot.dataset.rowHeight ? Number(slot.dataset.rowHeight) : undefined
      };
      const iframe = makeIframe(slot.dataset.ad, cropHeight, opts);
      if(iframe) slot.appendChild(iframe);
    });

    // Sticky banner — auto dipasang kalau halaman punya <div id="ad-sticky-mount">
    const stickyMount = document.getElementById('ad-sticky-mount');
    if(stickyMount){
      const wrap = document.createElement('div');
      wrap.className = 'ad-sticky';
      wrap.id = 'ad-sticky';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ad-sticky-close';
      closeBtn.setAttribute('aria-label', 'Tutup iklan');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        wrap.style.display = 'none';
        document.body.style.paddingBottom = '0';
      });

      // Layar sempit (HP) pakai 320x50, layar lebar (desktop, >=900px) pakai 728x90
      const stickyAdName = window.innerWidth >= 900 ? 'stickyDesktop' : 'banner50';
      const iframe = makeIframe(stickyAdName);
      if(iframe) wrap.appendChild(iframe);
      wrap.appendChild(closeBtn);
      stickyMount.replaceWith(wrap);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init(); // dokumen sudah selesai dimuat duluan (mis. script ditaruh di akhir body)
  }
})();

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

  function buildSrcdoc(ad){
    if(ad.native){
      return `<html><body style='margin:0;background:transparent;overflow:hidden'><script async data-cfasync='false' src='https://inputoppose.com/${ad.key}/invoke.js'></script><div id='container-${ad.key}'></div></body></html>`;
    }
    return `<html><body style='margin:0;background:transparent;overflow:hidden'><script>atOptions={'key':'${ad.key}','format':'iframe','height':${ad.height},'width':${ad.width},'params':{}};</script><script src='https://inputoppose.com/${ad.key}/invoke.js'></script></body></html>`;
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

      // Mobile, mode 2 kartu (opt-in lewat data-cols="2"): render di kanvas lebar
      // (tampil baris seperti desktop), ukur & potong tepat 2 kartu pertama, lalu
      // perkecil supaya pas selebar layar — mirip 2 kolom grid post.
      if(opts.cols === 2){
        const canvasWidth = opts.canvasWidth || NATIVE_2COL.canvasWidth;
        const fallback = {
          left: 0, top: 0,
          width: opts.visibleWidth || NATIVE_2COL.visibleWidth,
          height: opts.rowHeight || NATIVE_2COL.rowHeight
        };

        const wrap = document.createElement('div');
        wrap.style.cssText = 'width:100%; height:0; overflow:hidden; border-radius:12px; position:relative;';

        iframe.style.cssText = `width:${canvasWidth}px; max-width:none; height:700px; border:0; display:block; transform-origin:0 0;`;
        wrap.appendChild(iframe);

        let crop = null;          // area 2 kartu hasil pengukuran (koordinat di dalam kanvas)
        let useFallback = false;  // true kalau pengukuran gagal sampai batas waktu

        const apply = () => {
          const c = crop || (useFallback ? fallback : null);
          const w = wrap.clientWidth;
          if(!c || !w) return;
          const scale = w / c.width;
          iframe.style.transform = `translate(${-c.left * scale}px, ${-c.top * scale}px) scale(${scale})`;
          wrap.style.height = Math.round(c.height * scale) + 'px';
        };

        // Cari 2 kartu pertama (1 baris) di dalam widget dan hitung area potongnya.
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
            // naik ke pembungkus kartu (selama lebarnya tidak jauh melebihi gambar)
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
          const firstRow = cards.filter(c => Math.abs(c.top - cards[0].top) < 40)
                                .sort((a, b) => a.left - b.left)
                                .slice(0, 2);
          const left = Math.min(...firstRow.map(c => c.left));
          const right = Math.max(...firstRow.map(c => c.right));
          const top = Math.min(...firstRow.map(c => c.top));
          const bottom = Math.max(...firstRow.map(c => c.bottom));
          if(right - left < 50 || bottom - top < 50) return null;
          return { left, top, width: right - left, height: bottom - top };
        };

        let tries = 0;
        const timer = setInterval(() => {
          tries++;
          let m = null;
          try { m = measure(); } catch(e){ m = null; }
          if(m){
            crop = m;
            apply();
          }
          if(tries >= 50){            // ±15 detik
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

/* ads.js — satu sumber untuk semua unit iklan Adsterra yang dipakai berulang
   di banyak halaman (sticky banner + banner 320x50 + banner 300x250 + native banner).
   Ganti key/ukuran cukup di sini kalau perlu update — tidak perlu edit satu-satu
   di tiap file HTML.

   Cara pakai di HTML:
   1. Slot biasa (inline, di posisi tertentu):
      <div class="ad-slot" data-ad="banner50"></div>   (atau "banner250" / "native")
   2. Native banner:
      - MOBILE (lebar < 900px): logika Yakultind yang lama — iframe ruang lega 500px
        dibungkus crop tinggi tetap pas 1 kartu. Ubah per slot: data-crop="295"
      - DESKTOP (lebar >= 900px): logika NOKT HUB — tanpa crop, tinggi tetap
        (default 240px). Ubah per slot: data-desktop-height="240"
      Contoh: <div class="ad-slot" data-ad="native" data-crop="295" data-desktop-height="240"></div>
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

  const NATIVE_DESKTOP_BREAKPOINT = 900;
  const NATIVE_DESKTOP_HEIGHT_DEFAULT = 240; // tinggi tetap desktop (logika NOKT HUB)

  function buildSrcdoc(ad){
    if(ad.native){
      return `<html><body style='margin:0;background:transparent;overflow:hidden'><script async data-cfasync='false' src='https://inputoppose.com/${ad.key}/invoke.js'></script><div id='container-${ad.key}'></div></body></html>`;
    }
    return `<html><body style='margin:0;background:transparent;overflow:hidden'><script>atOptions={'key':'${ad.key}','format':'iframe','height':${ad.height},'width':${ad.width},'params':{}};</script><script src='https://inputoppose.com/${ad.key}/invoke.js'></script></body></html>`;
  }

  // srcdoc native versi NOKT HUB (dipakai di DESKTOP saja)
  function buildNativeSrcdocNokt(ad){
    return `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style></head><body><div id="container-${ad.key}"></div><script async data-cfasync="false" src="https://inputoppose.com/${ad.key}/invoke.js"><\/script></body></html>`;
  }

  function makeIframe(adName, cropHeight, desktopHeight){
    const ad = ADS[adName];
    if(!ad) return null;
    const iframe = document.createElement('iframe');
    iframe.loading = 'lazy';
    iframe.title = 'Sponsored';

    if(ad.native){
      const isDesktop = window.innerWidth >= NATIVE_DESKTOP_BREAKPOINT;

      if(isDesktop){
        // DESKTOP — logika NOKT HUB: tinggi tetap, tidak di-crop, sandbox + popups.
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
        iframe.setAttribute('scrolling', 'no');
        iframe.srcdoc = buildNativeSrcdocNokt(ad);
        iframe.style.cssText = `width:100%;height:${desktopHeight || NATIVE_DESKTOP_HEIGHT_DEFAULT}px;border:0;display:block;`;
        return iframe;
      }

      // MOBILE — logika Yakultind yang lama (tidak diubah).
      // Kasih iframe ruang lega di dalam (500px) supaya kartu pertama
      // PASTI render utuh tanpa kepotong teksnya, lalu crop tampilan luarnya
      // persis di batas 1 kartu lewat wrapper overflow:hidden. cropHeight bisa
      // beda-beda per halaman (lewat atribut data-crop) karena tinggi kartu
      // asli Adsterra bisa sedikit berbeda tergantung lebar kontainer halaman.
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.srcdoc = buildSrcdoc(ad);
      iframe.style.cssText = 'width:100%; height:500px; border:0; display:block;';
      const crop = document.createElement('div');
      crop.style.cssText = `width:100%; height:${cropHeight || 345}px; overflow:hidden; border-radius:12px;`;
      crop.appendChild(iframe);
      return crop;
    }

    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.srcdoc = buildSrcdoc(ad);
    iframe.width = ad.width;
    iframe.height = ad.height;
    iframe.style.cssText = 'border:0;';
    return iframe;
  }

  function init(){
    // Isi semua slot iklan biasa yang ada di halaman ini
    document.querySelectorAll('.ad-slot[data-ad]').forEach(slot => {
      const cropHeight = slot.dataset.crop ? Number(slot.dataset.crop) : undefined;
      const desktopHeight = slot.dataset.desktopHeight ? Number(slot.dataset.desktopHeight) : undefined;
      const iframe = makeIframe(slot.dataset.ad, cropHeight, desktopHeight);
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

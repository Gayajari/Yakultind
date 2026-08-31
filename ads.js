/* ads.js — satu sumber untuk semua unit iklan Adsterra yang dipakai berulang
   di banyak halaman (sticky banner + banner 320x50 + banner 300x250 + native banner).
   Ganti key/ukuran cukup di sini kalau perlu update — tidak perlu edit satu-satu
   di tiap file HTML.

   Cara pakai di HTML:
   1. Slot biasa (inline, di posisi tertentu):
      <div class="ad-slot" data-ad="banner50"></div>   (atau "banner250" / "native")
   2. Sticky banner (nempel di bawah layar, sekali per halaman):
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

  function buildSrcdoc(ad){
    if(ad.native){
      return `<html><body style='margin:0;background:transparent;overflow:hidden'><script async data-cfasync='false' src='https://inputoppose.com/${ad.key}/invoke.js'></script><div id='container-${ad.key}'></div></body></html>`;
    }
    return `<html><body style='margin:0;background:transparent;overflow:hidden'><script>atOptions={'key':'${ad.key}','format':'iframe','height':${ad.height},'width':${ad.width},'params':{}};</script><script src='https://inputoppose.com/${ad.key}/invoke.js'></script></body></html>`;
  }

  function makeIframe(adName, cropHeight){
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
      // Mobile: kasih iframe ruang lega di dalam (500px) supaya kartu pertama
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
      const iframe = makeIframe(slot.dataset.ad, cropHeight);
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

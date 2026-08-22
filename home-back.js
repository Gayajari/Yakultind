/* Smart-back untuk tombol Home/logo di header — dipasang di semua halaman KECUALI index.html
   (index.html sudah punya logic sendiri: reset kategori ke Semua kalau tombol Home diklik dari sana).

   Prinsipnya sama seperti tombol back di aplikasi populer (Instagram, Tokopedia, dst):
   - Kalau memang datang dari halaman lain di situs ini (riwayat browser ada), tombol Home
     bertindak seperti tombol back asli (history.back()) — balik ke halaman sebelumnya persis
     seperti kondisi terakhir (termasuk kategori/scroll yang sedang aktif).
   - Kalau tidak ada riwayat dari situs ini (misal buka link post langsung dari luar/share),
     fallback ke index.html seperti biasa (link asli tetap jalan, tidak dicegah). */
(function(){
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

// api/social-preview.js
//
// Endpoint ini HANYA dipanggil untuk bot crawler sosmed (Facebook, X/Twitter,
// WhatsApp, Telegram, dll) — lihat vercel.json, rewrite ke sini dikondisikan
// oleh header User-Agent lewat "has". Pengunjung manusia biasa TIDAK PERNAH
// menyentuh file ini; mereka tetap jatuh ke rewrite lama (/watch/:code dan
// /w/:code -> /watch) seperti sebelumnya, tidak diubah sama sekali.
//
// Alasan endpoint ini perlu ada: watch.html adalah halaman SPA — judul, foto,
// dan deskripsi post baru diisi lewat JavaScript SETELAH halaman dimuat. Bot
// crawler sosmed tidak menjalankan JavaScript, jadi mereka hanya membaca HTML
// mentahnya (yang isinya cuma "Memuat…"). Endpoint ini membalas HTML kecil
// berisi meta Open Graph yang sudah terisi data post, supaya link yang
// dibagikan ke Facebook/X/WhatsApp/dll menampilkan preview foto & judul yang
// benar, bukan kosong/generik.

const SUPABASE_URL = "https://agnxigqfdymitvqoapyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbnhpZ3FmZHltaXR2cW9hcHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDU2MzgsImV4cCI6MjEwMjUyMTYzOH0.g_BvtGPk7uVNuuhlMz7aYil3ZHfQvw8WPPdWpdQ0G3g";

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

// Sama persis dengan logic di watch.html: UUID persis -> cari kolom id,
// selain itu coba short_code dulu (link terbaru /w/...), baru slug (link lama).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchPost(code) {
  const isUuid = UUID_RE.test(code);
  const filter = isUuid
    ? `id=eq.${encodeURIComponent(code)}`
    : `or=(short_code.eq.${encodeURIComponent(code)},slug.eq.${encodeURIComponent(code)})`;

  const url = `${SUPABASE_URL}/rest/v1/posts?select=*&${filter}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

module.exports = async (req, res) => {
  const code = (req.query && req.query.code) || "";
  const host = req.headers.host || "yakultind.vercel.app";
  const canonicalUrl = `https://${host}/w/${encodeURIComponent(code)}`;

  let post = null;
  try {
    post = code ? await fetchPost(code) : null;
  } catch (err) {
    post = null; // gagal ambil data -> tetap balas fallback di bawah, jangan error 500 ke bot
  }

  const siteName = "Yakultind";
  const title = post ? post.judul : "Yakultind";
  const photos = post && Array.isArray(post.foto_urls) ? post.foto_urls : [];
  const image = photos[0] || `https://${host}/favicon.png`;
  const tagText = post && post.tags
    ? post.tags.split(",").map((t) => t.trim()).filter(Boolean).join(", ")
    : "";
  const description = post
    ? `${post.judul} — kategori ${post.kategori || "Umum"}${tagText ? ` (${tagText})` : ""} di Yakultind.`
    : "Yakultind — kumpulan foto dan link terbaru, ditata rapi dan mudah dicari.";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonicalUrl}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${escapeHtml(siteName)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${canonicalUrl}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<p><a href="${canonicalUrl}">${escapeHtml(title)}</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache singkat di edge Vercel supaya tidak query Supabase di setiap crawl,
  // tapi tetap update kalau post diedit (5 menit).
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
  res.status(200).send(html);
};

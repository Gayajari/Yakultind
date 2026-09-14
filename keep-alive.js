/* /api/keep-alive.js — dipanggil otomatis oleh Vercel Cron (lihat "crons" di vercel.json),
   setiap 3 hari sekali. Tugasnya cuma satu: baca 1 baris data dari Supabase, super ringan,
   supaya Supabase menganggap project ini "ada aktivitas" dan tidak di-pause otomatis
   (Supabase free tier auto-pause kalau 7 hari tidak ada aktivitas sama sekali).

   Tidak butuh library tambahan (bukan pakai @supabase/supabase-js) — cukup fetch() biasa
   ke REST API Supabase, jadi tidak perlu npm install/package.json sama sekali.

   Key yang dipakai di sini SAMA PERSIS dengan yang sudah terlihat publik di app.js —
   ini "anon key" yang memang didesain aman untuk terbuka (dibatasi lewat Row Level
   Security di Supabase, bukan lewat kerahasiaan key-nya), jadi tidak menambah risiko apa pun. */

const SUPABASE_URL = "https://agnxigqfdymitvqoapyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbnhpZ3FmZHltaXR2cW9hcHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDU2MzgsImV4cCI6MjEwMjUyMTYzOH0.g_BvtGPk7uVNuuhlMz7aYil3ZHfQvw8WPPdWpdQ0G3g";

export default async function handler(req, res) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await resp.json();
    res.status(200).json({
      ok: true,
      message: 'Supabase keep-alive ping berhasil',
      checkedAt: new Date().toISOString(),
      rowsReturned: Array.isArray(data) ? data.length : 0
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}

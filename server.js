const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_KEY = process.env.ADMIN_KEY;
const LICENSE_SECRET = process.env.LICENSE_SECRET;

if (!ADMIN_KEY || !LICENSE_SECRET) {
  console.warn("WARNING: ADMIN_KEY and LICENSE_SECRET should be set in Render Environment.");
}

app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data.json");

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { licenses: {} };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { licenses: {} };
  }
}
function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function hashLicense(key) {
  return crypto.createHmac("sha256", LICENSE_SECRET || "missing-secret").update(String(key)).digest("hex");
}
function validLicense(key) {
  if (!key || !LICENSE_SECRET) return false;
  const db = loadDB();
  const h = hashLicense(key);
  const item = db.licenses[h];
  if (!item || item.revoked) return false;
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) return false;
  item.lastUsedAt = new Date().toISOString();
  saveDB(db);
  return true;
}
function admin(req) {
  return ADMIN_KEY && req.get("x-admin-key") === ADMIN_KEY;
}

const CORE_RULES = [
  "A4 Portrait printable worksheet.",
  "Target usia sesuai pilihan pengguna.",
  "Satu halaman hanya memiliki SATU aktivitas utama.",
  "Pertanyaan harus sangat mudah dan ramah anak.",
  "Harus ada tepat satu jawaban yang jelas benar.",
  "Tidak boleh ada jebakan, ambigu, atau dua jawaban benar.",
  "Objek dibuat besar, sederhana, dan mudah dibedakan.",
  "Instruksi singkat menggunakan Bahasa Indonesia sederhana.",
  "Background putih, garis tebal dan jelas, printer-friendly.",
  "Ruang kerja anak luas dan tidak padat.",
  "Tanpa watermark, mockup, frame dekoratif berlebihan, atau UI.",
  "Gunakan simple flat vector/cute vector sesuai pilihan.",
  "Komposisi bersih dan siap dicetak."
];

const ACTIVITY_RULES = {
  "Mewarnai": "Sediakan satu objek hewan besar dengan outline jelas untuk diwarnai.",
  "Mencocokkan": "Gunakan 2–4 pasangan sederhana dengan hubungan yang sangat jelas.",
  "Menghitung": "Gunakan 3–5 objek besar; satu pilihan jawaban benar dan mudah dihitung.",
  "Tracing": "Gunakan garis putus-putus tebal dengan pola sederhana untuk ditelusuri.",
  "Maze / Labirin": "Buat labirin sangat sederhana dengan satu jalur jelas dari awal ke tujuan.",
  "Pilih yang berbeda": "Tampilkan 3–5 objek; hanya satu yang jelas berbeda.",
  "Mengelompokkan": "Tampilkan kelompok objek yang mudah dibedakan berdasarkan satu ciri.",
  "Urutan": "Gunakan 3–4 langkah/pola sederhana dengan satu urutan yang jelas."
};

const SUBJECT_HINTS = {
  "Logika & problem solving": "Fokus pada pengamatan, mencocokkan, memilih, mengelompokkan, urutan, atau jalur sederhana.",
  "Warna & bentuk": "Fokus pada warna, bentuk, ukuran, dan pencocokan visual sederhana.",
  "Motorik halus": "Fokus pada tracing, garis, mengikuti jalur, dan kontrol tangan.",
  "Berhitung awal": "Fokus pada jumlah kecil, mencocokkan angka dengan jumlah, dan hitungan konkret."
};

function esc(v) {
  return String(v ?? "").replace(/[<>]/g, "");
}
function makePrompt(p, n) {
  const activity = esc(p.activity);
  const rule = ACTIVITY_RULES[p.activity] || "Gunakan aktivitas yang sangat sederhana dan jelas.";
  const hint = SUBJECT_HINTS[p.subject] || "";
  const style = esc(p.style || "Simple flat vector");
  const character = esc(p.character || "Hewan lucu");
  return `PAGE ${n} — IMAGE PROMPT

CREATE ONE ACTUAL PRINTABLE A4 PORTRAIT CHILDREN'S WORKSHEET IMAGE.
OUTPUT MUST BE THE ACTUAL WORKSHEET IMAGE, NOT A BLUEPRINT, OUTLINE, DESCRIPTION, ANSWER KEY, OR MARKDOWN.

Target usia: ${esc(p.age)}
Tema: ${esc(p.theme)}
Materi: ${esc(p.subject)}
PRIMARY ACTIVITY FOR THIS PAGE: ${activity}

ACTIVITY DESIGN:
${rule}
${hint}
Buat tingkat kesulitan sangat mudah agar anak memiliki peluang keberhasilan sekitar 90–95%.
Pastikan hanya ADA SATU jawaban yang benar dan terlihat jelas.
Jangan membuat soal jebakan, pilihan yang ambigu, objek terlalu kecil, atau detail berlebihan.

VISUAL:
Style: ${style}
Character: ${character}
Language: Bahasa Indonesia sederhana
Size: A4 Portrait
Production: Background putih, garis tebal dan jelas, ramah printer, ruang kerja luas, kontras jelas, tanpa watermark, tanpa mockup.

LAYOUT:
Judul singkat di bagian atas.
Satu instruksi pendek.
Satu aktivitas utama saja.
Objek besar dan mudah dikenali.
Sisakan whitespace yang cukup.
Jangan menambahkan aktivitas kedua, dekorasi yang mengganggu, atau answer key.

FINAL OUTPUT:
Generate the complete printable worksheet page as ONE finished image.`;
}

app.get("/health", (req,res) => res.json({ ok:true, service:"Worksheet Master Generator V5.1" }));

app.post("/api/activate", (req,res) => {
  const { licenseKey } = req.body || {};
  res.json({ valid: validLicense(licenseKey) });
});

app.post("/api/generate", (req,res) => {
  const { licenseKey, ...p } = req.body || {};
  if (!validLicense(licenseKey)) return res.status(403).json({ error:"License tidak valid atau sudah kedaluwarsa." });
  const pages = Math.min(Math.max(parseInt(p.pages || 5,10),1),100);
  const prompts = Array.from({length:pages},(_,i)=>makePrompt(p,i+1));
  res.json({ ok:true, prompts });
});

app.post("/api/admin/create-license", (req,res) => {
  if (!admin(req)) return res.status(401).json({ error:"Unauthorized" });
  const { licenseKey, expiresAt, note } = req.body || {};
  if (!licenseKey) return res.status(400).json({ error:"licenseKey required" });
  const db=loadDB();
  db.licenses[hashLicense(licenseKey)]={ createdAt:new Date().toISOString(), expiresAt:expiresAt||null, note:note||"", revoked:false };
  saveDB(db);
  res.json({ok:true});
});
app.post("/api/admin/revoke-license", (req,res) => {
  if (!admin(req)) return res.status(401).json({ error:"Unauthorized" });
  const { licenseKey }=req.body||{};
  const db=loadDB(), h=hashLicense(licenseKey);
  if(!db.licenses[h]) return res.status(404).json({error:"Not found"});
  db.licenses[h].revoked=true; db.licenses[h].revokedAt=new Date().toISOString(); saveDB(db);
  res.json({ok:true});
});
app.get("/api/admin/licenses", (req,res) => {
  if (!admin(req)) return res.status(401).json({ error:"Unauthorized" });
  const db=loadDB();
  res.json(Object.values(db.licenses).map(x=>({...x})));
});

app.get("*", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,"0.0.0.0",()=>console.log(`V5.1 running on port ${PORT}`));

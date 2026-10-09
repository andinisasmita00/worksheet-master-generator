const CORE_RULES = [
  "Satu halaman = satu aktivitas utama.",
  "Soal harus sangat mudah dan ramah anak.",
  "Setiap soal harus mempunyai tepat satu jawaban yang jelas.",
  "Hindari jebakan, pilihan ambigu, objek terlalu kecil, dan perbedaan yang samar.",
  "Gunakan objek besar, garis tebal, ruang kerja luas, dan komposisi sederhana.",
  "Untuk usia 2–3 tahun gunakan sekitar 3–5 objek; usia 4–5 tahun dapat menggunakan hingga 5–10 objek.",
  "Matching gunakan 2–4 pasangan; maze sederhana dengan satu jalur benar.",
  "Instruksi harus singkat dalam Bahasa Indonesia.",
  "Output harus berupa prompt untuk membuat GAMBAR WORKSHEET AKTUAL, bukan blueprint atau daftar isi.",
  "Ukuran A4 Portrait, background putih, printer-friendly, tanpa watermark dan tanpa mockup."
];

const ACTIVITY_RULES = {
  "Mewarnai": "Buat satu gambar utama dengan outline hitam tebal dan area besar yang mudah diwarnai.",
  "Mencocokkan": "Buat 2–4 pasangan objek yang sangat jelas; susunan kiri-kanan; satu pasangan benar untuk setiap objek.",
  "Tracing": "Buat garis putus-putus besar dan sederhana yang mudah diikuti anak.",
  "Menghitung": "Gunakan jumlah kecil dan jelas; minta anak menghitung lalu memilih/menandai jawaban yang benar.",
  "Maze": "Buat labirin sangat sederhana dengan satu jalur benar yang mudah terlihat.",
  "Lingkari": "Buat beberapa objek besar dan minta anak melingkari objek yang memenuhi satu kriteria yang jelas.",
  "Pilih": "Buat 2–4 pilihan besar dengan hanya satu jawaban yang benar.",
  "Urutkan": "Gunakan 3–4 gambar yang perbedaannya jelas untuk diurutkan."
};

const SUBJECT_HINTS = {
  "Logika & problem solving": "Fokus pada pengamatan sederhana, pencocokan, pilihan, urutan, dan hubungan sebab-akibat yang mudah.",
  "Warna & bentuk": "Fokus pada warna dan bentuk dasar dengan perbedaan yang sangat jelas.",
  "Pra-menulis": "Fokus pada koordinasi mata-tangan dan mengikuti garis sederhana.",
  "Berhitung": "Fokus pada pengenalan jumlah kecil dan konsep banyak-sedikit.",
  "Bahasa": "Fokus pada pengenalan gambar, kosakata sederhana, dan instruksi satu langkah."
};

function b64u(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function fromB64u(s) {
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}
async function verifyHmac(secret, message, sig) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]
  );
  return crypto.subtle.verify("HMAC", key, fromB64u(sig), new TextEncoder().encode(message));
}
async function makeLicense(secret, id, days) {
  const exp = Date.now() + days * 86400000;
  const payload = b64u(new TextEncoder().encode(JSON.stringify({id, exp})));
  const sig = b64u(await hmac(secret, payload));
  return `WS52.${payload}.${sig}`;
}
async function validLicense(secret, license) {
  try {
    const parts = String(license || "").split(".");
    if (parts.length !== 3 || parts[0] !== "WS52") return false;
    const ok = await verifyHmac(secret, parts[1], parts[2]);
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(fromB64u(parts[1])));
    return data && data.exp > Date.now();
  } catch {
    return false;
  }
}
function clean(v, fallback="") {
  return String(v ?? fallback).trim();
}
function promptForPage(cfg, pageNo) {
  const activity = clean(cfg.activity, "Mewarnai");
  const rule = ACTIVITY_RULES[activity] || "Buat satu aktivitas sederhana dengan satu jawaban yang jelas.";
  const subjectHint = SUBJECT_HINTS[clean(cfg.subject, "Logika & problem solving")] || "";
  const age = clean(cfg.age, "4–5 tahun");
  const theme = clean(cfg.theme, "Hewan lucu");
  const style = clean(cfg.style, "Simple flat vector");
  const character = clean(cfg.character, "Hewan lucu sebagai karakter");
  const language = clean(cfg.language, "Bahasa Indonesia");
  const size = clean(cfg.size, "A4 Portrait");

  return `PAGE ${pageNo} — IMAGE PROMPT

CREATE ONE ACTUAL PRINTABLE ${size.toUpperCase()} CHILDREN'S WORKSHEET IMAGE.

Target usia: ${age}
Tema: ${theme}
Materi: ${clean(cfg.subject, "Logika & problem solving")}
PRIMARY ACTIVITY FOR THIS PAGE: ${activity}

${rule}
${subjectHint}

Karakter visual: ${character}
Gaya ilustrasi: ${style}
Bahasa: ${language}

ATURAN WAJIB:
- Hanya SATU aktivitas utama pada halaman ini.
- Jangan menggabungkan aktivitas lain.
- Buat soal sangat mudah dan menyenangkan.
- Setiap soal harus memiliki TEPAT SATU jawaban yang benar.
- Tidak boleh ada soal jebakan atau pilihan yang bisa dianggap benar lebih dari satu.
- Gunakan objek besar, jelas, dan mudah dikenali.
- Instruksi maksimal satu kalimat pendek.
- Tata letak sederhana dengan ruang kerja luas.
- Background putih.
- Garis tebal, jelas, bersih, dan ramah printer.
- Hindari detail kecil, dekorasi berlebihan, dan elemen yang mengganggu.
- Jangan membuat blueprint, answer key, mockup, atau penjelasan.
- OUTPUT UTAMA HARUS BERUPA 1 GAMBAR WORKSHEET AKTUAL.
- Tanpa watermark, tanpa logo, tanpa bingkai mockup.

${clean(cfg.notes) ? "Catatan tambahan: " + clean(cfg.notes) : ""}

Buat halaman worksheet yang siap dicetak dan langsung dapat dikerjakan anak.`;
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "https://hoppscotch.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://hoppscotch.io",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (url.pathname === "/health") return json({ok:true, version:"5.2-cloudflare"});

    if (url.pathname === "/api/activate" && request.method === "POST") {
      const body = await request.json().catch(()=>({}));
      const ok = await validLicense(env.LICENSE_SECRET || "", body.licenseKey);
      return json({ok, message: ok ? "License aktif." : "License tidak valid atau sudah kedaluwarsa."}, ok ? 200 : 401);
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      const body = await request.json().catch(()=>({}));
      const ok = await validLicense(env.LICENSE_SECRET || "", body.licenseKey);
      if (!ok) return json({ok:false, message:"License tidak valid atau sudah kedaluwarsa."}, 401);

      const cfg = body.config || {};
      let pages = Math.max(1, Math.min(100, Number(cfg.pages || 5)));
      const activity = clean(cfg.activity, "Mewarnai");
      const result = [];
      for (let i=1; i<=pages; i++) result.push(promptForPage({...cfg, activity}, i));

      return json({
        ok:true,
        version:"5.2-cloudflare",
        blueprint:{
          productName: clean(cfg.productName, "Worksheet Hewan Seru"),
          age: clean(cfg.age, "4–5 tahun"),
          subject: clean(cfg.subject, "Logika & problem solving"),
          theme: clean(cfg.theme, "Hewan lucu"),
          activity,
          pages,
          size: clean(cfg.size, "A4 Portrait"),
          style: clean(cfg.style, "Simple flat vector"),
          character: clean(cfg.character, "Hewan lucu sebagai karakter"),
          language: clean(cfg.language, "Bahasa Indonesia")
        },
        prompts: result
      });
    }

    if (url.pathname === "/api/admin/create-license" && request.method === "POST") {
      const admin = request.headers.get("x-admin-key") || "";
      if (!env.ADMIN_KEY || admin !== env.ADMIN_KEY) return json({ok:false, message:"Admin key salah."}, 403);
      const body = await request.json().catch(()=>({}));
      const id = clean(body.id, "CUSTOMER");
      const days = Math.max(1, Math.min(3650, Number(body.days || 30)));
      const licenseKey = await makeLicense(env.LICENSE_SECRET || "", id, days);
      return json({ok:true, licenseKey, days});
    }

    if (url.pathname === "/api/admin/rules" && request.method === "GET") {
      return json({ok:true, message:"Core rules are intentionally kept server-side."});
    }

    if (url.pathname.startsWith("/api/")) return json({ok:false, message:"Not found"}, 404);

    return env.ASSETS.fetch(request);
  }
};

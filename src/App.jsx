import React, { useState, useRef } from 'react';
import { 
  BookOpen, FileText, Calendar, Layout, 
  LogOut, Printer, Code, Loader2, AlertCircle, 
  ChevronRight, Settings, Check, Download, AlertTriangle, CheckCircle2, RefreshCw
} from 'lucide-react';

const LOGO_URL = "https://cdn.phototourl.com/free/2026-07-19-523222fc-dbc8-4b99-8a72-0a909f4d6586.png";
const apiKey = ""; // Dikosongkan untuk runtime/Vercel environment variables
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

const generateWithAI = async (systemPrompt, userQuery) => {
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    }
  };
  
  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.replace(/```html/gi, '').replace(/```/g, '');
  return text.trim();
};

const getCommonRules = (d) => `
PENTING & WAJIB:
1. Hasilkan HANYA kode HTML murni tanpa dibungkus markdown \`\`\`html.
2. JANGAN sertakan penjelasan apa pun sebelum/sesudah kode HTML.
3. Dokumen ini akan diekspor ke Microsoft Word. Gunakan tabel HTML biasa (<table border="1" style="border-collapse: collapse; width: 100%;">).
4. Terapkan warna background sel sesuai instruksi menggunakan inline CSS (contoh: style="background-color: #1a3a5c; color: white;").
5. Untuk pindah halaman gunakan: <div style="page-break-before: always;"></div>
6. WAJIB CANTUMKAN BLOK TANDA TANGAN di bagian paling akhir SETIAP dokumen menggunakan tabel HTML tak bergaris (border="0" style="width: 100%; text-align: center; margin-top: 2rem; page-break-inside: avoid;").
   Format baris/kolomnya sebagai berikut (Pastikan 2 kolom sejajar):
   - Kolom Kiri: Mengetahui,<br>Kepala Sekolah<br><br><br><br><b>${d.kepsek}</b><br>NIP. ${d.nipKepsek}
   - Kolom Kanan: ${d.kotaTanggal}<br>Guru Mata Pelajaran<br><br><br><br><b>${d.guru}</b><br>NIP. ${d.nipGuru}
`;

const getPromptAnalisisCP = (d) => `
Buat dokumen **ANALISIS CAPAIAN PEMBELAJARAN**.
Data Identitas:
- Provinsi/Dinas: ${d.provinsiKota} / ${d.dinas}
- Sekolah: ${d.sekolah} (${d.alamat})
- Mapel/Singkatan: ${d.mapel} (${d.singkatan})
- Fase/Kelas: ${d.fase}
- Tahun Pelajaran: ${d.tahun}
- Guru: ${d.guru} (NIP: ${d.nipGuru})
- Kepsek: ${d.kepsek} (NIP: ${d.nipKepsek})
- TTD: ${d.kotaTanggal}

CP Umum: ${d.cpUmum}
CP Elemen: ${d.cpElemen}

INSTRUKSI STRUKTUR DOKUMEN (9 Bagian Wajib Harus Ada):
1. KOP SURAT & JUDUL: "ANALISIS CAPAIAN PEMBELAJARAN"
2. BAGIAN A — IDENTITAS: Tabel 2 kolom.
3. BAGIAN B — RASIONAL MATA PELAJARAN: Tabel 3 kolom (No | Uraian | Deskripsi).
4. BAGIAN C — TUJUAN MATA PELAJARAN: Tabel 3 kolom (No | Tujuan | Indikator Umum).
5. BAGIAN D — KARAKTERISTIK MATA PELAJARAN & ELEMEN CP: Tabel 4 kolom.
6. BAGIAN E — CAPAIAN PEMBELAJARAN FASE: Tabel 4 kolom.
7. BAGIAN F — PENJABARAN KATA KERJA OPERASIONAL (KKO) PER ELEMEN: Tabel 3 kolom.
8. BAGIAN G — KETERKAITAN DENGAN 8 DIMENSI PROFIL LULUSAN: Tabel 4 kolom.
9. PENUTUP: Tabel TTD Kepsek (Kiri) dan Guru (Kanan).

Pastikan tabel HTML menggunakan warna header Biru Tua (#1a3a5c) dengan teks putih.
${getCommonRules(d)}
`;

const getPromptTP = (d) => `
Buat dokumen **TUJUAN PEMBELAJARAN (TP)** KHUSUS UNTUK 1 SEMESTER (Semester ${d.semester}).
Identitas: ${d.sekolah} | ${d.mapel} | ${d.fase} | ${d.tahun} | Semester: ${d.semester} | Total Waktu: ${d.alokasiWaktu}.
Elemen CP:
${d.elemenList}
Daftar TP (Hasilkan dan uraikan TP yang terukur HANYA untuk Semester ${d.semester} berdasarkan Elemen CP yang diberikan):
Buat kode TP terstruktur misal: ${d.singkatan}-${d.fase.split('/')[0].replace('Fase ','')}-ELMN-001.

INSTRUKSI FORMAT HTML:
- Judul: "TUJUAN PEMBELAJARAN (SEMESTER ${d.semester.toUpperCase()})"
- Bagian A: Identitas
- Bagian B: PANDUAN KODE TP
- Bagian C: DAFTAR TUJUAN PEMBELAJARAN (Tabel 6 kolom: No | Kode TP | Elemen CP | Tujuan Pembelajaran | Aspek | Alokasi JP).
  Kelompokkan berdasarkan Elemen dengan baris Header Elemen.
- Bagian D: REKAPITULASI ALOKASI WAKTU PER ELEMEN.
${getCommonRules(d)}
`;

const getPromptATP = (d) => `
Buat dokumen **ALUR TUJUAN PEMBELAJARAN (ATP)** KHUSUS UNTUK 1 SEMESTER (Semester ${d.semester}).
Identitas: ${d.sekolah} | ${d.mapel} | ${d.fase} | Semester: ${d.semester}.
Daftar TP: ${d.dataSebelumnya}

INSTRUKSI FORMAT HTML:
- Judul: "ALUR TUJUAN PEMBELAJARAN (SEMESTER ${d.semester.toUpperCase()})"
- Bagian A: Identitas (6 kolom tabel 2 baris).
- Bagian B: DIAGRAM ALUR TP (Kotak berisi alur kode TP dengan tanda panah →).
- Bagian C: TABEL ATP (8 kolom: No | Kode TP | Elemen CP | Tujuan Pembelajaran | Materi Pokok | Kompetensi & Variasi | 8 Dimensi | Alokasi JP | Semester). Pastikan semua baris diisi Semester ${d.semester}.
- Bagian D: REKAPITULASI (Total JP Semester ${d.semester}).
${getCommonRules(d)}
`;

const getPromptProta = (d) => `
Buat dokumen **PROGRAM TAHUNAN (PROTA)**. Fokuskan penjabaran hanya pada Semester ${d.semester}.
Identitas: ${d.sekolah} | ${d.mapel} | ${d.fase} | JP/Minggu: ${d.jpMinggu}.
Kalender Pendidikan: ${d.kalender}
Daftar TP (Hanya untuk semester ${d.semester}): ${d.dataSebelumnya}

INSTRUKSI FORMAT HTML:
- Judul: "PROGRAM TAHUNAN"
- Bagian A: Identitas
- Bagian B: DISTRIBUSI MINGGU EFEKTIF SEMESTER ${d.semester.toUpperCase()} (Tabel Kalender 7 Kolom: Sem | Bulan | Ming. Kalender | Tdk Efektif | Efektif | JP | Keterangan).
- Bagian C: RENCANA PROGRAM TAHUNAN SEMESTER ${d.semester.toUpperCase()} (5 Kolom: No | Kode TP | Tujuan & Materi | Elemen | JP | Semester).
${getCommonRules(d)}
`;

const getPromptProsem = (d) => `
Buat dokumen **PROGRAM SEMESTER ${d.semester.toUpperCase()} (PROSEM)**.
Identitas: ${d.sekolah} | ${d.mapel} | ${d.fase} | Semester: ${d.semester}.
Kalender Pendidikan: ${d.kalender}
Daftar TP: ${d.dataSebelumnya}

INSTRUKSI FORMAT HTML:
- Judul: "PROGRAM SEMESTER ${d.semester.toUpperCase()}"
- Bagian Legenda Warna: Biru(Aktif), Merah(Libur), Kuning(PTS), Hijau(PAS).
- TABEL MATRIKS PROSEM: Kolom tetap (No, Kode TP, Tujuan & Materi, JP) dan kolom bulan-bulan pada semester ${d.semester} tersebut.
  Gunakan inline CSS background-color pada sel tabel matriks untuk membedakan JP (Biru #d0e4f7), Libur (Merah #ffd6d6), PTS (Kuning #fff3cd), PAS (Hijau #d4edda).
${getCommonRules(d)}
`;

const getPromptKKTP = (d) => `
Buat dokumen **KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)** UNTUK SEMESTER ${d.semester.toUpperCase()} menggunakan Pedoman Baku Kementerian Pendidikan.
Daftar TP (Semester ${d.semester}): ${d.dataSebelumnya}

PANDUAN PEMILIHAN PENDEKATAN (MANDATORY RULE: HANYA PILIH SATU PENDEKATAN UNTUK TIAP TP):
Analisis setiap TP. Berdasarkan karakteristik Kompetensi dan KKO (Kata Kerja Operasional)-nya, pilih pendekatan yang paling tepat:
1. PENDEKATAN 1: DESKRIPSI KRITERIA
   - Cocok untuk TP yang dominan afektif/observasi perilaku atau keterampilan dasar harian.
   - Gunakan tabel 6 kolom (No | Indikator Asesmen (Kriteria) | Baru Berkembang | Layak | Cakap | Mahir).
   - Cantumkan "Kesimpulan Penentuan Ketuntasan" di akhir tabel.
2. PENDEKATAN 2: RUBRIK
   - Cocok untuk TP yang mengukur hasil produk, unjuk kerja (performance), karya esai, projek, atau praktik.
   - Gunakan tabel 5 kolom (Kriteria Asesmen | Baru Berkembang (Skor 1) | Layak (Skor 2) | Cakap (Skor 3) | Mahir (Skor 4)).
   - Cantumkan "Aturan Intervensi/Tindak Lanjut Hasil Rubrik" di akhir tabel.
3. PENDEKATAN 3: INTERVAL NILAI
   - Cocok untuk TP yang diuji dengan tes tertulis (pilihan ganda, esai) atau tes sumatif formal.
   - Gunakan tabel 3 kolom (Interval Skor | Kategori Ketercapaian | Tindak Lanjut Hasil Penilaian).
     * 0% - 65% : Perlu Bimbingan (Belum Tuntas)
     * 66% - 85% : Cukup (Tuntas)
     * 86% - 100%: Sangat Baik (Tuntas)

STRUKTUR FORMAT OUTPUT HTML (ATURAN MUTLAK: IDENTITAS 1X DI ATAS, TTD 1X DI BAWAH):
BAGIAN 1: KOP & IDENTITAS (TAMPIL HANYA SATU KALI DI PALING ATAS DOKUMEN)
BAGIAN 2: DAFTAR KKTP (ULANGI UNTUK SETIAP TP)
BAGIAN 3: PENGESAHAN (TAMPIL HANYA SATU KALI DI PALING BAWAH DOKUMEN)

${getCommonRules(d)}
`;

// PROMPT MODUL AJAR DISESUAIKAN DENGAN REFERENSI (DEEP LEARNING, SINTAKS PBL, & LAMPIRAN LKPD)[cite: 5]
const getPromptModul = (d, tpObj) => `
Anda adalah seorang Ahli Kurikulum Merdeka yang merancang Modul Ajar Presisi Berorientasi Deep Learning (Mindful, Meaningful, Joyful) sesuai standar dokumen referensi resmi[cite: 5].

Buat dokumen MODUL AJAR yang komprehensif mengikuti struktur, format tabel, dan komponen persis seperti urutan di bawah ini:

Mata Pelajaran: ${d.mapel}
Fase / Kelas: ${d.fase}
Semester: ${d.semester}
Materi Pokok / Topik: ${tpObj.materi}
Tujuan Pembelajaran (TP) Utama: [${tpObj.kode}] ${tpObj.tujuan}
Model Pembelajaran: ${d.modelPembelajaran}
Penyusun: ${d.guru} / ${d.tahun.split('/')[0]}
Alokasi Waktu Sesi Ini: ${tpObj.pertemuanCount} Pertemuan (${tpObj.pertemuanCount * 60} menit atau setara)[cite: 5]

STRUKTUR FORMAT DOKUMEN MODUL AJAR HTML WAJIB:

<h2 style="text-align: center; color: #1a3a5c;">MODUL AJAR ${d.mapel.toUpperCase()} SMP</h2>
<h3 style="text-align: center; color: #1a3a5c; margin-bottom: 20px;">FASE ${d.fase.split('/')[0].replace('Fase ','').toUpperCase()}</h3>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;" border="1">
  <tr>
    <td style="width: 30%; font-weight: bold; padding: 6px; background-color: #f2f2f2;">A. Identitas Modul</td>
    <td style="padding: 6px;">
      <strong>Modul:</strong> ${d.mapel}<br>
      <strong>Penyusun/Tahun:</strong> ${d.guru} / ${d.tahun.split('/')[0]}<br>
      <strong>Kelas/Fase Capaian:</strong> ${d.fase.split('/')[1] || 'VII'} / ${d.fase.split('/')[0]}<br>
      <strong>Elemen/Topik:</strong> ${tpObj.materi}<br>
      <strong>Alokasi Waktu:</strong> ${tpObj.pertemuanCount * 60} menit (${tpObj.pertemuanCount} Pertemuan)<br>
      <strong>Target Peserta Didik:</strong> Regular/tipikal<br>
      <strong>Capaian Pembelajaran:</strong> ${d.cpUmum}
    </td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 6px; background-color: #f2f2f2;">B. Dimensi Profil Lulusan</td>
    <td style="padding: 6px;">Penalaran kritis, kolaborasi, kreativitas, dan komunikasi[cite: 5]</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 6px; background-color: #f2f2f2;">C. Model dan Metode</td>
    <td style="padding: 6px;">
      a. Model Pembelajaran: ${d.modelPembelajaran}<br>
      b. Metode Pembelajaran: Diskusi kelas, diskusi kelompok kecil, presentasi[cite: 5].<br>
      c. Pendekatan Pembelajaran: Deep Learning (Pembelajaran Mendalam)[cite: 5]
    </td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 6px; background-color: #f2f2f2;">D. Mitra Pembelajaran</td>
    <td style="padding: 6px;">Masyarakat sekitar (Petani, pelaku usaha, atau narasumber relevan)[cite: 5]</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 6px; background-color: #f2f2f2;">E. Lingkungan Pembelajaran</td>
    <td style="padding: 6px;">
      1) Ruang Fisik: Lingkungan sekitar sekolah / kelas[cite: 5]<br>
      2) Ruang Virtual: Google Form untuk refleksi, platform digital asesmen[cite: 5]<br>
      3) Budaya belajar: Kolaboratif, berpartisipasi aktif, dan rasa ingin tahu[cite: 5]
    </td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 6px; background-color: #f2f2f2;">F. Pemanfaatan Digital</td>
    <td style="padding: 6px;">Asesmen interaktif menggunakan platform digital (Wordwall / Quizizz)[cite: 5]</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 6px; background-color: #f2f2f2;">G. Sarana dan Prasarana</td>
    <td style="padding: 6px;">
      ➤ <strong>Sarana:</strong> Laptop, HP, LCD, Proyektor, Kuota Internet[cite: 5]<br>
      ➤ <strong>Prasarana:</strong> Buku peserta didik, buku guru, LKPD[cite: 5]
    </td>
  </tr>
</table>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">H. Tujuan Pembelajaran</h4>
<ol style="margin-top: 5px; margin-bottom: 15px;">
  <li>Peserta didik memahami konsep dasar mengenai ${tpObj.materi} melalui diskusi kelas dengan tepat[cite: 5].</li>
  <li>Peserta didik dapat menganalisis penyebab dan dampak dari ${tpObj.materi} terhadap makhluk hidup dan lingkungan[cite: 5].</li>
  <li>Peserta didik dapat merancang upaya-upaya pencegahan dan penanggulangan terkait ${tpObj.materi}[cite: 5].</li>
  <li>Peserta didik dapat menyajikan hasil rancangan upaya pencegahan dalam bentuk karya kreatif[cite: 5].</li>
</ol>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">I. Pertanyaan Pemantik</h4>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li>Apa saja dampak utama dari permasalahan ${tpObj.materi} terhadap kehidupan manusia dan lingkungan?[cite: 5]</li>
  <li>Bagaimana fenomena ini memengaruhi ketersediaan sumber daya dan kehidupan sehari-hari?[cite: 5]</li>
  <li>Solusi dan upaya nyata apa yang dapat kita lakukan untuk mengatasi hal tersebut?[cite: 5]</li>
</ul>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">J. Materi Esensial</h4>
<p><strong>Topik: ${tpObj.materi}</strong></p>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li>Pengertian dan konsep dasar ${tpObj.materi}[cite: 5].</li>
  <li>Faktor penyebab dan dampak langsung maupun tidak langsung terhadap lingkungan[cite: 5].</li>
  <li>Upaya mitigasi, adaptasi, serta solusi pemecahan masalah[cite: 5].</li>
</ul>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">K. Langkah-langkah Pembelajaran Mendalam (Deep Learning)</h4>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px;" border="1">
  <thead>
    <tr style="background-color: #1a3a5c; color: white;">
      <th style="padding: 8px; width: 15%;">Kegiatan Pembelajaran</th>
      <th style="padding: 8px; width: 20%;">Sintaks Problem Based Learning</th>
      <th style="padding: 8px; width: 50%;">Deskripsi Kegiatan (Prinsip & Pengalaman Belajar)</th>
      <th style="padding: 8px; width: 15%;">Alokasi Waktu</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px; font-weight: bold;">Pendahuluan</td>
      <td style="padding: 8px;">Menciptakan situasi (Memahami)[cite: 5]</td>
      <td style="padding: 8px;">• Guru mengucapkan salam, berdoa, dan mengecek kehadiran[cite: 5].<br>• Melakukan mindfulness (berkesadaran)[cite: 5].<br>• Guru menampilkan stimulus/gambar fenomena terkait ${tpObj.materi}[cite: 5].</td>
      <td style="padding: 8px;">15 menit[cite: 5]</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold;" rowspan="4">Kegiatan Inti</td>
      <td style="padding: 8px;">Tahap 1: Mengorientasikan peserta didik pada masalah[cite: 5]</td>
      <td style="padding: 8px;">• Guru membagikan bahan bacaan/artikel terkait ${tpObj.materi}[cite: 5].<br>• Peserta didik merumuskan permasalahan utama[cite: 5].</td>
      <td style="padding: 8px;" rowspan="4">70 menit</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Tahap 2: Mengorganisasi peserta didik untuk belajar[cite: 5]</td>
      <td style="padding: 8px;">• Siswa dibagi ke dalam kelompok heterogen[cite: 5].<br>• Guru membagikan LKPD[cite: 5].</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Tahap 3: Membimbing penyelidikan individual/kelompok[cite: 5]</td>
      <td style="padding: 8px;">• Peserta didik berdiskusi mencari solusi dari buku/internet[cite: 5].<br>• Guru memberikan scaffolding[cite: 5].</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Tahap 4: Mengembangkan dan menyajikan hasil karya[cite: 5]</td>
      <td style="padding: 8px;">• Kelompok menyusun laporan/hasil karya kreatif[cite: 5].<br>• Presentasi di depan kelas[cite: 5].</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold;">Penutup</td>
      <td style="padding: 8px;">Tahap 5: Menganalisis & mengevaluasi proses pemecahan masalah[cite: 5]</td>
      <td style="padding: 8px;">• Evaluasi dan kesimpulan bersama[cite: 5].<br>• Refleksi pembelajaran[cite: 5].<br>• Kuis formatif penutup (Wordwall)[cite: 5].</td>
      <td style="padding: 8px;">15 menit[cite: 5]</td>
    </tr>
  </tbody>
</table>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">L. Penilaian atau Asesmen</h4>
<ol style="margin-top: 5px; margin-bottom: 15px;">
  <li><strong>Jenis Asesmen:</strong> Diagnostik non-kognitif, Formatif (proses diskusi), dan Sumatif[cite: 5].</li>
  <li><strong>Metode & Instrumen:</strong> Lembar pengamatan kinerja kelompok, rubrik penilaian dimensi profil lulusan[cite: 5].</li>
</ol>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">M. Refleksi Guru dan Peserta Didik</h4>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li><strong>Refleksi Guru:</strong> Apakah tujuan pembelajaran tercapai dengan model ${d.modelPembelajaran}?[cite: 5]</li>
  <li><strong>Refleksi Peserta Didik:</strong> Bagian mana yang paling menarik dan bermanfaat?[cite: 5]</li>
</ul>

<div style="page-break-before: always;"></div>
<h3 style="text-align: center; color: #1a3a5c;">LAMPIRAN: LEMBAR KERJA PESERTA DIDIK (LKPD)[cite: 5]</h3>

<div style="border: 2px solid #1a3a5c; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
  <h4 style="text-align: center; color: #1a3a5c; margin-top: 0;">LKPD: ANALISIS DAN SOLUSI ${tpObj.materi.toUpperCase()}</h4>
  <table style="width: 100%; border: none; margin-bottom: 15px;" border="0">
    <tr>
      <td style="border: none; padding: 4px;"><strong>Nama Anggota Kelompok:</strong><br>1. .........................................<br>2. .........................................</td>
      <td style="border: none; padding: 4px; text-align: right;"><strong>Kelas:</strong> ${d.fase.split('/')[1] || 'VII'}<br><strong>Tanggal:</strong> .........................</td>
    </tr>
  </table>

  <p><strong>A. Tujuan:</strong> Menganalisis penyebab, dampak, serta merancang solusi terkait ${tpObj.materi}[cite: 5].</p>
  <p><strong>B. Rumusan Masalah:</strong> Deskripsikan permasalahan utama berdasarkan studi kasus/bacaan[cite: 5]!</p>
  <div style="border: 1px dashed #718096; min-height: 50px; padding: 8px; margin-bottom: 10px; color: #a0aec0; font-style: italic;">Tuliskan hasil diskusi kelompok di sini...</div>

  <p><strong>C. Analisis Penyebab & Dampak:</strong> Tentukan faktor pendorong dan dampak nyata[cite: 5].</p>
  <div style="border: 1px dashed #718096; min-height: 50px; padding: 8px; margin-bottom: 10px; color: #a0aec0; font-style: italic;">Tuliskan analisis di sini...</div>

  <p><strong>D. Mencari Solusi / Mitigasi:</strong> Rancanglah upaya pencegahan atau penanggulangan terbaik[cite: 5].</p>
  <div style="border: 1px dashed #718096; min-height: 50px; padding: 8px; margin-bottom: 10px; color: #a0aec0; font-style: italic;">Tuliskan solusi kreatif di sini...</div>

  <p><strong>E. Kesimpulan:</strong> Buatlah kesimpulan singkat[cite: 5].</p>
  <div style="border: 1px dashed #718096; min-height: 40px; padding: 8px; color: #a0aec0; font-style: italic;">Tuliskan kesimpulan di sini...</div>
</div>

${getCommonRules(d)}
`;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  if (!isLoggedIn) return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  return <Dashboard onLogout={() => setIsLoggedIn(false)} />;
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Badiangpunya' || password === '') onLogin();
    else setError('Password salah.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src={LOGO_URL} alt="Logo" className="mx-auto h-32 w-32 drop-shadow-md animate-bounce" />
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Generator Perangkat Ajar</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md py-3 px-3" placeholder="Password" />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <button type="submit" className="w-full py-3 px-4 rounded-md shadow-sm text-white bg-blue-900 hover:bg-blue-800">Masuk</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('identitas');
  const modulPreviewRef = useRef(null);
  const [appData, setAppData] = useState({
    provinsiKota: 'Pemerintah Kabupaten Kolaka Timur', dinas: 'Dinas Pendidikan dan Kebudayaan',
    sekolah: 'SMP Negeri 1 Poli-Polia', alamat: 'Jl. Drs.H. Abdullah Silondae No.1A',
    mapel: 'Ilmu Pengetahuan Sosial', singkatan: 'IPS', fase: 'Fase D / Kelas VII',
    tahun: '2026/2027', semester: '1 (Ganjil)', alokasiWaktu: '36 JP / Semester',
    jpMinggu: '2 JP/Minggu', jpPertemuan: '2 JP (80 Menit)', guru: 'Badiang,S.Pd.',
    nipGuru: '198010072005021003', kepsek: 'Badiang, S.Pd.,M.Pd.', nipKepsek: '19801007 200502 1 003',
    kotaTanggal: 'Poli-Polia, 14 Juli 2026', elemenList: '1 | PK | Pemahaman Konsep | KP | Keterampilan Proses',
    cpUmum: 'Mata pelajaran Ilmu Pengetahuan Sosial bertujuan membekali peserta didik...',
    cpElemen: 'Pemahaman Konsep: Memahami Lingkungan Sekitar...',
    kalender: 'Juli | 5 | 3 | SPMB & MPLS\nAgustus | 4 | 4 | Efektif',
    rentangNilai: 'Level 1: 0-55 | D\nLevel 4: 86-100 | A',
    modelPembelajaran: 'Problem Based Learning (PBL)', dataSebelumnya: ''
  });

  const [generatedDocs, setGeneratedDocs] = useState({ cp: '', tp: '', atp: '', prota: '', prosem: '', kktp: '', modul: '' });
  const [extractedTPs, setExtractedTPs] = useState([]);
  const [selectedTPIndex, setSelectedTPIndex] = useState(0);
  const [generatedModuls, setGeneratedModuls] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => setAppData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const parseATPForModules = (atpHtmlString) => {
    try {
      const doc = new DOMParser().parseFromString(atpHtmlString, 'text/html');
      const rawTps = [];
      doc.querySelectorAll('table').forEach(table => {
        const headerRow = table.querySelector('tr');
        if (headerRow && headerRow.textContent.toLowerCase().includes('kode tp')) {
          table.querySelectorAll('tr').forEach((row, index) => {
             if(index === 0) return;
             const cells = row.querySelectorAll('td');
             if (cells.length >= 7) {
                 const kode = cells[1]?.textContent.trim();
                 const tujuan = cells[3]?.textContent.trim();
                 const materi = cells[4]?.textContent.trim();
                 const jpStr = cells[7]?.textContent.trim();
                 if(kode && tujuan && kode.length > 3) {
                     const jpNum = parseInt(jpStr.match(/\d+/)?.[0] || 0);
                     const jpPerPertemuan = parseInt(appData.jpPertemuan.match(/\d+/)?.[0] || 2);
                     rawTps.push({ kode, tujuan, materi: materi || 'Materi Umum', jp: jpNum, pertemuan: Math.max(1, Math.ceil(jpNum / jpPerPertemuan)) });
                 }
             }
          });
        }
      });
      const chunkedTPs = [];
      Array.from(new Map(rawTps.map(item => [item.kode, item])).values()).forEach(tp => {
        let currentMeeting = 1; let chunkIndex = 1;
        while (currentMeeting <= tp.pertemuan) {
          const end = Math.min(currentMeeting + 1, tp.pertemuan);
          chunkedTPs.push({ ...tp, displayTitle: `[${tp.kode}] Sesi ${chunkIndex}: Pert ${currentMeeting}-${end}`, startMeeting: currentMeeting, endMeeting: end, pertemuanCount: end - currentMeeting + 1, id: `${tp.kode}_${currentMeeting}_${end}` });
          currentMeeting += 2; chunkIndex++;
        }
      });
      if(chunkedTPs.length > 0) { setExtractedTPs(chunkedTPs); setSelectedTPIndex(0); }
    } catch(err) { console.error(err); }
  };

  const handleGenerateSingle = async (docType) => {
    setIsGenerating(true); setErrorMsg(''); let currentData = { ...appData };
    try {
      let result = '';
      if (docType === 'cp') result = await generateWithAI(getCommonRules(currentData), getPromptAnalisisCP(currentData));
      else if (docType === 'tp') result = await generateWithAI(getCommonRules(currentData), getPromptTP(currentData));
      else if (docType === 'atp') {
         if (!generatedDocs.tp) throw new Error("Generate TP terlebih dahulu!");
         currentData.dataSebelumnya = generatedDocs.tp;
         result = await generateWithAI(getCommonRules(currentData), getPromptATP(currentData));
         parseATPForModules(result);
      } else {
         if (!generatedDocs.atp) throw new Error("Generate ATP terlebih dahulu!");
         currentData.dataSebelumnya = generatedDocs.atp;
         if (docType === 'prota') result = await generateWithAI(getCommonRules(currentData), getPromptProta(currentData));
         else if (docType === 'prosem') result = await generateWithAI(getCommonRules(currentData), getPromptProsem(currentData));
         else if (docType === 'kktp') result = await generateWithAI(getCommonRules(currentData), getPromptKKTP(currentData));
      }
      setGeneratedDocs(prev => ({ ...prev, [docType]: result })); setProgressMsg('Selesai!'); setTimeout(() => setProgressMsg(''), 2000);
    } catch (err) { setErrorMsg(err.message); } finally { setIsGenerating(false); }
  };

  const handleGenerateModul = async (tpIndex = selectedTPIndex) => {
    if (extractedTPs.length === 0) return;
    setIsGenerating(true); setErrorMsg(''); const targetTP = extractedTPs[tpIndex];
    try {
      const modul = await generateWithAI(getCommonRules(appData), getPromptModul(appData, targetTP));
      setGeneratedModuls(prev => ({ ...prev, [targetTP.id]: modul }));
      setProgressMsg('Berhasil!'); setTimeout(() => { setProgressMsg(''); modulPreviewRef.current?.scrollIntoView(); }, 1500);
    } catch (err) { setErrorMsg(err.message); } finally { setIsGenerating(false); }
  };

  const getModulContentForExport = () => {
     return extractedTPs.map(tp => generatedModuls[tp.id]).filter(Boolean).join('<div style="page-break-before: always;"></div>');
  };

  const handleDownloadWord = () => {
    let content = activeTab === 'modul' ? getModulContentForExport() : generatedDocs[activeTab];
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export Doc</title><style>body { font-family: Calibri; } table { width: 100%; border-collapse: collapse; } th, td { border: 1pt solid black; padding: 5pt; }</style></head><body>`;
    const footer = "</body></html>";
    const blob = new Blob(['\ufeff', header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ADM_${activeTab.toUpperCase()}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const tabs = [
    { id: 'identitas', icon: Settings, label: 'Data Global' }, 
    { id: 'cp', icon: FileText, label: '1. CP' },
    { id: 'tp', icon: Layout, label: '2. TP' }, 
    { id: 'atp', icon: ChevronRight, label: '3. ATP' },
    { id: 'prota', icon: Calendar, label: '4. Prota' }, 
    { id: 'prosem', icon: Calendar, label: '5. Prosem' },
    { id: 'kktp', icon: CheckCircle2, label: '6. KKTP' }, 
    { id: 'modul', icon: BookOpen, label: '7. Modul' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900">
      <aside className="w-full md:w-64 bg-blue-900 border-r border-blue-800 flex-col text-white print:hidden">
        <div className="p-6 border-b border-blue-800 flex items-center space-x-3 bg-blue-950">
          <div className="h-12 w-12 bg-white rounded-full p-1"><img src={LOGO_URL} alt="Logo" className="max-h-full max-w-full" /></div>
          <div><h1 className="font-bold text-base">Generator Spenpol</h1></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold ${activeTab === tab.id ? 'bg-blue-600' : 'hover:bg-blue-800'}`}>
              <tab.icon className="h-5 w-5 mr-3" /><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {activeTab === 'identitas' && (
          <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-4">Input Data Utama</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-bold">Sekolah</label><input type="text" name="sekolah" value={appData.sekolah} onChange={handleChange} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-bold">Mapel</label><input type="text" name="mapel" value={appData.mapel} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            </div>
            <div><label className="block text-sm font-bold">Elemen CP</label><textarea name="elemenList" rows={3} value={appData.elemenList} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          </div>
        )}

        {activeTab === 'modul' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow mb-6">
              <label className="block font-bold mb-2">Pilih Sesi Pembelajaran</label>
              <select value={selectedTPIndex} onChange={(e) => setSelectedTPIndex(Number(e.target.value))} className="w-full border p-2 mb-4 rounded">
                {extractedTPs.map((tp, idx) => <option key={idx} value={idx}>{tp.displayTitle}</option>)}
              </select>
              <button onClick={() => handleGenerateModul(selectedTPIndex)} disabled={isGenerating} className="w-full py-3 bg-green-700 text-white font-bold rounded">{isGenerating ? 'Memproses...' : 'Generate Sesi Ini'}</button>
            </div>
            {Object.keys(generatedModuls).length > 0 && extractedTPs.map(tp => generatedModuls[tp.id] ? <div key={tp.id} className="bg-white p-10 mb-8 mx-auto shadow" dangerouslySetInnerHTML={{ __html: generatedModuls[tp.id] }} /> : null)}
            {Object.keys(generatedModuls).length > 0 && (
              <button onClick={handleDownloadWord} className="px-6 py-3 bg-blue-700 text-white font-bold rounded shadow">Download Semua Modul (.doc)</button>
            )}
            <div ref={modulPreviewRef}></div>
          </div>
        )}

        {activeTab !== 'identitas' && activeTab !== 'modul' && (
          <div className="max-w-4xl mx-auto text-center">
            {errorMsg && <div className="bg-red-100 text-red-900 p-3 mb-4 rounded">{errorMsg}</div>}
            {progressMsg && <div className="bg-blue-100 text-blue-900 p-3 mb-4 rounded">{progressMsg}</div>}
            {generatedDocs[activeTab] ? (
              <div>
                <div className="bg-white p-10 shadow mb-4" dangerouslySetInnerHTML={{ __html: generatedDocs[activeTab] }} />
                <button onClick={handleDownloadWord} className="px-6 py-3 bg-blue-700 text-white font-bold rounded shadow">Download Word (.doc)</button>
              </div>
            ) : (
              <div className="bg-white p-10 shadow rounded">
                <h3 className="text-xl font-bold mb-4">Dokumen Belum Dibuat</h3>
                <button onClick={() => handleGenerateSingle(activeTab)} disabled={isGenerating} className="px-8 py-3 bg-blue-600 text-white font-bold rounded">{isGenerating ? 'Memproses...' : 'Mulai Generate'}</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Input({ name, label, val, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input type="text" name={name} value={val} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`w-full text-sm rounded-md border-slate-300 shadow-sm p-2 border ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`} />
    </div>
  );
}
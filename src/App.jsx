import React, { useState, useRef } from 'react';
import { 
  BookOpen, FileText, Calendar, Layout, 
  LogOut, Printer, Code, Loader2, AlertCircle, 
  ChevronRight, Settings, Check, Download, AlertTriangle, CheckCircle2, RefreshCw
} from 'lucide-react';

const LOGO_URL = "https://cdn.phototourl.com/free/2026-07-19-523222fc-dbc8-4b99-8a72-0a909f4d6586.png";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
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
  
  // Clean markdown html blocks robustly
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
- Judul Pembuka: "KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)"
- Tabel Identitas Perangkat (Sekolah, Mata Pelajaran, Fase/Kelas, Semester, Tahun Ajaran). 
- PENTING: JANGAN ULANGI tabel identitas ini lagi untuk setiap TP di bawahnya!

BAGIAN 2: DAFTAR KKTP (ULANGI BAGIAN INI UNTUK SETIAP TP YANG ADA)
Untuk SETIAP TP dalam daftar, sajikan secara berurutan ke bawah:
- Sub-judul spesifik: [Kode TP] - [Tujuan Pembelajaran] (Contoh: "TP-7.1 - Memahami konsep ruang...")
- Judul Pendekatan Terpilih (Contoh: "PENDEKATAN 2: RUBRIK").
- SATU TABEL PENDEKATAN (Hanya tabel untuk pendekatan yang dipilih).
- Deskripsi intervensi/tindak lanjut atau kesimpulan ketuntasan di bawah tabel.
- Berikan jarak visual (<br><br>) antar TP agar rapi.

BAGIAN 3: PENGESAHAN (TAMPIL HANYA SATU KALI DI PALING BAWAH DOKUMEN)
- Tempatkan blok tanda tangan Kepala Sekolah dan Guru HANYA SATU KALI di akhir seluruh dokumen, SETELAH semua TP selesai dijabarkan. 
- JANGAN tempatkan tanda tangan di setiap TP.

${getCommonRules(d)}
`;

const getPromptModul = (d, tpObj) => `
Anda adalah seorang Ahli Kurikulum Merdeka dan praktisi pendidikan profesional yang merancang **Rencana Pembelajaran Mendalam (RPM)** atau Modul Ajar Deep Learning yang KOMPREHENSIF, DETAIL, RAPI, dan SIAP CETAK — setara kualitas dengan dokumen RPM resmi yang dibuat oleh guru berpengalaman.

ATURAN PANJANG DOKUMEN (WAJIB DIPATUHI):
- JANGAN membatasi panjang dokumen pada jumlah halaman tertentu (misalnya 5 halaman). Panjang dokumen HARUS mengikuti kebutuhan riil: semakin banyak jumlah pertemuan (pertemuanCount = ${tpObj.pertemuanCount}), semakin banyak & detail pula uraian Kegiatan Awal, Kegiatan Inti, Kegiatan Penutup, serta rincian per pertemuan yang harus dihasilkan.
- SETIAP pertemuan (Pertemuan 1 sampai Pertemuan ${tpObj.pertemuanCount}) WAJIB memiliki uraiannya sendiri secara terpisah dan lengkap di setiap bagian yang relevan (Tujuan Pembelajaran per pertemuan, Topik per pertemuan, Model & Sintaks per pertemuan, Metode per pertemuan, Kegiatan Awal per pertemuan, Kegiatan Inti per pertemuan dengan sub-tahap Memahami/Mengaplikasikan/Merefleksi, Kegiatan Penutup per pertemuan). JANGAN merangkum atau menggabungkan beberapa pertemuan menjadi satu uraian singkat.
- TANPA MENGURANGI ATAU MERINGKAS komponen apa pun dari struktur di bawah ini. Setiap sub-bagian harus diisi dengan konten yang kontekstual, konkret, dan spesifik terhadap materi "${tpObj.materi}" (bukan kalimat generik kosong).

Mata Pelajaran: ${d.mapel}
Bab / Topik: ${tpObj.materi}
Fase / Kelas / Semester: ${d.fase} / ${d.semester}
Tujuan Pembelajaran Sesi Ini: [${tpObj.kode}] ${tpObj.tujuan}
Alokasi Waktu Sesi Ini: ${tpObj.pertemuanCount * 2} JP (${tpObj.pertemuanCount} Pertemuan, @80 menit per pertemuan)
Model Pembelajaran: ${d.modelPembelajaran}
Nama Penyusun: ${d.guru}
Nama Sekolah: ${d.sekolah}
Kota & Tanggal: ${d.kotaTanggal}
Kepala Sekolah: ${d.kepsek} (NIP. ${d.nipKepsek})
Guru Mapel: ${d.guru} (NIP. ${d.nipGuru})

STRUKTUR FORMAT DOKUMEN HTML WAJIB (Gunakan tag HTML dan tabel border rapi, ikuti persis struktur, tata letak, dan urutan sub-bagian di bawah ini):

<h2 style="text-align: center; color: #1a3a5c; text-transform: uppercase;">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">A. Identitas</h4>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;" border="0">
  <tr>
    <td style="width: 20%; font-weight: bold; padding: 4px;">Penyusun</td>
    <td style="width: 30%; padding: 4px;">: ${d.guru}</td>
    <td style="width: 20%; font-weight: bold; padding: 4px;">Semester</td>
    <td style="width: 30%; padding: 4px;">: ${d.semester}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px;">Sekolah</td>
    <td style="padding: 4px;">: ${d.sekolah}</td>
    <td style="font-weight: bold; padding: 4px;">Mata Pelajaran</td>
    <td style="padding: 4px;">: ${d.mapel}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px;">Tahun Pelajaran</td>
    <td style="padding: 4px;">: ${d.tahun}</td>
    <td style="font-weight: bold; padding: 4px;">Kelas/Fase Capaian</td>
    <td style="padding: 4px;">: ${d.fase}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px;">Materi</td>
    <td style="padding: 4px;">: ${tpObj.materi}</td>
    <td style="font-weight: bold; padding: 4px;">Alokasi Waktu</td>
    <td style="padding: 4px;">: ${tpObj.pertemuanCount * 2}x40 Menit (${tpObj.pertemuanCount} Pertemuan)</td>
  </tr>
</table>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">B. Identifikasi</h4>
<p><strong>Identifikasi Murid:</strong><br>
Uraikan secara spesifik: pengetahuan awal (prasyarat) yang relevan dengan ${tpObj.materi}, minat belajar murid terhadap topik yang dekat dengan kehidupan sehari-hari yang relevan dengan materi ini, serta kebutuhan belajar yang beragam (penguatan analisis bagi murid berkemampuan rendah dan tantangan pemecahan masalah bagi murid berprestasi). Tulis 1 paragraf utuh yang kontekstual terhadap ${tpObj.materi}, bukan kalimat generik.</p>
<p><strong>Materi Pelajaran:</strong><br>
- <em>Faktual:</em> [uraikan pengertian dasar, notasi, dan istilah penting yang SPESIFIK untuk materi ${tpObj.materi}]<br>
- <em>Konseptual:</em> [uraikan hubungan antar konsep, prinsip, dan keterkaitan dalam kehidupan sehari-hari yang SPESIFIK untuk materi ${tpObj.materi}]<br>
- <em>Prosedural:</em> [uraikan langkah-langkah sistematis / prosedur penyelesaian masalah yang SPESIFIK untuk materi ${tpObj.materi}]<br>
- <em>Metakognitif:</em> [uraikan bagaimana murid merefleksikan dan mengevaluasi pemahamannya sendiri terhadap ${tpObj.materi}]</p>
<p><strong>Dimensi Profil Lulusan:</strong><br>
[Sebutkan 1-2 dimensi Profil Lulusan yang paling relevan (misalnya Penalaran Kritis, Kreativitas, Kolaborasi, dsb.) beserta penjelasan singkat kaitannya dengan ${tpObj.materi}.]</p>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">C. Desain Pembelajaran</h4>
<p><strong>Capaian Pembelajaran:</strong><br>
${d.cpUmum}</p>
<p><strong>Tujuan Pembelajaran:</strong><br>
[${tpObj.kode}] ${tpObj.tujuan}</p>
<p><strong>Lintas Disiplin Ilmu:</strong><br>
[Uraikan integrasi materi ${tpObj.materi} dengan disiplin ilmu lain yang relevan (misalnya literasi finansial, IPA, seni, dsb.) untuk memperkaya konteks interdisipliner.]</p>
<p><strong>Tujuan Pembelajaran (rincian kompetensi per pertemuan):</strong><br>
Buat SATU baris tersendiri untuk SETIAP pertemuan dari Pertemuan 1 sampai Pertemuan ${tpObj.pertemuanCount} (jangan digabung). Untuk setiap pertemuan, uraikan level kompetensi (mengingat/memahami/menerapkan/menganalisis/mengevaluasi/mencipta sesuai tahapannya), sub-topik spesifik yang dipelajari pada pertemuan tersebut, dan target ketepatan/kriteria keberhasilan. Format tiap baris:<br>
- <strong>Pertemuan [n] (80 menit):</strong> [uraian lengkap sesuai penjelasan di atas]</p>
<p><strong>Topik Pembelajaran:</strong><br>
Buat SATU baris tersendiri untuk SETIAP pertemuan dari Pertemuan 1 sampai Pertemuan ${tpObj.pertemuanCount}, berisi sub-topik spesifik yang dibahas pada pertemuan tersebut (bukan pengulangan kalimat yang sama). Format tiap baris:<br>
- <strong>Pertemuan [n]:</strong> [sub-topik spesifik pertemuan ini]</p>
<p><strong>Praktik Pedagogis:</strong><br>
<em>Pendekatan Pembelajaran Mendalam (Deep Learning):</em> [uraikan pendekatan inkuiri/berbasis masalah yang mendasari seluruh rangkaian pertemuan, menekankan Mindful, Meaningful, Joyful Learning.]<br><br>
<strong>Model (per pertemuan):</strong><br>
Untuk SETIAP pertemuan (Pertemuan 1 s.d. Pertemuan ${tpObj.pertemuanCount}), tentukan nama model pembelajaran yang dipakai (boleh bervariasi antar pertemuan, mengacu pada ${d.modelPembelajaran} atau model lain yang relevan seperti Inkuiri Terbimbing, Problem-Based Learning, Project-Based Learning, Discovery Learning) beserta SINTAKSNYA (tahapan bernomor). Format tiap pertemuan:<br>
<strong>Pertemuan [n]:</strong> [Nama Model]. <strong>Sintaks:</strong> (1) ...; (2) ...; (3) ...; (4) ...<br><br>
<strong>Metode (per pertemuan):</strong><br>
Untuk SETIAP pertemuan, sebutkan metode pembelajaran konkret yang digunakan (ceramah interaktif, diskusi kelompok, tanya jawab, demonstrasi, presentasi, dsb.). Format tiap pertemuan:<br>
<strong>Pertemuan [n]:</strong> [metode-metode yang dipakai]</p>
<p><strong>Kemitraan Pembelajaran:</strong><br>
[Uraikan keterlibatan orang tua/lingkungan sekitar melalui tugas rumah atau pengamatan sederhana yang relevan dengan ${tpObj.materi}, untuk memperkuat koneksi sekolah-rumah.]</p>
<p><strong>Lingkungan Pembelajaran:</strong><br>
[Uraikan pengaturan ruang kelas/kolaboratif yang mendukung pembelajaran materi ini.]</p>
<p><strong>Pemanfaatan Digital:</strong><br>
[Sebutkan dalam bentuk daftar (list) alat/media digital konkret yang digunakan: presentasi digital (PowerPoint/Canva), video pembelajaran, sumber belajar daring, lembar kerja digital/cetak, dsb., yang relevan dengan ${tpObj.materi}.]</p>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">D. Pengalaman Belajar</h4>
Untuk bagian ini, WAJIB membuat uraian TERPISAH dan LENGKAP untuk SETIAP pertemuan dari Pertemuan 1 sampai Pertemuan ${tpObj.pertemuanCount}. Jangan menggabungkan pertemuan-pertemuan menjadi satu paragraf ringkas. Ikuti format berikut secara berulang untuk setiap pertemuan:

<p><strong>Kegiatan Awal (15 menit per pertemuan) — Prinsip: Bermakna dan Menggembirakan</strong><br>
Untuk SETIAP pertemuan, buat sub-judul "<strong>Pertemuan [n]:</strong>" diikuti daftar bernomor (list) berisi langkah-langkah kegiatan awal beserta alokasi menitnya (salam & doa, presensi, apersepsi yang menghubungkan dengan pengalaman sehari-hari terkait ${tpObj.materi}, dan motivasi belajar). Apersepsi dan motivasi HARUS spesifik/kontekstual dan BERBEDA pada setiap pertemuan, bukan pengulangan kalimat yang sama.</p>

<p><strong>Kegiatan Inti (55 menit per pertemuan) — Prinsip: Berkesadaran, Bermakna, Menggembirakan</strong><br>
Untuk SETIAP pertemuan, buat sub-judul "<strong>Pertemuan [n]: Topik - [sub-topik pertemuan ini]</strong>" diikuti daftar bernomor berisi 3 tahap dengan alokasi menit dan uraian konkret yang kontekstual terhadap sub-topik pertemuan tersebut (bukan generik):<br>
1. <strong>Memahami (20 menit):</strong> [uraian kegiatan eksplorasi/orientasi masalah yang spesifik, sebutkan aktivitas guru & murid, kaitkan dengan sintaks model pada pertemuan ini]<br>
2. <strong>Mengaplikasikan (25 menit):</strong> [uraian kerja kelompok/LKPD/latihan soal yang spesifik dengan contoh kontekstual konkret terkait sub-topik pertemuan ini]<br>
3. <strong>Merefleksi (10 menit):</strong> [uraian jurnal refleksi/diskusi singkat yang spesifik]</p>

<p><strong>Kegiatan Penutup (10 menit per pertemuan) — Prinsip: Bermakna dan Berkesadaran</strong><br>
Untuk SETIAP pertemuan, buat sub-judul "<strong>Pertemuan [n]:</strong>" diikuti daftar bernomor berisi langkah-langkah penutup beserta alokasi menit (kesimpulan bersama yang spesifik terhadap sub-topik pertemuan ini, umpan balik positif, tindak lanjut/tugas rumah, doa dan salam penutup).</p>

<h4 style="color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 5px; margin-top: 20px;">E. Asesmen Pembelajaran</h4>
<p><strong>Awal (Diagnostik):</strong> Jenis: Diagnostik. Bentuk: [tentukan bentuk konkret, misalnya kuis lisan]. Teknik: [uraikan teknik pelaksanaan singkat, spesifik terhadap materi ${tpObj.materi}].<br>
<strong>Proses (Formatif):</strong> Jenis: Formatif. Bentuk: [misalnya observasi dan rubrik]. Teknik: [uraikan teknik pencatatan selama diskusi/latihan kelompok].<br>
<strong>Akhir (Sumatif):</strong> Jenis: Sumatif. Bentuk: [misalnya tes tertulis]. Teknik: [uraikan bentuk soal uraian/pilihan ganda kontekstual].</p>

PENTING - BAGIAN TANDA TANGAN (WAJIB DIPATUHI):
- Bagian tanda tangan di bawah ini HANYA BOLEH MUNCUL SATU KALI di seluruh dokumen, yaitu tepat di sini, setelah "E. Asesmen Pembelajaran" dan sebelum bagian LAMPIRAN.
- JANGAN membuat, mengulang, atau menyisipkan blok tanda tangan (Menyetujui/Kepala Sekolah/Guru Mapel/NIP) di bagian LAMPIRAN maupun di bagian LEMBAR KERJA PESERTA DIDIK (LKPD). Kedua bagian tersebut TIDAK memerlukan tanda tangan sama sekali.
- Gunakan tabel dengan garis/border yang TIDAK TERLIHAT (invisible) sebagai wadah tanda tangan, persis seperti markup di bawah ini, tanpa menambahkan atribut border atau style border apa pun pada tabel maupun sel-selnya.

<table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border: none; border-collapse: collapse; text-align: center; margin-top: 3rem; page-break-inside: avoid;">
  <tr>
    <td style="width: 50%; vertical-align: top; border: none;">
      Menyetujui,<br>Kepala ${d.sekolah}<br><br><br><br>
      <b><u>${d.kepsek}</u></b><br>NIP. ${d.nipKepsek}
    </td>
    <td style="width: 50%; vertical-align: top; border: none;">
      ${d.kotaTanggal}<br>Guru Mata Pelajaran<br><br><br><br>
      <b><u>${d.guru}</u></b><br>NIP. ${d.nipGuru}
    </td>
  </tr>
</table>

<div style="page-break-before: always;"></div>
<h3 style="text-align: center; color: #1a3a5c;">LAMPIRAN</h3>
Catatan: Bagian LAMPIRAN ini TIDAK memerlukan blok tanda tangan (Menyetujui/Kepala Sekolah/Guru Mapel/NIP). JANGAN menambahkan tabel atau baris tanda tangan apa pun di bagian ini.

<h4 style="color: #1a3a5c;">1. Asesmen Awal Pembelajaran</h4>
<p>Buat TEPAT 5 soal asesmen diagnostik (lisan/tertulis singkat) untuk mengukur kesiapan/pengetahuan prasyarat peserta didik terhadap materi ${tpObj.materi}. Setiap soal WAJIB disertai kunci jawaban singkat. Gunakan daftar bernomor (list) dengan format:<br>
1. [Pertanyaan] (Jawaban: [jawaban singkat])<br>
... dan seterusnya sampai 5 soal, dengan tingkat kesulitan bertahap dari yang paling dasar/prasyarat.</p>

<h4 style="color: #1a3a5c;">2. Asesmen Proses Pembelajaran — Rubrik Penilaian Sikap (Skala 4)</h4>
<ul style="margin-bottom: 15px;">
  <li><strong>Skala 4 (Sangat Baik):</strong> [deskripsi sikap sangat baik yang spesifik]</li>
  <li><strong>Skala 3 (Baik):</strong> [deskripsi sikap baik yang spesifik]</li>
  <li><strong>Skala 2 (Cukup):</strong> [deskripsi sikap cukup yang spesifik]</li>
  <li><strong>Skala 1 (Kurang):</strong> [deskripsi sikap kurang yang spesifik]</li>
</ul>

<h4 style="color: #1a3a5c;">3. Rubrik Penilaian Pengetahuan (Skala 4)</h4>
<ul style="margin-bottom: 15px;">
  <li><strong>Skala 4 (Sangat Baik):</strong> [pemahaman konsep ${tpObj.materi} tanpa kesalahan]</li>
  <li><strong>Skala 3 (Baik):</strong> [pemahaman dasar dengan sedikit kesalahan kecil]</li>
  <li><strong>Skala 2 (Cukup):</strong> [memahami pengertian umum namun kesulitan pada prosedur]</li>
  <li><strong>Skala 1 (Kurang):</strong> [belum memahami konsep dasar, perlu bimbingan intensif]</li>
</ul>

<h4 style="color: #1a3a5c;">4. Rubrik Penilaian Keterampilan (Skala 4)</h4>
<ul style="margin-bottom: 15px;">
  <li><strong>Skala 4 (Sangat Baik):</strong> [mampu menerapkan konsep dalam kasus nyata secara akurat dan kreatif]</li>
  <li><strong>Skala 3 (Baik):</strong> [menerapkan dengan benar namun kurang cepat/mandiri]</li>
  <li><strong>Skala 2 (Cukup):</strong> [menerapkan dasar namun keliru pada konteks kompleks]</li>
  <li><strong>Skala 1 (Kurang):</strong> [belum mampu menerapkan secara mandiri]</li>
</ul>

<h4 style="color: #1a3a5c;">5. Asesmen Akhir Pembelajaran (Soal Sumatif)</h4>
<p>Buat TEPAT 5 soal uraian/essay kontekstual untuk mengukur pemahaman komprehensif peserta didik terhadap materi ${tpObj.materi}, dengan tingkat kesulitan meningkat (C2 s.d. C5). Setiap soal WAJIB disertai kunci jawaban/pembahasan singkat. Gunakan daftar bernomor (list) dengan format:<br>
1. [Pertanyaan uraian] (Jawaban: [pembahasan singkat])<br>
... dan seterusnya sampai 5 soal.</p>

<div style="page-break-before: always;"></div>
<h3 style="text-align: center; color: #1a3a5c;">LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
Catatan: Bagian LKPD ini TIDAK memerlukan blok tanda tangan (Menyetujui/Kepala Sekolah/Guru Mapel/NIP). JANGAN menambahkan tabel atau baris tanda tangan apa pun di bagian ini.

<h4 style="color: #1a3a5c;">Identitas Diri</h4>
<table style="width: 100%; border: none; margin-bottom: 15px;" border="0">
  <tr>
    <td style="border: none; padding: 4px;"><strong>Nama Peserta Didik:</strong> .................................................</td>
    <td style="border: none; padding: 4px; text-align: right;"><strong>Kelas / Absen:</strong> ${d.fase.split('/')[1] || 'VII'} / .....</td>
  </tr>
  <tr>
    <td style="border: none; padding: 4px;"><strong>Mata Pelajaran:</strong> ${d.mapel}</td>
    <td style="border: none; padding: 4px; text-align: right;"><strong>Tanggal:</strong> .................................</td>
  </tr>
</table>

<p><strong>Petunjuk Penggunaan LKPD:</strong><br>
Tulis petunjuk penggunaan yang ramah dan memotivasi murid (4 poin bernomor: apa yang harus dibaca/diamati, cara menjawab, alat yang dibutuhkan, dan tujuan pembelajaran LKPD ini), kontekstual terhadap ${tpObj.materi}.</p>

<p><strong>Sintaks Pembelajaran dan Pengalaman Belajar Mendalam:</strong><br>
[Satu paragraf pembuka yang menjelaskan alur belajar mendalam yang akan dilalui murid melalui LKPD ini: Memahami → Mengaplikasikan → Merefleksikan, dikaitkan dengan model pembelajaran tiap pertemuan.]</p>

Untuk SETIAP pertemuan dari Pertemuan 1 sampai Pertemuan ${tpObj.pertemuanCount}, buat bagian LKPD tersendiri dengan format berikut (jangan digabung menjadi satu untuk semua pertemuan):

<h4 style="color: #1a3a5c; margin-top: 15px;">Pertemuan [n]: [sub-topik pertemuan ini]</h4>
<p><strong>A. Memahami (Orientasi Masalah)</strong><br>
[Uraian singkat materi/stimulus visual/kasus kontekstual yang relevan dengan sub-topik pertemuan ini.]<br>
<em>Pertanyaan Pemahaman</em> (buat minimal 2 pertanyaan spesifik terkait sub-topik pertemuan ini, masing-masing diikuti ruang jawab titik-titik):<br>
1. [Pertanyaan]<br>
<span style="color: #a0aec0; font-style: italic;">Jawab: .................................................................................................................................................</span></p>

<p><strong>B. Mengaplikasikan (Kerja Kelompok/Studi Kasus)</strong><br>
Buat 1-2 studi kasus kontekstual KONKRET (dengan angka/situasi nyata) yang relevan dengan sub-topik pertemuan ini, diikuti ruang jawab bertahap (Langkah 1, Langkah 2, Hasil) dengan titik-titik kosong untuk diisi murid.</p>

<p><strong>C. Merefleksikan (Kesimpulan & Evaluasi)</strong><br>
[1 pertanyaan refleksi spesifik terkait sub-topik pertemuan ini]<br>
<span style="color: #a0aec0; font-style: italic;">Jawab: .................................................................................................................................................</span></p>

Setelah seluruh bagian per pertemuan selesai, tutup LKPD dengan bagian berikut:

<p><strong>Cek Pemahaman Diri (Lingkari pilihanmu):</strong><br>
- Saya paham konsep dasar: Sangat / Ya / Cukup / Belum<br>
- Saya bisa aplikasikan dalam kasus nyata: Sangat / Ya / Cukup / Belum<br>
- Saya siap tantangan selanjutnya: Sangat / Ya / Cukup / Belum</p>

<h4 style="color: #1a3a5c; margin-top: 20px;">Catatan Guru:</h4>
<div style="border: 1px dashed #cbd5e0; min-height: 60px; padding: 8px; margin-bottom: 30px; color: #a0aec0; font-style: italic;">Catatan evaluasi atau umpan balik guru untuk perkembangan belajar siswa...</div>

${getCommonRules(d)}
`;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return <Dashboard onLogout={() => setIsLoggedIn(false)} />;
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Badiangpunya' || password === '') {
      onLogin();
    } else {
      setError('Password salah. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-32 w-32 flex items-center justify-center">
            <img src={LOGO_URL} alt="Logo Sekolah" className="max-h-full max-w-full drop-shadow-md animate-bounce" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Generator Perangkat Ajar
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-semibold">
          Kurikulum Merdeka - Deep Learning Spenpol (1 Semester)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-blue-900/5 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <input type="text" value="badiang80.id" disabled className="mt-1 block w-full bg-slate-50 border border-slate-300 rounded-md py-3 px-3 text-slate-600 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md py-3 px-3 focus:ring-blue-500 focus:border-blue-500" placeholder="isi password" />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 transition-colors">
              Masuk
            </button>

            <div className="pt-6 border-t border-slate-200 text-center space-y-4">
               <div className="bg-red-600 py-3 px-3 rounded-md shadow-md flex items-center justify-center space-x-2 transform hover:scale-105 transition-transform">
                  <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
                  <p className="text-sm font-black text-white uppercase tracking-widest">
                    Khusus Guru Spenpol-One
                  </p>
               </div>
               <p className="text-xs text-slate-400 mt-4 font-medium uppercase tracking-wide">
                 Desain Oleh Badiang
               </p>
            </div>
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
    provinsiKota: 'Pemerintah Kabupaten Kolaka Timur',
    dinas: 'Dinas Pendidikan dan Kebudayaan',
    sekolah: 'SMP Negeri 1 Poli-Polia',
    alamat: 'Jl. Drs.H. Abdullah Silondae No.1A Kec. Polia-Polia Kab. Kolaka Timur POS. 93573',
    mapel: 'Ilmu Pengetahuan Sosial',
    singkatan: 'IPS',
    fase: 'Fase D / Kelas VII',
    tahun: '2026/2027',
    semester: '1 (Ganjil)',
    alokasiWaktu: '36 JP / Semester',
    jpMinggu: '2 JP/Minggu',
    jpPertemuan: '2 JP (80 Menit)',
    guru: 'Badiang,S.Pd.',
    nipGuru: '198010072005021003',
    kepsek: 'Badiang, S.Pd.,M.Pd.',
    nipKepsek: '19801007 200502 1 003',
    kotaTanggal: 'Poli-Polia, 14 Juli 2026',
    
    elemenList: '1 | PK | Pemahaman Konsep | KP | Keterampilan Proses',
    cpUmum: 'Mata pelajaran Ilmu Pengetahuan Sosial pada Kurikulum Merdeka bertujuan untuk membekali peserta didik agar mampu menganalisis hubungan antara kondisi geografis dan aktivitas masyarakat, memahami sejarah lokal, serta menguasai keterampilan proses penyelidikan...',
    cpElemen: 'Pemahaman Konsep: Memahami Lingkungan Sekitar, Menganalisis Interaksi Sosial, Memahami Sejarah dan Budaya...\nElemen Keterampilan Proses: Peserta didik Mengamati & Bertanya, Mengorganisasikan & Menganalisis, Menarik Kesimpulan & Mengomunikasikan...',
    
    kalender: 'Juli | 5 | 3 | SPMB & MPLS\nAgustus | 4 | 4 | Efektif\nSeptember | 5 | 5 | Efektif\nOktober | 4 | 0 | Efektif\nNovember | 4 | 0 | Efektif\nDesember | 4 | 3 | PAS & Libur',
    rentangNilai: 'Level 1 (Mulai Berkembang): 0-55 | D\nLevel 2 (Berkembang): 56-70 | C\nLevel 3 (Cakap): 71-85 | B\nLevel 4 (Mahir): 86-100 | A',
    
    modelPembelajaran: 'Problem Based Learning (PBL)', 
    dataSebelumnya: '', 
  });

  const [generatedDocs, setGeneratedDocs] = useState({
    cp: '', tp: '', atp: '', prota: '', prosem: '', kktp: '', modul: ''
  });
  
  const [extractedTPs, setExtractedTPs] = useState([]);
  const [selectedTPIndex, setSelectedTPIndex] = useState(0);
  const [generatedModuls, setGeneratedModuls] = useState({});

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAppData(prev => ({ ...prev, [name]: value }));
  };

  const parseATPForModules = (atpHtmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(atpHtmlString, 'text/html');
      const tables = doc.querySelectorAll('table');
      let rawTps = [];
      
      tables.forEach(table => {
        const headerRow = table.querySelector('tr');
        if (headerRow && headerRow.textContent.toLowerCase().includes('kode tp')) {
          const rows = table.querySelectorAll('tr');
          rows.forEach((row, index) => {
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
                     let pertemuanCalc = Math.max(1, Math.ceil(jpNum / jpPerPertemuan));
                     
                     rawTps.push({ 
                       kode, 
                       tujuan, 
                       materi: materi || 'Materi Umum', 
                       jp: jpNum, 
                       pertemuan: pertemuanCalc 
                     });
                 }
             }
          });
        }
      });
      
      const uniqueRawTPs = Array.from(new Map(rawTps.map(item => [item.kode, item])).values());
      
      const chunkedTPs = [];
      uniqueRawTPs.forEach(tp => {
        const maxMeetingsPerModul = 2;
        const totalMeetings = tp.pertemuan;
        if (totalMeetings <= maxMeetingsPerModul) {
          chunkedTPs.push({
            ...tp,
            displayTitle: `[${tp.kode}] ${tp.tujuan} (Pertemuan 1-${totalMeetings})`,
            startMeeting: 1,
            endMeeting: totalMeetings,
            pertemuanCount: totalMeetings,
            id: `${tp.kode}_1_${totalMeetings}`
          });
        } else {
          let currentMeeting = 1;
          let chunkIndex = 1;
          while (currentMeeting <= totalMeetings) {
            const end = Math.min(currentMeeting + maxMeetingsPerModul - 1, totalMeetings);
            const count = end - currentMeeting + 1;
            chunkedTPs.push({
              ...tp,
              displayTitle: `[${tp.kode}] ${tp.tujuan} (Sesi ${chunkIndex}: Pertemuan ${currentMeeting}-${end})`,
              startMeeting: currentMeeting,
              endMeeting: end,
              pertemuanCount: count,
              chunkIndex: chunkIndex,
              id: `${tp.kode}_${currentMeeting}_${end}`
            });
            currentMeeting += maxMeetingsPerModul;
            chunkIndex++;
          }
        }
      });

      if(chunkedTPs.length > 0) {
        setExtractedTPs(chunkedTPs);
        setSelectedTPIndex(0);
      }
    } catch(err) {
      console.error("Gagal mem-parsing ATP:", err);
    }
  };

  const handleGenerateSingle = async (docType) => {
    setIsGenerating(true);
    setErrorMsg('');
    let currentData = { ...appData };

    try {
      let result = '';
      
      if (docType === 'cp') {
         setProgressMsg('Menyusun Analisis CP...');
         result = await generateWithAI(getCommonRules(currentData), getPromptAnalisisCP(currentData));
      } 
      else if (docType === 'tp') {
         setProgressMsg(`Merumuskan TP (Semester ${appData.semester})...`);
         result = await generateWithAI(getCommonRules(currentData), getPromptTP(currentData));
      } 
      else if (docType === 'atp') {
         if (!generatedDocs.tp) throw new Error("Silakan Generate dokumen TP (Tujuan Pembelajaran) terlebih dahulu!");
         setProgressMsg(`Menyusun ATP (Semester ${appData.semester})...`);
         currentData.dataSebelumnya = generatedDocs.tp;
         result = await generateWithAI(getCommonRules(currentData), getPromptATP(currentData));
         parseATPForModules(result);
      } 
      else if (docType === 'prota') {
         if (!generatedDocs.tp && !generatedDocs.atp) throw new Error("Silakan Generate dokumen TP / ATP terlebih dahulu!");
         setProgressMsg(`Menyusun Program Tahunan (Fokus Semester ${appData.semester})...`);
         currentData.dataSebelumnya = generatedDocs.atp || generatedDocs.tp;
         result = await generateWithAI(getCommonRules(currentData), getPromptProta(currentData));
      } 
      else if (docType === 'prosem') {
         if (!generatedDocs.tp && !generatedDocs.atp) throw new Error("Silakan Generate dokumen TP / ATP terlebih dahulu!");
         setProgressMsg(`Menyusun Program Semester ${appData.semester}...`);
         currentData.dataSebelumnya = generatedDocs.atp || generatedDocs.tp;
         result = await generateWithAI(getCommonRules(currentData), getPromptProsem(currentData));
      } 
      else if (docType === 'kktp') {
         if (!generatedDocs.tp && !generatedDocs.atp) throw new Error("Silakan Generate dokumen TP / ATP terlebih dahulu!");
         setProgressMsg(`Merumuskan KKTP dengan format baku 1 Pendekatan terpilih (Semester ${appData.semester})...`);
         currentData.dataSebelumnya = generatedDocs.atp || generatedDocs.tp;
         result = await generateWithAI(getCommonRules(currentData), getPromptKKTP(currentData));
      }

      setGeneratedDocs(prev => ({ ...prev, [docType]: result }));
      setProgressMsg(`Dokumen berhasil dibuat!`);
      setTimeout(() => setProgressMsg(''), 3000);
      
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateModul = async (tpIndex = selectedTPIndex) => {
    if (extractedTPs.length === 0) return;
    setIsGenerating(true);
    setErrorMsg('');
    const targetTP = extractedTPs[tpIndex];
    try {
      setProgressMsg(`Menyusun Modul Ajar Presisi untuk ${targetTP.displayTitle}...`);
      const modul = await generateWithAI(getCommonRules(appData), getPromptModul(appData, targetTP));
      
      setGeneratedModuls(prev => ({ ...prev, [targetTP.id]: modul }));
      setProgressMsg(`Modul Ajar ${targetTP.kode} Berhasil Dibuat!`);
      
      setTimeout(() => {
        setProgressMsg('');
        modulPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 1500);

    } catch (err) {
      setErrorMsg(`Gagal membuat Modul Ajar: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSemuaModul = async () => {
    if (extractedTPs.length === 0) return;
    setIsGenerating(true);
    setErrorMsg('');
    
    let successCount = 0;
    for (let i = 0; i < extractedTPs.length; i++) {
       const targetTP = extractedTPs[i];
       try {
          setSelectedTPIndex(i);
          setProgressMsg(`Memproses ${i+1}/${extractedTPs.length} - ${targetTP.displayTitle}...`);
          const modul = await generateWithAI(getCommonRules(appData), getPromptModul(appData, targetTP));
          
          setGeneratedModuls(prev => ({ ...prev, [targetTP.id]: modul }));
          successCount++;
          
          setTimeout(() => {
             modulPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 500);
          
       } catch (err) {
          setErrorMsg(`Gagal pada ${targetTP.displayTitle}: ${err.message}. Lanjut ke berikutnya...`);
          await new Promise(res => setTimeout(res, 2000));
       }
    }
    
    setIsGenerating(false);
    setProgressMsg(`Selesai! Berhasil membuat ${successCount} Modul Ajar.`);
    setTimeout(() => setProgressMsg(''), 5000);
  };

  const getModulContentForExport = () => {
     return extractedTPs
       .map(tp => generatedModuls[tp.id])
       .filter(Boolean)
       .join('<div style="page-break-before: always;"></div>');
  };

  const handleDownloadWord = () => {
    const isLandscape = ['prosem', 'atp', 'kktp'].includes(activeTab);
    let content = activeTab === 'modul' ? getModulContentForExport() : generatedDocs[activeTab];
    
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export Doc</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; border: 1pt solid windowtext; }
          th, td { border: 1pt solid windowtext; padding: 5pt; vertical-align: top; }
          th { background-color: #1a3a5c; color: white; }
          h1, h2, h3 { color: #1a3a5c; }
          
          @page WordSectionPortrait {
              size: 595.3pt 841.9pt; 
              margin: 72pt 72pt 72pt 72pt;
              mso-header-margin: 36pt;
              mso-footer-margin: 36pt;
              mso-paper-source: 0;
          }
          @page WordSectionLandscape {
              size: 841.9pt 595.3pt; 
              margin: 72pt 72pt 72pt 72pt;
              mso-header-margin: 36pt;
              mso-footer-margin: 36pt;
              mso-paper-source: 0;
          }
          div.WordSectionPortrait { page: WordSectionPortrait; }
          div.WordSectionLandscape { page: WordSectionLandscape; }
        </style>
      </head>
      <body>
        <div class="${isLandscape ? 'WordSectionLandscape' : 'WordSectionPortrait'}">
    `;
    const footer = "</div></body></html>";
    const htmlContent = header + content + footer;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADM_${activeTab.toUpperCase()}_${appData.singkatan}_${appData.fase.split('/')[0].trim()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    const isLandscape = ['prosem', 'atp', 'kktp'].includes(activeTab);
    let content = activeTab === 'modul' ? getModulContentForExport() : generatedDocs[activeTab];
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dokumen_${activeTab}</title><style>body { font-family: Calibri, sans-serif; padding: 2cm; } table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; border: 1px solid black; } th, td { border: 1px solid black; padding: 0.5rem; text-align: left; vertical-align: top; } th { background-color: #1a3a5c !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; } h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1a3a5c; } @media print { @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 1.5cm; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } } </style></head><body>${content}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dokumen_${activeTab}.html`;
    a.click();
  };

  const handlePrintHTML = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '100vw'; 
    iframe.style.height = '100vh';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999'; 
    document.body.appendChild(iframe);

    const isLandscape = ['prosem', 'atp', 'kktp'].includes(activeTab);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cetak Dokumen - ${activeTab}</title>
        <style>
          body { font-family: 'Calibri', sans-serif; padding: 0; margin: 0; color: #000; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; border: 1pt solid black; }
          th, td { border: 1pt solid #000; padding: 0.5rem; text-align: left; vertical-align: top; }
          th { background-color: #1a3a5c !important; color: white !important; font-weight: bold; }
          h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1a3a5c; }
          .header-kop { text-align: center; border-bottom: 3px solid black; padding-bottom: 1rem; margin-bottom: 2rem; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          
          @media print {
             @page { 
               size: A4 ${isLandscape ? 'landscape' : 'portrait'}; 
               margin: 1.5cm; 
             }
             body { padding: 0 !important; }
          }
        </style>
      </head>
      <body>
        ${activeTab === 'modul' ? getModulContentForExport() : generatedDocs[activeTab]}
      </body>
      </html>
    `;
    
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(htmlContent);
    iframe.contentWindow.document.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 1000); 
  };

  const tabs = [
    { id: 'identitas', icon: Settings, label: 'Data Global (Input)' },
    { id: 'cp', icon: FileText, label: '1. Capaian Pembelajaran' },
    { id: 'tp', icon: Layout, label: '2. Tujuan Pembelajaran' },
    { id: 'atp', icon: ChevronRight, label: '3. ATP' },
    { id: 'prota', icon: Calendar, label: '4. Prota' },
    { id: 'prosem', icon: Calendar, label: '5. Prosem' },
    { id: 'kktp', icon: CheckCircle2, label: '6. KKTP' },
    { id: 'modul', icon: BookOpen, label: '7. Modul Ajar' },
  ];

  const docNames = {
    cp: 'Capaian Pembelajaran',
    tp: 'Tujuan Pembelajaran',
    atp: 'Alur Tujuan Pembelajaran',
    prota: 'Program Tahunan',
    prosem: 'Program Semester',
    kktp: 'Kriteria Ketercapaian (KKTP)'
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-blue-900 border-r border-blue-800 flex-shrink-0 flex flex-col print:hidden no-print text-white">
        <div className="p-6 border-b border-blue-800 flex items-center space-x-3 bg-blue-950">
          <div className="h-12 w-12 flex items-center justify-center bg-white rounded-full p-1 shadow-md">
            <img src={LOGO_URL} alt="Logo Sekolah" className="max-h-full max-w-full drop-shadow-sm" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base">Generator Spenpol</h1>
            <p className="text-xs text-blue-200">Perangkat 1 Semester</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {tabs.map(tab => {
            const hasGenerated = tab.id === 'modul' ? Object.keys(generatedModuls).length > 0 : !!generatedDocs[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-white' : 'text-blue-300'}`} />
                  <span>{tab.label}</span>
                </div>
                {hasGenerated && tab.id !== 'identitas' && (
                  <div className="bg-green-500 rounded-full p-0.5">
                     <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-blue-800 bg-blue-950">
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-900/50 hover:text-red-200 rounded-lg transition-colors border border-transparent hover:border-red-800">
            <LogOut className="h-4 w-4" /><span>Keluar Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center print:hidden no-print z-10 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">{tabs.find(t => t.id === activeTab)?.label}</h2>
          {activeTab !== 'identitas' && isGenerating && (
             <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang di-generate oleh AI...</span>
             </div>
          )}
        </header>

        <div className="flex-1 overflow-auto bg-slate-100/50 p-6 print:p-0 print:bg-white flex flex-col relative custom-scrollbar">
          
          {/* TAB 1: FORM DATA GLOBAL */}
          {activeTab === 'identitas' && (
            <div className="max-w-5xl mx-auto w-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col print:hidden no-print flex-shrink-0">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <h3 className="font-bold text-slate-800 text-lg">Input Data Global</h3>
                <p className="text-sm text-slate-500 mt-1">Isi identitas dan komponen dasar untuk 1 Semester. Setelah selesai, silakan buka menu tab di kiri satu per satu untuk men-generate dokumen.</p>
              </div>
              
              <div className="p-6 overflow-visible space-y-8 flex-1">
                <section>
                   <h4 className="font-semibold text-blue-900 border-b border-slate-200 pb-2 mb-4">Blok 1: Identitas Sekolah & Guru</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input name="provinsiKota" label="Provinsi / Kota" val={appData.provinsiKota} onChange={handleChange} disabled={true} />
                      <Input name="dinas" label="Dinas Pendidikan" val={appData.dinas} onChange={handleChange} disabled={true} />
                      <Input name="sekolah" label="Satuan Pendidikan" val={appData.sekolah} onChange={handleChange} disabled={true} />
                      
                      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                          <Input name="tahun" label="Tahun Pelajaran" val={appData.tahun} onChange={handleChange} />
                          <div>
                            <label className="block text-xs font-bold text-blue-900 mb-1">Pilih Semester</label>
                            <select 
                              name="semester"
                              value={appData.semester} 
                              onChange={handleChange}
                              className="w-full text-sm rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white font-medium text-blue-900"
                            >
                              <option value="1 (Ganjil)">1 (Ganjil)</option>
                              <option value="2 (Genap)">2 (Genap)</option>
                            </select>
                          </div>
                          <Input name="fase" label="Fase / Kelas" val={appData.fase} onChange={handleChange} />
                          <Input name="alokasiWaktu" label="Alokasi Waktu (1 Semester)" val={appData.alokasiWaktu} onChange={handleChange} />
                      </div>

                      <Input name="mapel" label="Mata Pelajaran" val={appData.mapel} onChange={handleChange} />
                      <Input name="singkatan" label="Singkatan Mapel (Mis: BI)" val={appData.singkatan} onChange={handleChange} />
                      <Input name="jpMinggu" label="JP per Minggu" val={appData.jpMinggu} onChange={handleChange} />
                      <Input name="jpPertemuan" label="Durasi 1x Pertemuan" val={appData.jpPertemuan} onChange={handleChange} placeholder="Contoh: 2 JP (80 Menit)" />
                      <Input name="guru" label="Nama Guru" val={appData.guru} onChange={handleChange} />
                      <Input name="nipGuru" label="NIP Guru" val={appData.nipGuru} onChange={handleChange} />
                      <Input name="kepsek" label="Nama Kepsek" val={appData.kepsek} onChange={handleChange} disabled={true} />
                      <Input name="nipKepsek" label="NIP Kepsek" val={appData.nipKepsek} onChange={handleChange} disabled={true} />
                      <Input name="kotaTanggal" label="Kota, Tanggal TTD" val={appData.kotaTanggal} onChange={handleChange} />
                   </div>
                </section>

                <section>
                   <h4 className="font-semibold text-blue-900 border-b border-slate-200 pb-2 mb-4">Blok 2 & 3: Capaian & Elemen</h4>
                   <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Daftar Elemen & Kode</label>
                        <textarea name="elemenList" rows={3} value={appData.elemenList} onChange={handleChange} className="w-full text-sm rounded-md border-slate-300 border p-2 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CP Umum / Rasional Mapel</label>
                        <textarea name="cpUmum" rows={3} value={appData.cpUmum} onChange={handleChange} className="w-full text-sm rounded-md border-slate-300 border p-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Capaian Pembelajaran (CP) Per Elemen</label>
                        <textarea name="cpElemen" rows={5} value={appData.cpElemen} onChange={handleChange} className="w-full text-sm rounded-md border-slate-300 border p-2" />
                      </div>
                   </div>
                </section>

                <section>
                   <h4 className="font-semibold text-blue-900 border-b border-slate-200 pb-2 mb-4">Blok 4: Kalender Pendidikan & KKTP</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Kalender Pendidikan Semester {appData.semester}</label>
                         <textarea name="kalender" rows={6} value={appData.kalender} onChange={handleChange} className="w-full text-sm font-mono rounded-md border-slate-300 border p-2 bg-slate-50" placeholder="Masukkan rincian bulan khusus untuk semester ini..." />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Rentang Nilai & Predikat KKTP</label>
                         <textarea name="rentangNilai" rows={6} value={appData.rentangNilai} onChange={handleChange} className="w-full text-sm font-mono rounded-md border-slate-300 border p-2 bg-slate-50" />
                      </div>
                   </div>
                </section>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/90 rounded-b-xl text-center backdrop-blur-sm text-slate-600 text-sm">
                💡 <span className="font-semibold">Info:</span> Pengaturan ini sekarang dikhususkan untuk <strong>1 Semester</strong>. Buka tab dokumen di sebelah kiri (CP, TP, ATP dst) untuk meng-generate dokumen satu per satu secara berurutan.
              </div>
            </div>
          )}

          {/* TAB 8: MODUL AJAR (CHUNKING INTERACTION) */}
          {activeTab === 'modul' && (
             <div className="w-full flex flex-col flex-1 items-center print:hidden no-print">
               
               <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-xl shadow-sm mb-6 p-6 flex-shrink-0">
                 <div className="flex items-center space-x-2 mb-2">
                   <BookOpen className="h-6 w-6 text-green-700" />
                   <h3 className="font-bold text-slate-800 text-lg">Generate Modul Ajar Sesi (Maksimal 2 Pertemuan Per Modul)</h3>
                 </div>
                 <p className="text-sm text-slate-500 mb-6">
                   Sistem secara otomatis mengelompokkan TP yang memiliki lebih dari 2 pertemuan ke dalam modul-modul terpisah (maksimal 2 pertemuan per modul) sesuai dengan standardisasi Kurikulum Merdeka agar deskripsi pembelajaran tergenerate lengkap.
                 </p>
                 
                 {extractedTPs.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md text-sm flex items-start space-x-3 mb-6">
                       <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                       <p><strong>Perhatian:</strong> Anda belum melakukan Generate ATP atau tabel ATP kosong. Silakan masuk ke tab <strong>Alur (ATP)</strong> dan generate terlebih dahulu agar pilihan sesi TP otomatis tersinkronisasi di sini.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                       <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-blue-900 mb-2">Pilih Sesi Pembelajaran / Sesi Modul</label>
                          <select 
                            value={selectedTPIndex} 
                            onChange={(e) => setSelectedTPIndex(Number(e.target.value))}
                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border bg-slate-50 font-medium text-slate-700"
                          >
                            {extractedTPs.map((tp, idx) => (
                               <option key={idx} value={idx}>
                                  {tp.displayTitle}
                               </option>
                            ))}
                          </select>
                       </div>
                       
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Materi Pokok (Otomatis)</label>
                          <div className="w-full text-sm rounded-md border border-slate-200 p-3 bg-gray-100 text-slate-700 min-h-[46px] font-semibold">
                             {extractedTPs[selectedTPIndex]?.materi}
                          </div>
                       </div>
                       
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Durasi Sesi Ini (Otomatis)</label>
                          <div className="w-full text-sm rounded-md border border-slate-200 p-3 bg-gray-100 text-slate-700 min-h-[46px] flex items-center space-x-2">
                             <Calendar className="w-4 h-4 text-blue-600" />
                             <span>{extractedTPs[selectedTPIndex]?.pertemuanCount} Pertemuan (Pertemuan {extractedTPs[selectedTPIndex]?.startMeeting} - {extractedTPs[selectedTPIndex]?.endMeeting})</span>
                          </div>
                       </div>

                       <div className="md:col-span-2 mt-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Model Pembelajaran</label>
                          <select 
                            name="modelPembelajaran"
                            value={appData.modelPembelajaran} 
                            onChange={handleChange}
                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 p-3 border bg-white"
                          >
                            <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
                            <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
                            <option value="Discovery Learning">Discovery Learning</option>
                            <option value="Inquiry Learning">Inquiry Learning</option>
                            <option value="Cooperative Learning">Cooperative Learning</option>
                          </select>
                       </div>
                    </div>
                 )}

                 <div className="mt-8 flex flex-col items-center border-t border-slate-100 pt-6">
                    {progressMsg && (
                      <div className="w-full mb-4 px-4 py-3 bg-blue-100 text-blue-900 rounded-md text-sm font-medium flex items-center justify-center space-x-2 animate-pulse">
                         <Loader2 className="animate-spin h-5 w-5" /><span>{progressMsg}</span>
                      </div>
                    )}
                    {errorMsg && (
                      <div className="w-full mb-4 px-4 py-3 bg-red-100 text-red-900 rounded-md text-sm font-medium flex items-center justify-center space-x-2">
                         <AlertCircle className="h-5 w-5" /><span>{errorMsg}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row w-full justify-center gap-3">
                       <button 
                         onClick={() => handleGenerateModul(selectedTPIndex)} 
                         disabled={isGenerating || extractedTPs.length === 0} 
                         className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-green-700 hover:bg-green-800 disabled:bg-slate-400 transition-colors"
                       >
                         {isGenerating ? 'Memproses...' : `Generate Modul Sesi Ini`}
                       </button>
                       <button 
                         onClick={handleGenerateSemuaModul} 
                         disabled={isGenerating || extractedTPs.length === 0} 
                         className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 transition-colors"
                       >
                         {isGenerating ? 'Memproses...' : `Generate SEMUA Modul Sesi`}
                       </button>
                    </div>
                 </div>
               </div>
               
               {Object.keys(generatedModuls).length > 0 && (
                 <div className="w-full flex-1 flex flex-col bg-[#525659] print-container relative rounded-xl border border-slate-300 pt-8 pb-8 shadow-inner">
                    
                    {extractedTPs.map((tp) => generatedModuls[tp.id] ? (
                       <div key={tp.id} className="document-preview bg-white mx-auto shadow-2xl p-10 lg:p-14 text-black shrink-0 mb-8 relative"
                          style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm' }}
                       >
                          <div className="absolute top-0 left-0 bg-blue-900 text-white px-4 py-1 text-xs font-bold rounded-br-lg print:hidden no-print">
                             MODUL: {tp.kode} (Pertemuan {tp.startMeeting}-{tp.endMeeting})
                          </div>
                          <div dangerouslySetInnerHTML={{ __html: generatedModuls[tp.id] }} />
                       </div>
                    ) : null)}

                    <div ref={modulPreviewRef} className="h-4 w-full shrink-0"></div>

                    <div className="w-full flex flex-wrap justify-center gap-4 pb-8 pt-4 print:hidden no-print shrink-0">
                      <button onClick={handleDownloadWord} className="inline-flex items-center space-x-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-md text-white bg-blue-700 hover:bg-blue-800 transition-colors">
                        <Download className="h-5 w-5" /><span>Download Word (.doc)</span>
                      </button>
                      <button onClick={handleDownloadHTML} className="inline-flex items-center space-x-2 px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <Code className="h-5 w-5" /><span>Source HTML</span>
                      </button>
                      <button onClick={handlePrintHTML} className="inline-flex items-center space-x-2 px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <Printer className="h-5 w-5" /><span>Cetak / PDF</span>
                      </button>
                    </div>
                 </div>
               )}
             </div>
          )}

          {/* TAB 2-7: DOCUMENT VIEWER FOR SHEETS */}
          {activeTab !== 'identitas' && activeTab !== 'modul' && (
            <div className="flex-1 w-full flex flex-col items-center">
              
              {errorMsg && (
                 <div className="w-full max-w-2xl mb-6 px-4 py-3 bg-red-100 text-red-900 rounded-md text-sm font-medium flex items-center justify-center space-x-2 border border-red-200">
                    <AlertCircle className="h-5 w-5 shrink-0" /><span>{errorMsg}</span>
                 </div>
              )}
              {progressMsg && (
                 <div className="w-full max-w-2xl mb-6 px-4 py-3 bg-blue-100 text-blue-900 rounded-md text-sm font-medium flex items-center justify-center space-x-2 border border-blue-200 shadow-sm animate-pulse">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" /><span>{progressMsg}</span>
                 </div>
              )}

              {generatedDocs[activeTab] ? (
                // IF DOCUMENT HAS BEEN GENERATED
                <div className="w-full flex-1 bg-[#525659] print:bg-white print-container relative flex flex-col pt-8 pb-8 rounded-xl shadow-inner border border-slate-300">
                  
                  <div 
                    className="document-preview bg-white mx-auto shadow-2xl p-10 lg:p-14 text-black shrink-0 mb-4 print:mt-0 print:mb-0 print:p-0 relative"
                    style={{ 
                       width: '100%', 
                       maxWidth: ['prosem', 'atp', 'kktp'].includes(activeTab) ? '297mm' : '210mm',
                       minHeight: ['prosem', 'atp', 'kktp'].includes(activeTab) ? '210mm' : '297mm'
                    }}
                  >
                     <div className="absolute top-0 left-0 bg-green-600 text-white px-4 py-1 text-xs font-bold rounded-br-lg print:hidden no-print flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Selesai Dibuat</span>
                     </div>
                     <div dangerouslySetInnerHTML={{ __html: generatedDocs[activeTab] }} />
                  </div>
                  
                  <div className="w-full flex flex-wrap justify-center gap-4 pb-8 pt-4 print:hidden no-print shrink-0">
                    <button onClick={handleDownloadWord} className="inline-flex items-center space-x-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-md text-white bg-blue-700 hover:bg-blue-800 transition-colors">
                      <Download className="h-5 w-5" /><span>Download Word (.doc)</span>
                    </button>
                    <button onClick={handlePrintHTML} className="inline-flex items-center space-x-2 px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                      <Printer className="h-5 w-5" /><span>Cetak / PDF</span>
                    </button>
                    
                    <button 
                       onClick={() => handleGenerateSingle(activeTab)}
                       disabled={isGenerating}
                       className="inline-flex items-center space-x-2 px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300 transition-colors ml-4 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>Buat Ulang (Regenerate)</span>
                    </button>
                  </div>
                </div>
              ) : (
                // IF DOCUMENT HAS NOT BEEN GENERATED YET
                <div className="flex-1 flex flex-col items-center justify-center print:hidden p-8 w-full max-w-2xl mx-auto">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center w-full">
                     <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-10 w-10 text-blue-500" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-800 mb-2">Dokumen {docNames[activeTab]}</h3>
                     <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        Dokumen ini belum di-generate untuk Semester {appData.semester}. Klik tombol di bawah ini untuk memulai AI menyusun dokumen berdasarkan referensi yang Anda berikan.
                     </p>
                     
                     <button 
                       onClick={() => handleGenerateSingle(activeTab)} 
                       disabled={isGenerating}
                       className="w-full md:w-auto inline-flex justify-center items-center px-8 py-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 transition-all transform hover:scale-105 active:scale-95"
                     >
                       {isGenerating ? (
                         <>
                           <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" />
                           Sedang Memproses...
                         </>
                       ) : (
                         `Mulai Generate ${docNames[activeTab]}`
                       )}
                     </button>
                     
                     <p className="text-xs text-slate-400 mt-6 flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> Waktu proses bergantung pada koneksi internet (sekitar 10-30 detik).
                     </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .document-preview table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; border: 1pt solid black; }
        .document-preview th, .document-preview td { border: 1pt solid black; padding: 0.6rem; text-align: left; vertical-align: top; }
        .document-preview th { background-color: #1a3a5c !important; color: white !important; font-weight: bold; }
        .document-preview h1, .document-preview h2, .document-preview h3 { margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1a3a5c; }
        .document-preview p { margin-bottom: 0.5rem; }
        .document-preview .header-kop { text-align: center; border-bottom: 3px solid black; padding-bottom: 1rem; margin-bottom: 2rem; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }
        
        @media print {
          @page { 
            size: A4 ${['prosem', 'atp', 'kktp'].includes(activeTab) ? 'landscape' : 'portrait'}; 
            margin: 1.5cm; 
          }
          body { background: white; }
          #root > div > aside { display: none !important; }
          #root > div > main > header { display: none !important; }
          
          .print-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; margin: 0 !important; background: white !important; border: none !important; box-shadow: none !important;}
          .document-preview { box-shadow: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; border: none !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
}

// Utility Input Component
function Input({ name, label, val, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input 
        type="text" 
        name={name} 
        value={val} 
        onChange={onChange} 
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full text-sm rounded-md border-slate-300 shadow-sm p-2 border ${
          disabled 
            ? 'bg-slate-100 text-slate-500 cursor-not-allowed focus:ring-0 focus:border-slate-300' 
            : 'bg-white focus:border-blue-500 focus:ring-blue-500'
        }`} 
      />
    </div>
  );
}
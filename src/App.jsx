import React, { useState, useRef } from 'react';
import { 
  BookOpen, FileText, Calendar, Layout, 
  LogOut, Printer, Code, Loader2, AlertCircle, 
  ChevronRight, Settings, Check, Download, AlertTriangle, CheckCircle2, RefreshCw, Github
} from 'lucide-react';

const LOGO_URL = "https://cdn.phototourl.com/free/2026-07-19-523222fc-dbc8-4b99-8a72-0a909f4d6586.png";

const generateWithAI = async (systemPrompt, userQuery) => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userQuery })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan pada server AI.');
  return data.result;
};

const getCommonRules = (d) => `
PENTING & WAJIB:
1. Hasilkan HANYA kode HTML murni tanpa dibungkus markdown \`\`\`html.
2. JANGAN sertakan penjelasan apa pun sebelum/sesudah kode HTML.
3. Dokumen ini akan diekspor ke Microsoft Word. Gunakan tabel HTML biasa (<table border="1" style="border-collapse: collapse; width: 100%;">).
4. Terapkan warna background sel sesuai instruksi menggunakan inline CSS.
5. Untuk pindah halaman gunakan: <div style="page-break-before: always;"></div>
6. WAJIB CANTUMKAN BLOK TANDA TANGAN di bagian paling akhir SETIAP dokumen menggunakan tabel HTML tak bergaris.
   Format baris/kolomnya sebagai berikut (Pastikan 2 kolom sejajar):
   - Kolom Kiri: Mengetahui,<br>Kepala Sekolah<br><br><br><br><b>${d.kepsek}</b><br>NIP. ${d.nipKepsek}
   - Kolom Kanan: ${d.kotaTanggal}<br>Guru Mata Pelajaran<br><br><br><br><b>${d.guru}</b><br>NIP. ${d.nipGuru}
`;

const getPromptAnalisisCP = (d) => `Buat dokumen ANALISIS CAPAIAN PEMBELAJARAN. Identitas: Provinsi/Dinas: ${d.provinsiKota} / ${d.dinas}, Sekolah: ${d.sekolah}, Mapel/Singkatan: ${d.mapel} (${d.singkatan}), Fase/Kelas: ${d.fase}, Tahun Pelajaran: ${d.tahun}, Guru: ${d.guru}, Kepsek: ${d.kepsek}, TTD: ${d.kotaTanggal}. CP Umum: ${d.cpUmum}. CP Elemen: ${d.cpElemen}. Buat 9 Bagian Wajib. ${getCommonRules(d)}`;
const getPromptTP = (d) => `Buat dokumen TUJUAN PEMBELAJARAN (TP) UNTUK SEMESTER ${d.semester}. Identitas: ${d.sekolah} | ${d.mapel} | ${d.fase} | ${d.tahun}. Elemen: ${d.elemenList}. Buat tabel TP. ${getCommonRules(d)}`;
const getPromptATP = (d) => `Buat dokumen ALUR TUJUAN PEMBELAJARAN (ATP) UNTUK SEMESTER ${d.semester}. Identitas: ${d.sekolah} | ${d.mapel}. Daftar TP: ${d.dataSebelumnya}. Buat tabel ATP. ${getCommonRules(d)}`;
const getPromptProta = (d) => `Buat dokumen PROGRAM TAHUNAN (PROTA). Fokus Semester ${d.semester}. Kalender: ${d.kalender}. Daftar TP: ${d.dataSebelumnya}. ${getCommonRules(d)}`;
const getPromptProsem = (d) => `Buat dokumen PROGRAM SEMESTER ${d.semester.toUpperCase()} (PROSEM). Kalender: ${d.kalender}. Daftar TP: ${d.dataSebelumnya}. ${getCommonRules(d)}`;
const getPromptKKTP = (d) => `Buat dokumen KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP) UNTUK SEMESTER ${d.semester.toUpperCase()}. Daftar TP: ${d.dataSebelumnya}. ${getCommonRules(d)}`;
const getPromptModul = (d, tpObj) => `Buat dokumen MODUL AJAR KURIKULUM MERDEKA. Mata Pelajaran: ${d.mapel}, Fase: ${d.fase}, Semester: ${d.semester}, Materi Pokok: ${tpObj.materi}, TP: [${tpObj.kode}] ${tpObj.tujuan}, Model: ${d.modelPembelajaran}, Guru: ${d.guru}. Pertemuan Ke-${tpObj.startMeeting} sampai Ke-${tpObj.endMeeting} (${tpObj.pertemuanCount} Pertemuan). ${getCommonRules(d)}`;

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
    modelPembelajaran: 'Problem Based Learning (PBL)', dataSebelumnya: '', githubToken: ''
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

  const tabs = [
    { id: 'identitas', icon: Settings, label: 'Data Global' }, { id: 'cp', icon: FileText, label: '1. CP' },
    { id: 'tp', icon: Layout, label: '2. TP' }, { id: 'atp', icon: ChevronRight, label: '3. ATP' },
    { id: 'prota', icon: Calendar, label: '4. Prota' }, { id: 'prosem', icon: Calendar, label: '5. Prosem' },
    { id: 'kktp', icon: CheckCircle2, label: '6. KKTP' }, { id: 'modul', icon: BookOpen, label: '7. Modul' },
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
            <div className="mb-4"><label className="block text-sm font-bold mb-1">Token Github (Opsional)</label><input type="password" name="githubToken" value={appData.githubToken} onChange={handleChange} className="w-full border p-2 rounded" /></div>
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
          </div>
        )}

        {activeTab !== 'identitas' && activeTab !== 'modul' && (
          <div className="max-w-4xl mx-auto text-center">
            {errorMsg && <div className="bg-red-100 text-red-900 p-3 mb-4 rounded">{errorMsg}</div>}
            {progressMsg && <div className="bg-blue-100 text-blue-900 p-3 mb-4 rounded">{progressMsg}</div>}
            {generatedDocs[activeTab] ? (
              <div className="bg-white p-10 shadow" dangerouslySetInnerHTML={{ __html: generatedDocs[activeTab] }} />
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
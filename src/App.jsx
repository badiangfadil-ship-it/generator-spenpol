import React, { useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  Settings, 
  CheckSquare, 
  Calendar, 
  Layers, 
  Download, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('identitas');
  const [appData, setAppData] = useState({
    githubToken: '',
    sekolah: '',
    mapel: '',
    elemenList: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAppData(prev => ({ ...prev, [name]: value }));
  };

  const tabs = [
    { id: 'identitas', label: 'Data Utama', icon: Settings },
    { id: 'cp', label: 'Capaian Pembelajaran', icon: BookOpen },
    { id: 'modul', label: 'Modul Ajar', icon: FileText }
  ];

  const LOGO_URL = "https://via.placeholder.com/150";

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
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Token Github (Opsional)</label>
              <input type="password" name="githubToken" value={appData.githubToken} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold">Sekolah</label>
                <input type="text" name="sekolah" value={appData.sekolah} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-bold">Mapel</label>
                <input type="text" name="mapel" value={appData.mapel} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold">Elemen CP</label>
              <textarea name="elemenList" rows={3} value={appData.elemenList} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
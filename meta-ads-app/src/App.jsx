import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Target, Briefcase, ImageIcon, Video, Globe, 
  Rocket, CheckCircle2, Lightbulb, Crosshair, PenTool, RefreshCcw, 
  Users, MessageCircle, X, Send, Bot, PlusCircle, LayoutDashboard, 
  CheckSquare, LineChart, ChevronRight, Calculator, ShoppingCart, Store, Trash2,
  KeyRound, ShieldCheck, AlertTriangle, ListChecks, Palette, Activity, Eye, Images,
  AlertOctagon, Info, Copy, Check, TrendingUp
} from 'lucide-react';

// --- CONSTANTS ---
const GOALS = [
  { id: 'sales', title: 'Penjualan (Sales)', desc: 'Pembelian di website/toko online', icon: <ShoppingCart className="w-6 h-6" /> },
  { id: 'leads', title: 'Prospek (Leads)', desc: 'Kumpulkan email/nomor WA', icon: <Briefcase className="w-6 h-6" /> },
  { id: 'local', title: 'Kunjungan Toko', desc: 'Datangkan orang ke toko fisik', icon: <Store className="w-6 h-6" /> },
  { id: 'awareness', title: 'Awareness', desc: 'Jangkau sebanyak mungkin orang', icon: <Target className="w-6 h-6" /> },
];

const ASSETS = [
  { id: 'video', title: 'Video Pendek', desc: 'Reels / TikTok style', icon: <Video className="w-6 h-6" /> },
  { id: 'static', title: 'Gambar Statis', desc: 'Foto produk/desain tunggal', icon: <ImageIcon className="w-6 h-6" /> },
  { id: 'carousel', title: 'Carousel', desc: 'Beberapa gambar digeser (Swipe)', icon: <Images className="w-6 h-6" /> },
  { id: 'none', title: 'Hanya Website', desc: 'Ambil gambar dari katalog web', icon: <Globe className="w-6 h-6" /> },
];

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

// --- HELPER: ROBUST JSON PARSER ---
const parseAIResponse = (text) => {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e, text);
    throw new Error("Format response AI tidak valid. Mohon coba lagi.");
  }
};

// ==========================================
// GROQ API CALL HELPER
// ==========================================
const callGroqAPI = async (messages, apiKey, requireJson = false) => {
  if (!apiKey) throw new Error("API Key belum diatur. Silakan masukkan kunci Groq Anda di menu pengaturan.");

  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: messages,
    temperature: 0.7,
  };

  if (requireJson) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    console.error("Groq Error:", err);
    throw new Error(err.error?.message || 'Gagal menghubungi Groq AI. Periksa koneksi atau API Key Anda.');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// ==========================================
// COMPONENT: SETTINGS MODAL (Input API Key)
// ==========================================
function SettingsModal({ isOpen, onClose, currentKey, onSave }) {
  const [inputKey, setInputKey] = useState(currentKey || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X className="w-6 h-6"/></button>
        
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto">
          <KeyRound className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-extrabold text-center text-slate-900 mb-2">Pengaturan AI</h2>
        <p className="text-center text-slate-500 text-sm mb-6 leading-relaxed">
          Masukkan Kunci API Groq Anda. Kunci ini <strong className="text-slate-700">100% aman</strong> dan hanya disimpan di browser perangkat Anda ini.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Groq API Key</label>
            <input 
              type="password" 
              value={inputKey} 
              onChange={e => setInputKey(e.target.value)} 
              placeholder="gsk_..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={() => { onSave(inputKey); onClose(); }} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" /> Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 1: WIZARD (Buat Kampanye Baru)
// ==========================================
function Wizard({ setActiveTab, setCampaigns, apiKey, addChatMessage, setShowSettings }) {
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({ product: '', audience: '', goal: '', budget: '', assets: [] });
  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = () => {
    if (step === 0 && !apiKey) {
      setShowSettings(true);
      return;
    }
    setStep(prev => prev + 1);
  };
  const handleBack = () => setStep(prev => prev - 1);

  const toggleAsset = (assetId) => {
    setFormData(prev => {
      if (assetId === 'none') return { ...prev, assets: ['none'] };
      const newAssets = prev.assets.includes(assetId)
        ? prev.assets.filter(a => a !== assetId)
        : [...prev.assets.filter(a => a !== 'none'), assetId];
      return { ...prev, assets: newAssets };
    });
  };

  const generateBlueprint = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setStep(7); 
    
    // UPDATE: STRICT CONSISTENCY RULE PROMPT
    const systemPrompt = `Anda adalah Top 1% Media Buyer Meta Ads expert Indonesia tahun 2026. Berdasarkan input user, buat blueprint JSON valid persis seperti skema ini (Jangan tambahkan teks lain selain JSON!).

    ATURAN KONSISTENSI BUDGET & STRUCTURE 2026 (WAJIB IKUTI):
    1. Jika goal = 'sales', objective HARUS menyarankan Advantage+ Shopping Campaign (ASC) jika memungkinkan.
    2. Struktur Ad Set: Selalu sarankan cukup 1 Ad Set Broad saja. TIDAK PERLU multiple Ad Set agar budget tidak terpecah.
    3. Budget Strategy WAJIB mencakup:
       - Rekomendasi CBO (Advantage+ Campaign Budget) untuk mengalokasikan budget otomatis.
       - Ingatkan aturan Fase Testing minimal 3-7 hari (Jangan ubah setting).
       - Berikan aturan scaling konkrit (Contoh: Max +20% setiap 3-4 hari jika CPA masuk target).
       - Selalu ingatkan "Jangan pecah budget terlalu tipis ke banyak ad set".
    4. Creative Frameworks: WAJIB buat 5 matriks kreatif dengan kerangka BERBEDA.
       - WAJIB 1 Angle = "Put Salt in Wound" (Agitasi masalah audiens secara tajam).
       - 4 Angle lain = Testimonial, FOMO, Edukasi, Benefit Driven.
    5. Creative Formats: Padukan Gambar Statis, Video Pendek, atau Carousel.
    6. WAJIB sertakan "visualHook" (Visual 3 detik pertama).

    Format JSON (HARUS SAMA PERSIS NAMA KEY-NYA):
    {
      "campaignName": "Nama Kampanye", 
      "objective": "Objektif spesifik sesuai Goal", 
      "budgetStrategy": "Panduan budget 2-3 paragraf sesuai Aturan Konsistensi di atas. Beri angka/rekomendasi scaling yang spesifik.", 
      "targeting": "Rekomendasi Advantage+ Audience / Broad Targeting",
      "creativeMatrix": [
        {
          "angleName": "Framework (misal: Put Salt in Wound)", 
          "visualHook": "Visual 3 detik pertama (misal: Tulisan kuning DISKON 50%)",
          "primaryText": "Caption copywriting", 
          "headline": "Judul clicky", 
          "description": "Deskripsi", 
          "callToAction": "Tombol CTA", 
          "format": "Format Aset (Gambar Statis / Video Pendek / Carousel)"
        }
      ],
      "proTip": "1 kalimat super tip rahasia Meta Ads 2026"
    }`;

    const userQuery = `Produk: ${formData.product}\nAudiens: ${formData.audience}\nTujuan: ${GOALS.find(g=>g.id===formData.goal)?.title}\nAnggaran: Rp ${formData.budget}\nAset yang bisa disiapkan user: ${formData.assets.join(', ')}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ];

    try {
      const resultText = await callGroqAPI(messages, apiKey, true);
      const parsedBlueprint = parseAIResponse(resultText);
      
      const newCampaign = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('id-ID'),
        formData: { ...formData },
        blueprint: parsedBlueprint,
        checklist: [
          { id: 1, text: 'Verifikasi Domain & Setup Meta Pixel/CAPI di website', done: false },
          { id: 2, text: 'Buat Campaign dengan Advantage+ Campaign Budget (CBO)', done: false },
          { id: 3, text: 'Buat 1 Ad Set Broad (Advantage+ Audience)', done: false },
          { id: 4, text: 'Upload 5 variasi kreatif ke dalam 1 Ad Set tersebut (atau gunakan DCO)', done: false },
          { id: 5, text: 'FASE PEMBELAJARAN: DILARANG KERAS mematikan/edit iklan selama 72 JAM PERTAMA', done: false },
        ],
        analyses: []
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
      addChatMessage(`Blueprint "${parsedBlueprint.campaignName}" sudah matang! AI telah memastikan strategi budget (CBO) selaras dengan struktur 1 Ad Set. Masuk ke tab "Setup & Strategi" untuk melihat panduan konkritnya.`);
      
      setTimeout(() => { setActiveTab('dashboard'); }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyusun Blueprint. Silakan coba lagi.');
      setStep(6); 
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-in fade-in">
      {step > 0 && step < 7 && <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-8"><div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${(step / 6) * 100}%` }}/></div>}

      {step === 0 && (
        <div className="text-center mt-12">
          <div className="bg-blue-100 text-blue-700 p-5 rounded-full inline-block mb-6"><Target className="w-12 h-12" /></div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Mulai Setup. <br/>Cetak Winning Ads.</h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed">Framework Meta Ads standar 2026 ditenagai AI. Dapatkan panduan teknis Ads Manager & copywriting "Put Salt in Wound" secepat kilat.</p>
          <button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-full text-lg shadow-lg flex items-center gap-2 mx-auto">Mulai Setup Baru <ArrowRight className="w-5 h-5" /></button>
          {!apiKey && <p className="text-sm text-amber-600 mt-4 font-medium flex items-center justify-center gap-1"><AlertTriangle className="w-4 h-4"/> Anda akan diminta memasukkan API Key saat memulai.</p>}
        </div>
      )}

      {step === 1 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-2">Apa yang Anda jual?</h2>
          <textarea className="w-full bg-white border border-slate-300 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-blue-500 outline-none mt-4 min-h-[150px]" placeholder="Sebutkan fitur, benefit utama, dan penawaran (contoh: Promo Diskon 50%)..." value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} />
          <p className="text-sm text-slate-500 mt-3 flex items-start gap-2 bg-slate-100 p-3 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> Semakin detail Anda mendeskripsikan "Unfair Advantage" produk Anda, semakin tajam AI meracik copywriting.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500 hover:text-slate-800"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={formData.product.length < 5} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-2">Siapa ideal buyer Anda?</h2>
          <textarea className="w-full bg-white border border-slate-300 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-blue-500 outline-none mt-4 min-h-[150px]" placeholder="Contoh: Pekerja kantoran usia 25-40 tahun yang sering lembur dan butuh solusi cepat..." value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} />
          <p className="text-sm text-slate-500 mt-3 flex items-start gap-2 bg-slate-100 p-3 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> <b>Tips 2026:</b> Jangan memikirkan targeting Ads Manager yang sempit. Cukup tulis persona-nya, biarkan Advantage+ Meta yang bekerja.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500 hover:text-slate-800"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={formData.audience.length < 5} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-6">Tujuan (Objective) Iklan?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOALS.map(g => (
              <div key={g.id} onClick={() => setFormData({...formData, goal: g.id})} className={`cursor-pointer p-5 rounded-2xl border-2 flex flex-col gap-3 transition-all ${formData.goal===g.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className={`p-3 rounded-full w-fit ${formData.goal===g.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{g.icon}</div>
                <div><h3 className="font-bold text-lg">{g.title}</h3><p className="text-sm text-slate-500">{g.desc}</p></div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2"><Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> Pilih "Penjualan" jika Anda ingin mengaktifkan kampanye canggih ASC+ (Advantage+ Shopping Campaign).</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={!formData.goal} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-6">Budget Harian? (Rp)</h2>
          <input type="number" className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-2xl font-bold focus:border-blue-500 outline-none" placeholder="100000" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
          {formData.budget && <p className="text-green-600 mt-2 font-medium ml-2">{formatRupiah(formData.budget)}</p>}
          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2 bg-slate-100 p-3 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> Fase testing awal minimal butuh Rp50.000 - Rp100.000 per hari untuk melewati fase pembelajaran Meta dengan cepat.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={!formData.budget || Number(formData.budget)<15000} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-6">Aset Kreatif yang Bisa Dibuat?</h2>
          <div className="grid grid-cols-1 gap-4">
            {ASSETS.map(a => (
              <div key={a.id} onClick={() => toggleAsset(a.id)} className={`cursor-pointer p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${formData.assets.includes(a.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="flex items-center gap-4"><div className={`p-3 rounded-full ${formData.assets.includes(a.id)?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{a.icon}</div><div><h3 className="font-bold">{a.title}</h3><p className="text-sm text-slate-500">{a.desc}</p></div></div>
                {formData.assets.includes(a.id) && <CheckCircle2 className="text-blue-600 w-6 h-6" />}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> Pilih format yang Anda sanggup produksi. Sangat disarankan memilih lebih dari 1 format (misal: Video & Carousel).</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={formData.assets.length === 0} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Review Data <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-6">Review Setup Anda</h2>
          {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border border-red-200">{errorMsg}</div>}
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div><span className="block text-xs font-bold text-slate-400 uppercase">Produk / Penawaran</span><p className="text-slate-800 font-medium">{formData.product}</p></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase">Audiens Target</span><p className="text-slate-800 font-medium">{formData.audience}</p></div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><span className="block text-xs font-bold text-slate-400 uppercase">Goal</span><p className="text-slate-800 font-medium capitalize">{formData.goal}</p></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase">Budget/Hari</span><p className="text-slate-800 font-medium">{formatRupiah(formData.budget)}</p></div>
                <div><span className="block text-xs font-bold text-slate-400 uppercase">Aset Format</span><p className="text-slate-800 font-medium capitalize">{formData.assets.join(', ')}</p></div>
             </div>
          </div>

          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> Setelah ini, AI akan memproses data Anda untuk meracik <b>5 Framework Iklan</b> beserta panduan lengkap cara Setup di Ads Manager.</p>
          
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={generateBlueprint} className="bg-slate-900 hover:bg-black text-white font-bold py-4 px-8 rounded-full flex gap-2 items-center shadow-lg transition-transform hover:scale-105">Mulai Generate AI <Rocket className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95">
          <div className="relative w-20 h-20 mb-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-2xl font-bold mb-2">Groq sedang menganalisis...</h2>
          <p className="text-slate-500 max-w-sm mx-auto">Menulis copywriting (termasuk teknik "Salt in Wound"), menyiapkan panduan struktur Kampanye konsisten, dan mendistribusikan format konten...</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 2: DASHBOARD (Daftar Kampanye)
// ==========================================
function Dashboard({ campaigns, openCampaign, deleteCampaign }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Riwayat Kampanye</h1>
          <p className="text-slate-500 mt-2">Data tersimpan lokal. Klik kampanye untuk melihat panduan Setup & Monitoring.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 w-fit mt-4 md:mt-0">
          <Briefcase className="w-5 h-5"/> {campaigns.length} Kampanye
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <LayoutDashboard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">Belum Ada Kampanye</h3>
          <p className="text-slate-500 mb-6">Mulai buat blueprint pertama Anda sekarang.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map(camp => {
             const progress = Math.round((camp.checklist.filter(t => t.done).length / camp.checklist.length) * 100);
             let statusBadge = <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">Draft / Setup</span>;
             if (progress === 100 && camp.analyses.length === 0) statusBadge = <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">Learning Phase</span>;
             if (camp.analyses.length > 0) statusBadge = <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded border border-green-200">Dioptimasi</span>;

             return (
              <div key={camp.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => openCampaign(camp)}>
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Target className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                       {camp.blueprint?.campaignName || 'Kampanye Baru'} {statusBadge}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="bg-slate-50 px-2 py-1 rounded text-xs font-semibold border border-slate-100">{camp.date}</span>
                      <span className="uppercase text-xs font-bold text-slate-400">{camp.formData.goal}</span>
                      <span className="text-xs font-medium">{formatRupiah(camp.formData.budget)}/hr</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); deleteCampaign(camp.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                  <button onClick={() => openCampaign(camp)} className="p-2 text-slate-400 group-hover:text-blue-600 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 3: CAMPAIGN DETAIL (TABS TERPISAH)
// ==========================================
function CampaignDetail({ campaign, closeDetail, updateCampaign, apiKey }) {
  const [activeInnerTab, setActiveInnerTab] = useState('setup'); 
  const [analysisForm, setAnalysisForm] = useState({ spend: '', results: '', ctr: '', cpc: '', frequency: '', impressions: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAngle, setIsGeneratingAngle] = useState(false);
  const [copiedName, setCopiedName] = useState(false);

  if (!campaign) return null;
  const progress = Math.round((campaign.checklist.filter(t => t.done).length / campaign.checklist.length) * 100);

  const handleToggleChecklist = (taskId) => {
    const updatedChecklist = campaign.checklist.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    updateCampaign({ ...campaign, checklist: updatedChecklist });
  };

  const handleCopy = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  const handleAnalyze = async () => {
    if(!apiKey) return alert("API Key belum diatur. Silakan atur di menu.");
    setIsAnalyzing(true);
    
    const prompt = `Anda adalah Senior Meta Ads Media Buyer Indonesia 2026 dengan spesialisasi Advantage+ (Broad Targeting, CBO/ASC).

    Konteks Kampanye:
    - Nama: ${campaign.blueprint.campaignName}
    - Goal: ${campaign.formData.goal}
    - Budget Harian: Rp${campaign.formData.budget}
    - Mulai Setup: ${campaign.date}
    - Produk: ${campaign.formData.product}
    - Audiens: ${campaign.formData.audience}

    Data Terkini:
    - Spend: Rp${analysisForm.spend}
    - Konversi/Results: ${analysisForm.results}
    - CTR: ${analysisForm.ctr}%
    - CPC: Rp${analysisForm.cpc}
    - Frequency: ${analysisForm.frequency || 'Belum diinput'}
    - Impressions/Reach: ${analysisForm.impressions || 'Belum diinput'}

    Tugas Anda (Jawab padat, tegas, dan bahasa Indonesia):
    1. Evaluasi CPA/Performa (Bandingkan dengan benchmark Indonesia: CPM rata-rata Rp40k-80k, CTR 1-3%).
    2. Deteksi Creative Fatigue: Analisis korelasi CTR yang drop, Frequency naik, dan Impressions.
    3. Status Learning Phase: Apakah sudah aman (idealnya butuh ~50 konversi)?
    4. Action Plan Konkrit & Prioritas: Haruskah Scale up budget (max 20%), Kill angle yang buruk, Tambah materi kreatif baru, atau Jangan Sentuh dulu?`;

    const messages = [
      { role: "system", content: "Anda adalah analis pakar Meta Ads yang kejam dan jujur berdasarkan data." },
      { role: "user", content: prompt }
    ];

    try {
      const insight = await callGroqAPI(messages, apiKey, false);
      const newAnalysis = { id: Date.now().toString(), date: new Date().toLocaleDateString('id-ID'), data: { ...analysisForm }, insight };
      const updatedAnalyses = [newAnalysis, ...(campaign.analyses || [])];
      
      updateCampaign({ ...campaign, analyses: updatedAnalyses });
      setAnalysisForm({ spend: '', results: '', ctr: '', cpc: '', frequency: '', impressions: '' }); 
    } catch (error) {
      alert(`Gagal menganalisis: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateNewAngle = async () => {
    if(!apiKey) return alert("API Key belum diatur. Silakan atur di menu.");
    setIsGeneratingAngle(true);
    const existingAngles = campaign.blueprint.creativeMatrix.map(a => a.angleName).join(', ');
    
    const prompt = `Anda adalah expert Meta Ads. Buat HANYA SATU angle iklan BARU untuk produk ini yang SANGAT BERBEDA dari angle yang sudah ada. 
    Jika di list angle sebelumnya belum ada "Put Salt in Wound", maka WAJIB gunakan teknik tersebut. Jika sudah ada, gunakan teknik agresif lain seperti Us vs Them, atau Visual Pattern Interrupt.
    Pastikan format yang disarankan adalah salah satu dari: Gambar Statis, Video Pendek, atau Carousel.
    
    Produk: ${campaign.formData.product}
    Audiens: ${campaign.formData.audience}
    Angle yang SUDAH ADA (JANGAN gunakan angle ini lagi): ${existingAngles}

    Kembalikan HANYA format JSON valid persis seperti ini:
    {
      "angleName": "Nama Angle Baru",
      "visualHook": "Saran visual 3 detik pertama",
      "primaryText": "Caption iklan memikat (maks 3 kalimat)",
      "headline": "Judul click-worthy",
      "description": "Deskripsi singkat / penawaran",
      "callToAction": "Tombol CTA",
      "format": "Format Aset (Gambar Statis / Video Pendek / Carousel)"
    }`;

    const messages = [
      { role: "system", content: "Kembalikan hanya JSON." },
      { role: "user", content: prompt }
    ];

    try {
      const resultText = await callGroqAPI(messages, apiKey, true);
      const newAngle = parseAIResponse(resultText);
      
      const updatedMatrix = [...campaign.blueprint.creativeMatrix, newAngle];
      updateCampaign({
        ...campaign,
        blueprint: { ...campaign.blueprint, creativeMatrix: updatedMatrix }
      });
    } catch (error) {
      alert(`Gagal membuat angle baru: ${error.message}`);
    } finally {
      setIsGeneratingAngle(false);
    }
  };

  const getFormatIcon = (formatStr) => {
    const f = formatStr.toLowerCase();
    if (f.includes('video')) return <Video className="w-4 h-4" />;
    if (f.includes('carousel')) return <Images className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const currentCpa = (analysisForm.spend && analysisForm.results && Number(analysisForm.results) > 0) 
      ? Math.round(Number(analysisForm.spend) / Number(analysisForm.results)) 
      : 0;
  const showCtrWarning = analysisForm.ctr && Number(analysisForm.ctr) < 1;
  const showFreqWarning = analysisForm.frequency && Number(analysisForm.frequency) > 2.5;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 animate-in slide-in-from-right-4 duration-300">
      <button onClick={closeDetail} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm w-fit">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </button>

      {/* HEADER KAMPANYE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-3">
              {campaign.blueprint.campaignName}
            </h1>
            <p className="text-slate-500 flex flex-wrap gap-2">
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">{campaign.blueprint.objective}</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{campaign.date}</span>
            </p>
          </div>
          <div className="text-left md:text-right bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full md:w-auto">
            <p className="text-sm text-slate-500 mb-1 font-bold">Anggaran Harian</p>
            <p className="text-2xl font-black text-slate-900">{formatRupiah(campaign.formData.budget)}</p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
        <button onClick={() => setActiveInnerTab('setup')} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${activeInnerTab === 'setup' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
           <ListChecks className="w-5 h-5"/> Setup & Strategi
        </button>
        <button onClick={() => setActiveInnerTab('kreatif')} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${activeInnerTab === 'kreatif' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
           <Palette className="w-5 h-5"/> Bank Kreatif
        </button>
        <button onClick={() => setActiveInnerTab('monitoring')} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${activeInnerTab === 'monitoring' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
           <Activity className="w-5 h-5"/> Monitoring AI
        </button>
      </div>

      {/* TAB CONTENT: SETUP & STRATEGI */}
      {activeInnerTab === 'setup' && (
        <div className="animate-in fade-in space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* UPDATE: UI STRATEGI BUDGET AI PINTAR */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 border border-blue-100 col-span-1 md:col-span-2 shadow-sm">
               <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <Calculator className="w-5 h-5"/> Strategi Budget & Scaling AI
               </h4>
               
               {campaign.formData.goal === 'sales' && (
                 <div className="bg-white border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm text-sm text-slate-700 mb-6 font-medium flex items-start gap-3">
                   <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                   <div>
                     <strong className="text-emerald-800 block mb-1">Rekomendasi Utama: ASC Mode Aktif</strong> 
                     Untuk goal Penjualan, gunakan <b>Advantage+ Shopping Campaign (ASC)</b>. Meta akan otomatis mengalokasikan budget di level Campaign. Ikuti panduan AI di bawah ini.
                   </div>
                 </div>
               )}
               
               <div className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap text-sm md:text-base mb-6">
                 {campaign.blueprint.budgetStrategy}
               </div>

               <div className="grid grid-cols-2 gap-4 text-xs">
                 <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center">
                   <p className="font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Fase Testing</p>
                   <p className="font-black text-slate-800 text-sm md:text-base">3–7 Hari (Jangan Sentuh)</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                   <p className="font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5"/> Aturan Scale Up</p>
                   <p className="font-black text-emerald-600 text-sm md:text-base">Max +20% / 3 Hari</p>
                 </div>
               </div>
            </div>

            <div className="bg-purple-50/50 rounded-2xl p-6 border border-purple-100 md:col-span-2">
               <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Users className="w-4 h-4"/> Sistem Targeting AI</h4>
               <p className="text-slate-800 font-medium leading-relaxed">{campaign.blueprint.targeting}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-3 text-slate-900">
              <Info className="w-6 h-6 text-blue-600"/> Panduan Struktur di Meta Ads Manager
            </h3>

            <div className="space-y-8">
              {/* Level 1: Campaign */}
              <div className="relative pl-6 border-l-2 border-slate-200">
                <div className="absolute -left-3 top-0 bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">1</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Level 1: Campaign</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-700 text-sm">Nama Kampanye:</span>
                    <button onClick={() => handleCopy(campaign.blueprint.campaignName)} className="text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors">
                      {copiedName ? <><Check className="w-3.5 h-3.5 text-green-600"/> Dicopy</> : <><Copy className="w-3.5 h-3.5"/> Copy</>}
                    </button>
                  </div>
                  <div className="font-mono bg-white border border-slate-200 p-3 rounded-lg text-sm text-slate-800 break-all mb-4">
                    {campaign.blueprint.campaignName}
                  </div>
                  <p className="text-sm text-slate-600 flex items-center gap-2"><span className="font-medium text-slate-700">Pilih Objective:</span> <strong className="text-slate-900 bg-blue-100 px-2 py-0.5 rounded">{campaign.blueprint.objective}</strong></p>
                </div>
              </div>

              {/* Level 2: Ad Set */}
              <div className="relative pl-6 border-l-2 border-slate-200">
                <div className="absolute -left-3 top-0 bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">2</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Level 2: Ad Set</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="font-medium text-slate-800 text-sm mb-4">Sesuai aturan konsistensi AI: Buat <strong>Cukup 1 Ad Set Broad</strong> agar budget tidak terpecah sia-sia.</p>
                  <ul className="text-sm text-slate-600 list-none space-y-3">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5"/><span className="font-medium text-slate-800">Audience:</span> Biarkan Broad (Advantage+ Audience). Meta akan mencari pembeli berdasarkan interaksi pada materi kreatif Anda.</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5"/><span className="font-medium text-slate-800">Placement:</span> Pilih Advantage+ Placements (Otomatis).</li>
                  </ul>
                </div>
              </div>

              {/* Level 3: Ads */}
              <div className="relative pl-6 border-l-2 border-transparent">
                <div className="absolute -left-3 top-0 bg-emerald-100 text-emerald-600 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">3</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Level 3: Ads (Kreatif)</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="font-medium text-slate-800 text-sm mb-4">Masuk ke level Ads. Kami merekomendasikan menggunakan <b>Dynamic Creative (DCO)</b> atau mengunggah 5 Angle dari Bank Kreatif Anda.</p>
                  <button onClick={() => setActiveInnerTab('kreatif')} className="mt-2 w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Palette className="w-4 h-4"/> Buka Bank Kreatif & Copywriting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BANK KREATIF */}
      {activeInnerTab === 'kreatif' && (
        <div className="animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div>
                <h4 className="font-extrabold text-2xl text-slate-800">Bank Kreatif (Ad Level)</h4>
                <p className="text-sm text-slate-500 mt-1">Berbagai kombinasi format (Carousel, Video, Statis) dan teknik copywriting untuk DCO.</p>
             </div>
             <button 
                onClick={handleGenerateNewAngle} 
                disabled={isGeneratingAngle}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
              >
                {isGeneratingAngle ? <span className="animate-pulse">Menganalisis...</span> : <><Lightbulb className="w-5 h-5" /> Buat Angle Baru (AI)</>}
              </button>
          </div>

          <div className="grid gap-6">
            {campaign.blueprint.creativeMatrix.map((ad, idx) => {
              const isSaltInWound = ad.angleName.toLowerCase().includes('salt') || ad.angleName.toLowerCase().includes('agitasi');
              return (
              <div key={idx} className={`bg-white border ${isSaltInWound ? 'border-red-200 shadow-red-100' : 'border-slate-200 shadow-sm'} rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow`}>
                <div className={`absolute top-0 left-0 w-2 h-full ${isSaltInWound ? 'bg-red-500' : 'bg-slate-200 group-hover:bg-blue-500'} transition-colors`}></div>
                
                <div className="ml-2">
                  <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                    <span className={`${isSaltInWound ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider`}>
                      Angle: {ad.angleName}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded uppercase tracking-wider ml-auto flex items-center gap-1.5">
                      {getFormatIcon(ad.format)} {ad.format}
                    </span>
                  </div>
                  
                  {ad.visualHook && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-4 flex gap-3 items-start">
                      <Eye className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Visual Hook (3 Detik Pertama)</span>
                        <p className="text-amber-900 font-medium text-sm">{ad.visualHook}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teks Utama (Primary Text)</span>
                        <button onClick={() => handleCopy(ad.primaryText)} className="text-blue-600 hover:text-blue-800"><Copy className="w-3.5 h-3.5"/></button>
                      </div>
                      <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{ad.primaryText}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Judul (Headline)</span>
                          <button onClick={() => handleCopy(ad.headline)} className="text-blue-600 hover:text-blue-800"><Copy className="w-3.5 h-3.5"/></button>
                        </div>
                        <p className="font-bold text-slate-900">{ad.headline}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Deskripsi & CTA</span>
                          {ad.description && <p className="text-slate-600 text-sm mb-2">{ad.description}</p>}
                        </div>
                        <div className="mt-2 inline-block bg-slate-200 text-slate-800 text-xs font-black px-4 py-2 rounded-lg w-fit uppercase">{ad.callToAction}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MONITORING AI (NEW DATA-DRIVEN VERSION) */}
      {activeInnerTab === 'monitoring' && (
        <div className="animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-60"></div>
            <h3 className="flex items-center gap-2 font-extrabold text-2xl mb-2 text-slate-900"><LineChart className="text-blue-600 w-8 h-8"/> Deteksi Performa & Kelelahan Iklan (Fatigue)</h3>
            <p className="text-slate-500 mb-8 max-w-2xl">Masukkan data terkini kampanye Anda. Metrik <span className="font-bold text-slate-700">Frequency</span> dan <span className="font-bold text-slate-700">Impressions</span> akan membantu AI memberikan analisis apakah Anda harus <em className="text-blue-600 font-medium">Scale Up</em>, <em className="text-red-500 font-medium">Matikan Iklan</em>, atau sekadar menunggu.</p>
            
            <div className="space-y-6 relative z-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              {/* Form Baris 1: Konversi dasar */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-bold text-slate-500 block mb-2">TOTAL SPEND (Rp)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={analysisForm.spend} onChange={e=>setAnalysisForm({...analysisForm, spend: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-2">HASIL KONVERSI</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={analysisForm.results} onChange={e=>setAnalysisForm({...analysisForm, results: e.target.value})} /></div>
                
                {/* Real-time CPA Calculator Box */}
                <div className="bg-blue-600 text-white p-4 rounded-xl shadow-inner flex flex-col justify-center items-start">
                   <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Real-time CPA (Cost per Action)</span>
                   <span className="text-2xl font-black">{currentCpa > 0 ? `Rp ${currentCpa.toLocaleString('id-ID')}` : '-'}</span>
                </div>
              </div>

              {/* Form Baris 2: Indikator Fatigue (CTR, Freq, Impressions) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200 pt-4">
                <div><label className="text-xs font-bold text-slate-500 block mb-2">RATA-RATA CTR (%)</label><input type="number" step="0.1" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={analysisForm.ctr} onChange={e=>setAnalysisForm({...analysisForm, ctr: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-2">FREQUENCY</label><input type="number" step="0.1" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={analysisForm.frequency} onChange={e=>setAnalysisForm({...analysisForm, frequency: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-2">IMPRESSIONS / REACH</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={analysisForm.impressions} onChange={e=>setAnalysisForm({...analysisForm, impressions: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-2">CPC (Rp)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={analysisForm.cpc} onChange={e=>setAnalysisForm({...analysisForm, cpc: e.target.value})} /></div>
              </div>

              {/* Warnings Peringatan Dini Cepat */}
              {(showCtrWarning || showFreqWarning) && (
                <div className="flex flex-col gap-2 mt-2">
                   {showCtrWarning && <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-lg border border-red-100 flex items-center gap-2"><AlertOctagon className="w-4 h-4" /> Peringatan: CTR di bawah 1%. Periksa kembali Visual Hook 3 detik pertama Anda.</div>}
                   {showFreqWarning && <div className="bg-amber-50 text-amber-700 text-xs font-bold p-3 rounded-lg border border-amber-100 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Waspada: Frequency melebihi 2.5x. Iklan Anda mulai mengalami Creative Fatigue.</div>}
                </div>
              )}

              <button onClick={handleAnalyze} disabled={!analysisForm.spend || !analysisForm.results || isAnalyzing} className="w-full bg-slate-900 disabled:bg-slate-300 hover:bg-black text-white font-extrabold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-lg mt-4">
                {isAnalyzing ? <span className="animate-pulse">Menganalisis Korelasi Data...</span> : <><Bot className="w-5 h-5"/> Dapatkan Analisis & Action Plan Meta 2026</>}
              </button>
            </div>

            {campaign.analyses && campaign.analyses.length > 0 && (
              <div className="mt-10 border-t border-slate-200 pt-8 relative z-10">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6">Riwayat Log Optimasi AI</h4>
                <div className="space-y-6">
                  {campaign.analyses.map(an => (
                     <div key={an.id} className="bg-white border-l-4 border-blue-500 rounded-r-2xl p-6 shadow-sm relative">
                       <span className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">{an.date}</span>
                       <div className="flex flex-wrap gap-4 mb-4 border-b border-slate-50 pb-4">
                         <div className="bg-slate-50 p-2 rounded-lg min-w-[100px]"><span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CPA Aktual</span><span className="font-black text-slate-900">Rp {Math.round(an.data.spend / an.data.results).toLocaleString('id-ID')}</span></div>
                         <div className="bg-slate-50 p-2 rounded-lg min-w-[80px]"><span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CTR</span><span className="font-black text-slate-900">{an.data.ctr}%</span></div>
                         {an.data.frequency && <div className="bg-slate-50 p-2 rounded-lg min-w-[80px]"><span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Freq</span><span className="font-black text-slate-900">{an.data.frequency}x</span></div>}
                       </div>
                       <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                         {an.insight}
                       </div>
                     </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 4: CHATBOT (Floating Assistant dgn Memory Konteks)
// ==========================================
// Tambahkan ikon Clock kecil
const Clock = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

function Chatbot({ apiKey, contextData, setShowSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Halo! Ada pertanyaan tentang Meta Ads atau butuh panduan scaling?' }]);
  const endRef = useRef(null);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  useEffect(() => {
    if (contextData?.externalMessage) {
      setMessages(prev => [...prev, { role: 'assistant', content: contextData.externalMessage }]);
      setIsOpen(true);
    }
  }, [contextData?.externalMessage]);

  const handleSend = async (e, forcedInput = null) => {
    if (e) e.preventDefault();
    const textToSend = forcedInput || input;
    if (!textToSend.trim()) return;
    
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const newMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, newMsg]); 
    if(!forcedInput) setInput(''); 
    setIsTyping(true);

    // UPDATE: SMART CONTEXT INJECTION (Chatbot sekarang tahu isi kampanye!)
    let sysContext = `Anda adalah Senior Meta Ads Media Buyer Indonesia 2026 yang sangat berpengalaman dan tajam dalam mengoptimasi data.\n\n`;
    
    if (contextData?.campaign) {
       sysContext += `Konteks Kampanye User Saat Ini:\n- Nama: ${contextData.campaign.blueprint.campaignName}\n- Goal: ${contextData.campaign.formData.goal}\n- Budget: Rp${contextData.campaign.formData.budget}\n- Objective: ${contextData.campaign.blueprint.objective}\n`;
       
       if (contextData.campaign.blueprint.creativeMatrix) {
         const angles = contextData.campaign.blueprint.creativeMatrix.map(a => a.angleName).join(', ');
         sysContext += `- Angle Kreatif yang dimiliki: ${angles}\n`;
       }
    } else {
       sysContext += `Saat ini user belum membuka kampanye apapun.\n`;
    }

    sysContext += `\nTugas Anda:
    - Jawab dengan bahasa Indonesia santai tapi sangat profesional dan to-the-point.
    - SELALU hubungkan jawaban Anda dengan data kampanye user di atas (jika ada).
    - Berikan saran konkrit (misal: ASC, CBO, Advantage+).
    - Jika ditanya scaling/optimasi, tanyakan balik metrik terbaru (CTR, Freq, Spend) jika mereka belum menyebutkannya.`;

    const groqMessages = [
      { role: 'system', content: sysContext },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      newMsg
    ];

    try {
      const responseText = await callGroqAPI(groqMessages, apiKey, false);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Maaf, koneksi AI terputus. (${err.message})` }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white w-[360px] max-w-[calc(100vw-32px)] h-[550px] max-h-[75vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center z-10 relative">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm">Ads Assistant AI</h3>
                <p className="text-[10px] text-slate-400">{contextData?.campaign ? `Context: ${contextData.campaign.blueprint.campaignName.substring(0,20)}...` : 'Tanya seputar Meta Ads'}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
                <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && <div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span></div></div>}
            <div ref={endRef} />
          </div>
          
          {/* QUICK CHAT SUGGESTIONS */}
          {messages.length <= 2 && !isTyping && (
             <div className="px-4 pb-2 pt-1 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 border-t border-slate-100">
               <button onClick={() => handleSend(null, "Kapan saya boleh mulai scale budget?")} className="whitespace-nowrap text-[10px] bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-50 shadow-sm transition-colors">Kapan boleh scale?</button>
               <button onClick={() => handleSend(null, "Bagaimana cara mendeteksi Creative Fatigue?")} className="whitespace-nowrap text-[10px] bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-50 shadow-sm transition-colors">Cek Fatigue</button>
               <button onClick={() => handleSend(null, "Apa kelebihan Advantage+ Shopping (ASC)?")} className="whitespace-nowrap text-[10px] bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-50 shadow-sm transition-colors">Apa itu ASC?</button>
             </div>
          )}

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input type="text" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ketik pesan..." className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            <button type="submit" disabled={!input.trim() || isTyping} className="bg-blue-600 disabled:bg-slate-300 text-white rounded-full p-3 hover:bg-blue-700 transition-colors shadow-sm"><Send className="w-4 h-4 ml-0.5" /></button>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${isOpen ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}

// ==========================================
// COMPONENT 5: MAIN APP (Layout Sidebar & Bottom Nav)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [chatMessageQueue, setChatMessageQueue] = useState(null); 
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('metaAds_groqKey') || '');
  const [showSettings, setShowSettings] = useState(false);

  const [campaigns, setCampaigns] = useState(() => {
    try {
      const saved = localStorage.getItem('metaAdsCampaigns_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => { localStorage.setItem('metaAdsCampaigns_v2', JSON.stringify(campaigns)); }, [campaigns]);

  const handleSaveApiKey = (key) => {
    localStorage.setItem('metaAds_groqKey', key);
    setApiKey(key);
  };

  const openCampaign = (campaign) => { setSelectedCampaignId(campaign.id); setActiveTab('campaignDetail'); };
  const updateCampaign = (updatedCampaign) => { setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)); };
  const deleteCampaign = (id) => {
    if (confirm('Yakin ingin menghapus kampanye ini?')) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (selectedCampaignId === id) setActiveTab('dashboard');
    }
  };

  const activeCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 overflow-hidden">
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        currentKey={apiKey} 
        onSave={handleSaveApiKey} 
      />

      {/* --- SIDEBAR UNTUK DESKTOP --- */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shadow-sm z-10 relative">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600 font-extrabold text-2xl">
          <Target className="w-8 h-8" /><span>MetaAds<span className="text-slate-800">Pro</span></span>
        </div>
        <nav className="p-4 space-y-3 mt-2 flex-1">
          <button 
            onClick={() => {setActiveTab('dashboard'); setSelectedCampaignId(null);}} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === 'dashboard' || activeTab === 'campaignDetail' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={() => {setActiveTab('new'); setSelectedCampaignId(null);}} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === 'new' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <PlusCircle className="w-5 h-5" /> Setup Kampanye
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-100">
           <button onClick={() => setShowSettings(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${apiKey ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}>
             <KeyRound className="w-5 h-5" /> API Key {apiKey ? 'Tersimpan' : '(Kosong)'}
           </button>
        </div>
      </aside>

      {/* --- HEADER KHUSUS MOBILE --- */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xl">
           <Target className="w-6 h-6" /><span>MetaAds<span className="text-slate-800">Pro</span></span>
        </div>
        <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg ${apiKey ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
           <KeyRound className="w-5 h-5" />
        </button>
      </div>

      {/* --- AREA KONTEN UTAMA --- */}
      <main className="flex-1 h-full overflow-y-auto pt-16 md:pt-0 pb-24 md:pb-0 relative scroll-smooth">
        {activeTab === 'new' && <Wizard setActiveTab={setActiveTab} setCampaigns={setCampaigns} apiKey={apiKey} addChatMessage={setChatMessageQueue} setShowSettings={setShowSettings} />}
        {activeTab === 'dashboard' && <Dashboard campaigns={campaigns} openCampaign={openCampaign} deleteCampaign={deleteCampaign} />}
        {activeTab === 'campaignDetail' && activeCampaign && <CampaignDetail campaign={activeCampaign} closeDetail={() => setActiveTab('dashboard')} updateCampaign={updateCampaign} apiKey={apiKey} />}
      </main>

      {/* --- BOTTOM NAVIGATION UNTUK MOBILE --- */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-2 z-20 pb-safe shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        <button 
          onClick={() => {setActiveTab('dashboard'); setSelectedCampaignId(null);}} 
          className={`flex flex-col items-center gap-1 p-2 w-full ${activeTab === 'dashboard' || activeTab === 'campaignDetail' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button 
          onClick={() => {setActiveTab('new'); setSelectedCampaignId(null);}} 
          className={`flex flex-col items-center gap-1 p-2 w-full ${activeTab === 'new' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <PlusCircle className="w-6 h-6" />
          <span className="text-[10px] font-bold">Setup Baru</span>
        </button>
      </nav>

      {/* --- CHATBOT --- */}
      <Chatbot apiKey={apiKey} contextData={{ activeTab, campaign: activeCampaign, externalMessage: chatMessageQueue }} setShowSettings={setShowSettings} />
    </div>
  );
}
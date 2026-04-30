import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Target, Briefcase, ImageIcon, Video, Globe, 
  Rocket, CheckCircle2, Lightbulb, Crosshair, PenTool, RefreshCcw, 
  Users, MessageCircle, X, Send, Bot, PlusCircle, LayoutDashboard, 
  CheckSquare, LineChart, ChevronRight, Calculator, ShoppingCart, Store, Trash2,
  KeyRound, ShieldCheck, AlertTriangle
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
  { id: 'static', title: 'Gambar Statis', desc: 'Foto produk/desain', icon: <ImageIcon className="w-6 h-6" /> },
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
    model: "llama-3.3-70b-versatile", // Model unggulan Llama 3 dari Groq
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
          Masukkan Kunci API Groq Anda. Kunci ini <strong className="text-slate-700">100% aman</strong> dan hanya disimpan di browser perangkat Anda ini, tidak dikirim ke server manapun selain langsung ke Groq.
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
    setStep(6); 
    
    // UPDATE SUPER PROMPT 2026: Paksa Broad Audience & 5 Angles Default
    const systemPrompt = `Anda adalah Top 1% Media Buyer Meta Ads expert Indonesia tahun 2026. Berdasarkan input user, buat blueprint JSON valid persis seperti skema ini (Jangan tambahkan teks lain selain JSON!).

    ATURAN BEST PRACTICE 2026:
    1. Targeting: Tekankan penggunaan Advantage+ Audience (Broad Targeting). Biarkan algoritma Meta yang mencari pembeli.
    2. Creative: "Creative is the new targeting". Anda WAJIB membuat 5 (LIMA) matriks kreatif dengan angle hook yang BERBEDA-BEDA (Contoh: Emosional, Logis, FOMO/Urgency, Edukasi, Testimoni).
    3. Campaign: Jika goal adalah Penjualan, sarankan Advantage+ Shopping Campaign (ASC+).

    Format JSON:
    {
      "campaignName": "Nama Kampanye", 
      "objective": "Objektif spesifik sesuai Goal", 
      "budgetStrategy": "Saran detail Budgeting & CBO/ABO", 
      "targeting": "Rekomendasi Advantage+ Audience / Broad Targeting",
      "creativeMatrix": [
        // WAJIB ADA 5 OBJECT DI DALAM ARRAY INI
        {
          "angleName": "Nama Angle (Maks 3 kata, misal: 'FOMO Diskon')", 
          "primaryText": "Caption copywriting yang mematikan", 
          "headline": "Judul (Pendek & Clicky)", 
          "description": "Deskripsi singkat", 
          "callToAction": "Tombol CTA", 
          "format": "Format Aset (Video/Gambar Statis)"
        }
      ],
      "proTip": "1 kalimat super tip rahasia Meta Ads 2026"
    }`;

    const userQuery = `Produk: ${formData.product}\nAudiens: ${formData.audience}\nTujuan: ${GOALS.find(g=>g.id===formData.goal)?.title}\nAnggaran: Rp ${formData.budget}\nAset: ${formData.assets.join(', ')}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ];

    try {
      const resultText = await callGroqAPI(messages, apiKey, true);
      const parsedBlueprint = parseAIResponse(resultText);
      
      // UPDATE: Checklist Ekstrim Anti-Boncos 2026
      const newCampaign = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('id-ID'),
        formData: { ...formData },
        blueprint: parsedBlueprint,
        checklist: [
          { id: 1, text: 'Setup Meta Pixel & Conversions API (CAPI) di website', done: false },
          { id: 2, text: 'Siapkan 5 variasi kreatif (Angle berbeda) untuk Testing', done: false },
          { id: 3, text: 'Gunakan Advantage+ Audience (Broad Targeting)', done: false },
          { id: 4, text: 'Publish kampanye dan tunggu approval Meta', done: false },
          { id: 5, text: 'FASE PEMBELAJARAN: DILARANG KERAS mengubah budget/iklan selama 72 JAM PERTAMA atau sebelum mencapai 50 konversi', done: false },
        ],
        analyses: []
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
      addChatMessage(`Blueprint "${parsedBlueprint.campaignName}" dengan 5 Angle Kreatif telah siap! Ingat: Kunci sukses 2026 adalah variasi kreatif dan kesabaran di Learning Phase.`);
      
      setTimeout(() => { setActiveTab('dashboard'); }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyusun Blueprint. Silakan coba lagi.');
      setStep(5);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-in fade-in">
      {step > 0 && step < 6 && <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-8"><div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}/></div>}

      {step === 0 && (
        <div className="text-center mt-12">
          <div className="bg-blue-100 text-blue-700 p-5 rounded-full inline-block mb-6"><Target className="w-12 h-12" /></div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Setup Iklan. <br/>Winning Ads.</h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed">Sistem manajemen Meta Ads standar 2026 ditenagai Groq AI. Hasilkan 5 variasi hook iklan dalam hitungan detik.</p>
          <button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-full text-lg shadow-lg flex items-center gap-2 mx-auto">Mulai Setup Baru <ArrowRight className="w-5 h-5" /></button>
          {!apiKey && <p className="text-sm text-amber-600 mt-4 font-medium flex items-center justify-center gap-1"><AlertTriangle className="w-4 h-4"/> Anda akan diminta memasukkan API Key saat memulai.</p>}
        </div>
      )}

      {step === 1 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-2">Apa yang Anda jual?</h2>
          <textarea className="w-full bg-white border border-slate-300 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-blue-500 outline-none mt-4 min-h-[150px]" placeholder="Sebutkan fitur, benefit utama, dan penawaran (contoh: Diskon 50%)..." value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} />
          <p className="text-sm text-slate-500 mt-3 flex items-start gap-2 bg-slate-100 p-3 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> Semakin detail Anda mendeskripsikan "Unfair Advantage" produk Anda, semakin tajam AI meracik copywriting.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500 hover:text-slate-800"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={formData.product.length < 5} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-2">Siapa audiens Anda?</h2>
          <textarea className="w-full bg-white border border-slate-300 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-blue-500 outline-none mt-4 min-h-[150px]" placeholder="Contoh: Ibu rumah tangga usia 25-40 tahun yang suka berbelanja online..." value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} />
          <p className="text-sm text-slate-500 mt-3 flex items-start gap-2 bg-slate-100 p-3 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> <b>Tips 2026:</b> Jangan memikirkan targeting yang terlalu sempit. Cukup tuliskan siapa "ideal buyer" Anda, dan biarkan AI Meta (Advantage+) mencarikannya.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500 hover:text-slate-800"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={formData.audience.length < 5} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-6">Tujuan Iklan?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOALS.map(g => (
              <div key={g.id} onClick={() => setFormData({...formData, goal: g.id})} className={`cursor-pointer p-5 rounded-2xl border-2 flex flex-col gap-3 transition-all ${formData.goal===g.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className={`p-3 rounded-full w-fit ${formData.goal===g.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{g.icon}</div>
                <div><h3 className="font-bold text-lg">{g.title}</h3><p className="text-sm text-slate-500">{g.desc}</p></div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2"><Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> Pilih "Penjualan" jika Anda memiliki website/Landing Page. Meta memprioritaskan audiens pembeli di objektif ini.</p>
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
          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2 bg-slate-100 p-3 rounded-lg"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> Fase testing awal minimal butuh Rp50.000 - Rp100.000 per hari untuk mendapatkan data metrik (CTR/CPC) yang valid dari Meta.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={handleNext} disabled={!formData.budget || Number(formData.budget)<15000} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full flex gap-2">Lanjut <ArrowRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-3xl font-bold mb-6">Aset Kreatif?</h2>
          {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border border-red-200">{errorMsg}</div>}
          <div className="grid grid-cols-1 gap-4">
            {ASSETS.map(a => (
              <div key={a.id} onClick={() => toggleAsset(a.id)} className={`cursor-pointer p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${formData.assets.includes(a.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="flex items-center gap-4"><div className={`p-3 rounded-full ${formData.assets.includes(a.id)?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{a.icon}</div><div><h3 className="font-bold">{a.title}</h3><p className="text-sm text-slate-500">{a.desc}</p></div></div>
                {formData.assets.includes(a.id) && <CheckCircle2 className="text-blue-600 w-6 h-6" />}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4 flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100"><Lightbulb className="w-5 h-5 text-amber-500 shrink-0" /> AI akan men-generate <b>5 Variasi Angle/Ide Iklan</b> secara otomatis di tahap selanjutnya berdasarkan format yang Anda pilih.</p>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} className="p-4 text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={generateBlueprint} disabled={formData.assets.length === 0} className="bg-slate-900 hover:bg-black text-white font-bold py-3 px-8 rounded-full flex gap-2 disabled:opacity-50">Generate Blueprint <Rocket className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95">
          <div className="relative w-20 h-20 mb-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-2xl font-bold mb-2">Groq sedang berpikir...</h2><p className="text-slate-500">Menganalisis audiens, meracik strategi Advantage+, dan menulis 5 Angle iklan...</p>
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
          <p className="text-slate-500 mt-2">Data tersimpan di perangkat Anda (LocalStorage).</p>
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
          {campaigns.map(camp => (
            <div key={camp.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => openCampaign(camp)}>
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Target className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{camp.blueprint?.campaignName || 'Kampanye Baru'}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">{camp.date}</span>
                    <span className="uppercase text-xs font-bold text-slate-400">{camp.formData.goal}</span>
                    <span className="text-xs font-medium">{formatRupiah(camp.formData.budget)}/hr</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {camp.analyses && camp.analyses.length > 0 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded border border-green-200">Dioptimasi</span>}
                <button onClick={(e) => { e.stopPropagation(); deleteCampaign(camp.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                <button onClick={() => openCampaign(camp)} className="p-2 text-slate-400 group-hover:text-blue-600 transition-colors"><ChevronRight className="w-5 h-5"/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 3: CAMPAIGN DETAIL (Manajemen + Analisis + Generate Angle)
// ==========================================
function CampaignDetail({ campaign, closeDetail, updateCampaign, apiKey }) {
  const [analysisForm, setAnalysisForm] = useState({ spend: '', results: '', ctr: '', cpc: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAngle, setIsGeneratingAngle] = useState(false);

  if (!campaign) return null;
  const progress = Math.round((campaign.checklist.filter(t => t.done).length / campaign.checklist.length) * 100);

  const handleToggleChecklist = (taskId) => {
    const updatedChecklist = campaign.checklist.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    updateCampaign({ ...campaign, checklist: updatedChecklist });
  };

  const handleAnalyze = async () => {
    if(!apiKey) return alert("API Key belum diatur. Silakan atur di menu.");
    setIsAnalyzing(true);
    const prompt = `Anda adalah analis Data Meta Ads. Evaluasi kampanye ini.
    Konteks: Tujuan ${campaign.formData.goal}, Budget Rp${campaign.formData.budget}.
    Metrik Terkini: Spend: Rp${analysisForm.spend}, Konversi: ${analysisForm.results}, CTR: ${analysisForm.ctr}%, CPC: Rp${analysisForm.cpc}.
    Tugas: Berikan 3 poin evaluasi singkat berdasarkan metrik (1. Status CPA/ROAS, 2. Deteksi Creative Fatigue jika CTR drop, 3. Action plan konkrit: haruskah scale budget, matikan iklan, atau ganti materi). Format teks biasa, padat.`;

    const messages = [
      { role: "system", content: "Anda adalah asisten Meta Ads profesional." },
      { role: "user", content: prompt }
    ];

    try {
      const insight = await callGroqAPI(messages, apiKey, false);
      const newAnalysis = { id: Date.now().toString(), date: new Date().toLocaleDateString('id-ID'), data: { ...analysisForm }, insight };
      const updatedAnalyses = [newAnalysis, ...(campaign.analyses || [])];
      
      updateCampaign({ ...campaign, analyses: updatedAnalyses });
      setAnalysisForm({ spend: '', results: '', ctr: '', cpc: '' }); 
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
    
    // UPDATE: Memaksa Hook Angle yang Agresif
    const prompt = `Anda adalah expert Meta Ads. Buat HANYA SATU angle iklan BARU untuk produk ini yang SANGAT BERBEDA dari angle yang sudah ada. Gunakan pendekatan Hook yang agresif (seperti Outrageous Claim yang masuk akal, Us vs Them, atau Visual Pattern Interrupt).
    Produk: ${campaign.formData.product}
    Audiens: ${campaign.formData.audience}
    Angle yang SUDAH ADA (JANGAN gunakan angle ini lagi): ${existingAngles}

    Kembalikan HANYA format JSON valid persis seperti ini:
    {
      "angleName": "Nama Angle Baru",
      "primaryText": "Caption iklan memikat (maks 3 kalimat)",
      "headline": "Judul click-worthy",
      "description": "Deskripsi singkat / penawaran",
      "callToAction": "Tombol CTA",
      "format": "Gambar Statis / Video Pendek"
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 animate-in slide-in-from-right-4 duration-300">
      <button onClick={closeDetail} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm w-fit">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </button>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-100 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{campaign.blueprint.campaignName}</h1>
            <p className="text-slate-500 flex flex-wrap gap-2">
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">{campaign.blueprint.objective}</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{campaign.date}</span>
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-slate-500 mb-1">Anggaran Harian</p>
            <p className="text-2xl font-bold text-slate-900">{formatRupiah(campaign.formData.budget)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-800"><CheckSquare className="text-blue-600 w-5 h-5"/> Checklist 2026 Anti-Boncos</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
              <div className="flex justify-between text-sm mb-2 font-bold"><span className="text-slate-600">Progres Keamanan Rilis</span><span className="text-blue-600">{progress}%</span></div>
              <div className="w-full bg-slate-200 h-2 rounded-full"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div></div>
            </div>
            <div className="space-y-3">
              {campaign.checklist.map(task => (
                <label key={task.id} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={task.done} onChange={() => handleToggleChecklist(task.id)} className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
                  <span className={`text-sm leading-relaxed ${task.done ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900 font-medium'}`}>{task.text}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-bl-full -z-10 opacity-50"></div>
            <h3 className="flex items-center gap-2 font-bold text-lg mb-2 text-slate-800"><LineChart className="text-purple-600 w-5 h-5"/> Deteksi Performa AI</h3>
            <p className="text-sm text-slate-500 mb-6">Masukkan data hasil iklan terbaru. AI akan mendeteksi apakah Anda perlu scale budget, matikan iklan, atau ganti kreatif.</p>
            
            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 block mb-1">SPEND (Rp)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={analysisForm.spend} onChange={e=>setAnalysisForm({...analysisForm, spend: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-1">HASIL (Jumlah)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={analysisForm.results} onChange={e=>setAnalysisForm({...analysisForm, results: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-1">CTR (%)</label><input type="number" step="0.1" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={analysisForm.ctr} onChange={e=>setAnalysisForm({...analysisForm, ctr: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-1">CPC (Rp)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={analysisForm.cpc} onChange={e=>setAnalysisForm({...analysisForm, cpc: e.target.value})} /></div>
              </div>
              <button onClick={handleAnalyze} disabled={!analysisForm.spend || !analysisForm.results || isAnalyzing} className="w-full bg-purple-600 disabled:bg-slate-300 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2">
                {isAnalyzing ? <span className="animate-pulse">Menganalisis Data...</span> : <><Calculator className="w-4 h-4"/> Dapatkan Rekomendasi</>}
              </button>
            </div>

            {campaign.analyses && campaign.analyses.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-6 relative z-10">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Riwayat Evaluasi AI</h4>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  {campaign.analyses.map(an => (
                     <div key={an.id} className="bg-white border border-purple-100 rounded-xl p-4 shadow-sm relative">
                       <span className="absolute -top-2.5 left-4 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">{an.date}</span>
                       <div className="flex gap-4 mb-3 border-b border-slate-50 pb-3 mt-2">
                         <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Est. CPA</span><span className="font-bold text-slate-800 text-sm">Rp {Math.round(an.data.spend / an.data.results).toLocaleString('id-ID')}</span></div>
                         <div><span className="block text-[10px] font-bold text-slate-400 uppercase">CTR</span><span className="font-bold text-slate-800 text-sm">{an.data.ctr}%</span></div>
                       </div>
                       <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{an.insight}</p>
                     </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 mt-4">
          <h3 className="font-extrabold text-2xl mb-6 flex items-center gap-2 text-slate-900"><Target className="w-6 h-6 text-blue-600"/> Setup Blueprint 2026</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
               <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Strategi Budget (Campaign Level)</h4>
               <p className="text-slate-800 font-medium leading-relaxed">{campaign.blueprint.budgetStrategy}</p>
            </div>
            <div className="bg-purple-50/50 rounded-2xl p-6 border border-purple-100">
               <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Sistem Targeting (Ad Set Level)</h4>
               <p className="text-slate-800 font-medium leading-relaxed">{campaign.blueprint.targeting}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
             <div>
                <h4 className="font-bold text-xl text-slate-800">Bank Kreatif (Ad Level)</h4>
                <p className="text-sm text-slate-500">Test angle ini satu per satu atau sekaligus menggunakan Dynamic Creative Optimization (DCO).</p>
             </div>
             <button 
                onClick={handleGenerateNewAngle} 
                disabled={isGeneratingAngle}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isGeneratingAngle ? <span className="animate-pulse">Memikirkan...</span> : <><Lightbulb className="w-4 h-4" /> Generate Angle Ekstra</>}
              </button>
          </div>

          <div className="grid gap-5">
            {campaign.blueprint.creativeMatrix.map((ad, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-200 transition-colors relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 group-hover:bg-amber-500 transition-colors"></div>
                <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                  <span className="bg-blue-100 group-hover:bg-amber-100 text-blue-800 group-hover:text-amber-800 transition-colors text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider">Angle {idx + 1}: {ad.angleName}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded uppercase tracking-wider ml-auto">{ad.format}</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Teks Utama (Primary Text)</span>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{ad.primaryText}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Judul (Headline)</span>
                      <p className="font-bold text-slate-900">{ad.headline}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Deskripsi & CTA</span>
                        {ad.description && <p className="text-slate-600 text-sm mb-2">{ad.description}</p>}
                      </div>
                      <div className="mt-2 inline-block bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg w-fit">Tombol: {ad.callToAction}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg text-white mt-8 flex items-start gap-4">
            <Lightbulb className="w-6 h-6 text-yellow-400 shrink-0" />
            <div><h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wider text-slate-400">Winning Tip 2026</h4><p className="text-slate-200 leading-relaxed">{campaign.blueprint.proTip}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 4: CHATBOT (Floating Assistant)
// ==========================================
function Chatbot({ apiKey, contextData, setShowSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Halo! Ada pertanyaan tentang Meta Ads atau butuh bantuan optimasi kampanye Anda?' }]);
  const endRef = useRef(null);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  useEffect(() => {
    if (contextData?.externalMessage) {
      setMessages(prev => [...prev, { role: 'assistant', content: contextData.externalMessage }]);
      setIsOpen(true);
    }
  }, [contextData?.externalMessage]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const newMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]); 
    setInput(''); 
    setIsTyping(true);

    let sysContext = `Anda adalah expert Meta Ads tahun 2026. Jawab ringkas, modern, dan selalu sarankan best practice terbaru (Broad Targeting, Advantage+, Creative Testing).`;
    if (contextData?.activeTab === 'campaignDetail' && contextData?.campaign) {
       sysContext += `Konteks: User sedang melihat kampanye "${contextData.campaign.blueprint.campaignName}".`;
    }

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
        <div className="bg-white w-[360px] max-w-[calc(100vw-32px)] h-[500px] max-h-[70vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-2"><Bot className="w-6 h-6" /><h3 className="font-bold text-sm">Ads Assistant</h3></div>
            <button onClick={() => setIsOpen(false)} className="text-blue-100 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
                <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && <div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span></div></div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input type="text" value={input} onChange={e=>setInput(e.target.value)} placeholder="Tanya tentang Meta Ads..." className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            <button type="submit" disabled={!input.trim() || isTyping} className="bg-blue-600 disabled:bg-slate-300 text-white rounded-full p-2.5 hover:bg-blue-700 transition-colors"><Send className="w-4 h-4 ml-0.5" /></button>
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
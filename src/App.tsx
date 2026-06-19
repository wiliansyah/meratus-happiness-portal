// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Calendar, MapPin, DollarSign, Activity, CheckCircle, XCircle,
  Upload, PieChart, HeartPulse, CheckSquare, Plus, ArrowRight,
  Lock, User, FileCheck, Eye, LogOut, Star, Database, FileText,
  AlertCircle, BarChart3, Paperclip, MessageSquare, Target, Trash2, 
  Search, Filter, TrendingUp, Users, Settings, UserPlus, Download,
  BellRing, CalendarDays, Edit3, Save, Layers, ListFilter, Clock, Loader2,
  Map
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Tailwind CSS Injection
if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// pdf-lib Injection untuk merging PDF & Gambar Laporan Secara Native
if (typeof window !== 'undefined' && !document.getElementById('pdflib-cdn')) {
  const script = document.createElement('script');
  script.id = 'pdflib-cdn';
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  document.head.appendChild(script);
}

// --- FIREBASE CONFIGURATION ---
const fallbackConfig = {
  apiKey: 'AIzaSyAgZUtc5aZguYz_MW5zISkuLvDgPmDixfg',
  authDomain: 'meratus-frd-lms-10276.firebaseapp.com',
  projectId: 'meratus-frd-lms-10276',
};

let firebaseConfig = fallbackConfig;
try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
  }
} catch (e) {
  console.error("Error parsing __firebase_config, using fallback.", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rawAppId = typeof __app_id !== 'undefined' ? String(__app_id) : 'meratus-happiness-v2';
const appId = rawAppId.split('/')[0];

// --- CONSTANTS & INITIAL SEED DATA ---
const ROLES = { PIC: 'pic_olahraga', ADMIN: 'admin_approver' };
const AREA_HO = 'HO';

const INITIAL_BRANCHES = [
  { id: 'br1', name: 'Cabang Jakarta' },
  { id: 'br2', name: 'Cabang Makassar' }
];

const INITIAL_ACCOUNTS = [
  { id: 'admin', username: 'admin', password: '123', role: ROLES.ADMIN, name: 'Admin Pusat', division: 'Pusat', area: AREA_HO },
  { id: 'a2', username: 'meliza', password: '123', role: ROLES.PIC, name: 'Meliza Latuputty', division: 'Liner Commercial', sport: 'Badminton', area: AREA_HO },
  { id: 'a3', username: 'pambudi', password: '123', role: ROLES.PIC, name: 'Pambudi Laksono', division: 'Liner Commercial', sport: 'Futsal', area: AREA_HO },
  { id: 'a4', username: 'intan', password: '123', role: ROLES.PIC, name: 'Intan Rekyan', division: 'Doc & Invoice', sport: 'Basket', area: AREA_HO },
  { id: 'a5', username: 'yugo', password: '123', role: ROLES.PIC, name: 'Yugo Adi Prawira', division: 'Asset & Charter', sport: 'Yoga, Zumba, Poundfit', area: AREA_HO },
  { id: 'a6', username: 'jkt_pic', password: '123', role: ROLES.PIC, name: 'Ahmad Jakarta', division: 'Ops JKT', sport: 'Mini Soccer', area: 'Cabang Jakarta' },
];

const INITIAL_PROGRAMS = [
  { id: 'p1', sport: 'Badminton', day: 'Senin', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 480000, adminFee: 6500, area: AREA_HO },
  { id: 'p2', sport: 'Futsal', day: 'Selasa', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 300000, adminFee: 6500, area: AREA_HO },
  { id: 'p3', sport: 'Basket', day: 'Selasa', freqText: '2 Kali Sebulan', freqNum: 2, costPerSession: 706000, adminFee: 12500, area: AREA_HO },
  { id: 'p4', sport: 'Yoga, Zumba, Poundfit', day: 'Jumat', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 500000, adminFee: 6500, area: AREA_HO },
  { id: 'p5', sport: 'Mini Soccer', day: 'Kamis', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 600000, adminFee: 6500, area: 'Cabang Jakarta' }
];

const INITIAL_EVENTS = [];

// --- HELPER LOGIC ---
const getActiveProgramRules = (prog, yyyy_mm) => {
  if (prog && prog.budget_history && prog.budget_history.length > 0) {
    const sortedHist = [...prog.budget_history].sort((a, b) => b.effective_month.localeCompare(a.effective_month));
    const activeHist = sortedHist.find(h => h.effective_month <= yyyy_mm);
    if (activeHist) return activeHist;
  }
  return prog || {};
};

const getProgramLimitForMonth = (prog, yyyy_mm) => {
  if (!prog) return 0;
  const activeRules = getActiveProgramRules(prog, yyyy_mm);
  if (activeRules.limit !== undefined) return activeRules.limit;
  return (Number(activeRules.costPerSession || 0) + Number(activeRules.adminFee || 0)) * Number(activeRules.freqNum || 0);
};

const getTotalPlafonForPeriod = (prog, filterType, filterValue, filterYear) => {
  let monthsToSum = [];
  if (filterType === 'month' && filterValue !== 'ALL') {
    monthsToSum.push(`${filterYear}-${filterValue}`);
  } else if (filterType === 'quarter' && filterValue !== 'ALL') {
    const q = parseInt(filterValue.replace('Q', ''));
    monthsToSum = [1, 2, 3].map(m => `${filterYear}-${String((q - 1) * 3 + m).padStart(2, '0')}`);
  } else if (filterType === 'semester' && filterValue !== 'ALL') {
    const s = parseInt(filterValue.replace('S', ''));
    monthsToSum = [1, 2, 3, 4, 5, 6].map(m => `${filterYear}-${String((s - 1) * 6 + m).padStart(2, '0')}`);
  } else {
    monthsToSum = Array.from({ length: 12 }, (_, i) => `${filterYear}-${String(i + 1).padStart(2, '0')}`);
  }
  return monthsToSum.reduce((sum, ym) => sum + getProgramLimitForMonth(prog, ym), 0);
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0);
const calculateTotalBudget = (items) => Array.isArray(items) ? items.reduce((sum, item) => sum + Number(item?.qty || 0) * Number(item?.price || 0), 0) : 0;

const getStatusDisplay = (status) => {
  const map = {
    pending_approval: { label: 'Menunggu Approval', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', step: 1 },
    funded: { label: 'Siap Jalan (Lapor!)', color: 'bg-blue-100 text-blue-800 border-blue-200', step: 2 },
    pending_settlement: { label: 'Validasi Laporan', color: 'bg-purple-100 text-purple-800 border-purple-200', step: 3 },
    completed: { label: 'Selesai & Diarsipkan', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', step: 4 },
    rejected: { label: 'Ditolak / Revisi', color: 'bg-red-100 text-red-800 border-red-200', step: 0 },
  };
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-800', step: 0 };
};

const base64ToBlob = (base64Data, contentType) => {
  contentType = contentType || '';
  const sliceSize = 1024;
  const byteCharacters = atob(base64Data);
  const bytesLength = byteCharacters.length;
  const slicesCount = Math.ceil(bytesLength / sliceSize);
  const byteArrays = new Array(slicesCount);

  for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    const begin = sliceIndex * sliceSize;
    const end = Math.min(begin + sliceSize, bytesLength);

    const bytes = new Array(end - begin);
    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset].charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
};

// --- REUSABLE COMPONENTS ---

const FilePreviewModal = ({ fileObj, onClose }) => {
  if (!fileObj) return null;
  
  const isLegacyString = typeof fileObj === 'string';
  const fileName = isLegacyString ? fileObj : (fileObj.name || 'document');
  const ext = fileName.split('.').pop().toLowerCase();
  
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || (!isLegacyString && fileObj.type?.startsWith('image/'));
  const isPdf = ['pdf'].includes(ext) || (!isLegacyString && fileObj.type === 'application/pdf');
  const fileData = isLegacyString ? null : fileObj.data;

  const handleDownload = async () => {
    if (!isLegacyString && fileData) {
      try {
        const parts = fileData.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].split(':')[1];
          const base64Data = parts[1];
          const blob = base64ToBlob(base64Data, contentType);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const link = document.createElement('a');
          link.href = fileData;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (e) {
        console.error("Gagal memproses unduhan", e);
      }
    } else {
      const content = `--- MERATUS HAPPINESS DOCUMENT ---\nNama Dokumen: ${fileName}\n\n(Dokumen simulasi di-generate sistem karena data adalah mock/legacy.)`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4 md:p-10 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-full max-h-[85vh] flex flex-col overflow-hidden transform transition-all scale-in-95">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <h3 className="font-bold text-slate-800 flex items-center"><Paperclip className="w-5 h-5 mr-2 text-blue-600"/> Pratinjau Dokumen: <span className="ml-1 text-blue-800">{fileName}</span></h3>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="flex-grow bg-slate-200 flex justify-center items-center p-6 overflow-hidden relative">
          {isImage ? (
            <img src={fileData || `https://placehold.co/800x600/e2e8f0/475569?text=Preview+Foto+${encodeURIComponent(fileName)}`} alt="preview" className="max-w-full max-h-full rounded-xl shadow-md object-contain" />
          ) : isPdf ? (
            fileData ? (
              <iframe src={fileData} className="w-full h-full rounded-xl shadow-md border-0 bg-white" title="PDF Preview"></iframe>
            ) : (
              <div className="bg-white p-12 rounded-3xl shadow-lg flex flex-col items-center max-w-md w-full text-center border border-slate-100">
                <div className="bg-red-50 p-6 rounded-full mb-6"><FileText className="w-20 h-20 text-red-500"/></div>
                <p className="text-xl font-black text-slate-800 mb-2">Pratinjau Dokumen PDF</p>
                <p className="text-slate-500 font-medium text-sm border-t pt-4 w-full truncate px-4">{fileName}</p>
                <p className="text-xs text-orange-500 mt-2 font-bold">(Pratinjau PDF mock data tidak tersedia, silakan unduh file simulasinya)</p>
              </div>
            )
          ) : (
            <div className="bg-white p-12 rounded-3xl shadow-lg flex flex-col items-center max-w-md w-full text-center border border-slate-100">
              <div className="bg-blue-50 p-6 rounded-full mb-6"><FileText className="w-20 h-20 text-blue-500"/></div>
              <p className="text-xl font-black text-slate-800 mb-2">Pratinjau Dokumen {ext.toUpperCase()}</p>
              <p className="text-slate-500 font-medium text-sm border-t pt-4 w-full truncate px-4">{fileName}</p>
              {!fileData && <p className="text-xs text-orange-500 mt-2 font-bold">(Pratinjau mock data tidak tersedia)</p>}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Tutup</button>
          <button onClick={handleDownload} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md flex items-center transition-colors">
            <Download className="w-4 h-4 mr-2"/> Unduh File Asli
          </button>
        </div>
      </div>
    </div>
  );
};

const EventDetailModal = ({ event, onClose, ctx }) => {
  if (!event) return null;
  const pic = ctx.accounts.find((a) => a.id === event.pic_id);
  const isPIC = ctx.user.role === ROLES.PIC;
  
  // Hide Admin fee from PIC view completely
  const displayBudgetItems = isPIC 
    ? event.budget_items?.filter((it) => !it.desc.toLowerCase().includes('admin'))
    : event.budget_items;

  const actualTotal = event.report?.actual_cost || calculateTotalBudget(event.budget_items);
  // Total proposed yang diperlihatkan ke user bergantung dari roles
  const displayProposedTotal = calculateTotalBudget(displayBudgetItems);
  
  const statusInfo = getStatusDisplay(event.status);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all custom-scrollbar">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-10 rounded-t-3xl">
          <div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide border mb-2 inline-block ${statusInfo.color}`}>{statusInfo.label}</span>
            <h2 className="text-2xl font-black text-slate-800">{event.sport_type}</h2>
            <p className="text-sm font-bold text-slate-500 mt-1 flex items-center"><Map className="w-4 h-4 mr-1 text-slate-400"/> Area: {pic?.area || AREA_HO}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PIC</p><p className="font-bold text-slate-800">{pic?.name}</p></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal</p><p className="font-bold text-slate-800">{new Date(event.event_date).toLocaleDateString('id-ID')}</p></div>
            <div className="col-span-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue</p>
                <p className="font-bold text-slate-800">{event.venue_name}</p>
              </div>
              <div className="bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200">
                 <p className="text-[10px] font-black text-blue-600 uppercase">Peserta Terdaftar</p>
                 <p className="font-black text-blue-900 text-right">{event.report?.attended || event.participants?.length || 0} Orang</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-emerald-600"/> Rincian Anggaran</h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr className="border-b border-slate-200"><th className="p-4 font-bold text-slate-600">Item</th><th className="p-4 font-bold text-slate-600">Qty</th><th className="p-4 font-bold text-slate-600">Harga Satuan</th><th className="p-4 font-bold text-slate-600 text-right">Total</th></tr></thead>
                <tbody>
                  {displayBudgetItems?.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0"><td className="p-4">{it.desc}</td><td className="p-4">{it.qty} {it.unit}</td><td className="p-4">{formatCurrency(it.price)}</td><td className="p-4 font-semibold text-right">{formatCurrency(it.price * it.qty)}</td></tr>
                  ))}
                  <tr className="bg-blue-50/50"><td colSpan="3" className="p-4 text-right font-bold text-slate-700">Total Pengajuan:</td><td className="p-4 font-black text-blue-900 text-right text-lg">{formatCurrency(displayProposedTotal)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {event.report && (
            <div className="border-t-2 pt-8 border-dashed border-slate-200">
              <h3 className="font-bold text-slate-800 mb-5 flex items-center"><FileCheck className="w-6 h-6 mr-2 text-purple-600"/> Laporan Realisasi Akhir</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className={`p-6 rounded-2xl border-2 ${actualTotal > displayProposedTotal ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Realisasi System</p>
                    <p className="text-3xl font-black text-slate-800">{formatCurrency(isPIC ? (event.report?.vendor_cost || actualTotal) : actualTotal)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Kehadiran Aktual</p>
                      <p className="text-2xl font-black text-slate-800">{event.report.attended || 0} <span className="text-sm font-medium text-slate-500">Peserta</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Rating Venue</p>
                      <div className="flex text-orange-400 justify-end">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-5 h-5 ${i < event.report.rating ? 'fill-current' : 'text-slate-200'}`} />)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Catatan Pelaksanaan</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{event.report.notes}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 h-full">
                    <p className="text-xs font-bold text-blue-900 uppercase mb-4 tracking-wider">Lampiran Dokumen</p>
                    <ul className="space-y-2 text-sm text-blue-700 font-medium">
                      {['nota', 'absensi', 'foto'].map(fileKey => {
                        const fileData = event.report.files?.[fileKey];
                        if (!fileData) return null;
                        
                        // Handle multiple files gracefully (Array normalization)
                        const fileArray = Array.isArray(fileData) ? fileData : [fileData];
                        
                        return fileArray.map((fileObj, index) => {
                          const displayLabel = typeof fileObj === 'string' ? fileObj : fileObj.name;
                          return (
                            <li key={`${fileKey}-${index}`} className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                              <span className="flex items-center truncate mr-3">
                                <Paperclip className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0"/> 
                                <span className="truncate text-xs font-bold">{fileKey.toUpperCase()} - {displayLabel}</span>
                              </span>
                              <button onClick={() => ctx.openPreview(fileObj)} className="flex items-center text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm">
                                <Eye className="w-3 h-3 mr-1"/> Lihat
                              </button>
                            </li>
                          );
                        });
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {event.admin_notes && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-2xl border border-yellow-200 flex items-start shadow-sm">
              <MessageSquare className="w-6 h-6 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <p className="text-xs font-extrabold text-yellow-800 uppercase mb-1 tracking-wider">Catatan Admin</p>
                <p className="text-sm text-yellow-900 leading-relaxed font-medium">{event.admin_notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- VIEWS COMPONENTS ---

const LoginScreen = ({ ctx }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const account = ctx.accounts.find((a) => a.username === username && a.password === password);
    if (account) { 
      ctx.setUser(account); 
      ctx.setView('dashboard'); 
      ctx.showToast(`Selamat datang, ${account.name}!`, 'success');
    } else { 
      ctx.showToast('Kredensial tidak valid. Silakan periksa kembali.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 relative z-10">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="flex justify-center mb-8">
          <div className="bg-red-50 p-5 rounded-full shadow-inner border border-red-100">
            <HeartPulse className="text-red-600 w-12 h-12" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-center text-slate-800 mb-2 tracking-tight">Meratus Happiness</h1>
        <p className="text-center text-slate-500 mb-8 font-medium">Sistem Manajemen & Pelaporan Kegiatan</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-600 outline-none transition-colors font-semibold" placeholder="contoh: admin / meliza" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-600 outline-none transition-colors font-semibold" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white font-black py-4 rounded-xl mt-8 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center">
            Masuk Sistem <ArrowRight className="ml-2 w-5 h-5"/>
          </button>
        </form>
      </div>
    </div>
  );
};

// 1. Dashboard
const ViewDashboard = ({ ctx }) => {
  const isPIC = ctx.user.role === ROLES.PIC;
  
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState('month'); 
  const [filterValue, setFilterValue] = useState(String(new Date().getMonth() + 1).padStart(2, '0')); 
  const [filterPic, setFilterPic] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  const years = ['2025', '2026', '2027'];
  const monthOptions = Array.from({length: 12}, (_, i) => ({ val: String(i+1).padStart(2,'0'), label: new Date(2000, i, 1).toLocaleDateString('id-ID', {month: 'long'}) }));
  const quarterOptions = [{val: 'Q1', label: 'Q1 (Jan-Mar)'}, {val: 'Q2', label: 'Q2 (Apr-Jun)'}, {val: 'Q3', label: 'Q3 (Jul-Sep)'}, {val: 'Q4', label: 'Q4 (Okt-Des)'}];
  const semesterOptions = [{val: 'S1', label: 'Semester 1 (Jan-Jun)'}, {val: 'S2', label: 'Semester 2 (Jul-Des)'}];

  useEffect(() => {
    if (filterType === 'month') setFilterValue(String(new Date().getMonth() + 1).padStart(2, '0'));
    else if (filterType === 'quarter') setFilterValue('Q1');
    else if (filterType === 'semester') setFilterValue('S1');
    else setFilterValue('ALL');
  }, [filterType]);

  const roleFilteredEvents = ctx.events.filter((e) => {
    if (isPIC) return e.pic_id === ctx.user.id;
    // For Admin:
    if (filterArea !== 'all') {
      const pic = ctx.accounts.find(a => a.id === e.pic_id);
      if (pic?.area !== filterArea) return false;
    }
    if (filterPic !== 'all' && e.pic_id !== filterPic) return false;
    return true;
  });
  
  const currentPeriodEvents = roleFilteredEvents.filter((e) => {
    const d = new Date(e.event_date);
    const y = d.getFullYear().toString();
    const m = d.getMonth() + 1;
    
    if (y !== filterYear) return false;
    
    if (filterType === 'month' && filterValue !== 'ALL') {
      if (String(m).padStart(2, '0') !== filterValue) return false;
    }
    if (filterType === 'quarter' && filterValue !== 'ALL') {
      const q = Math.ceil(m / 3);
      if (`Q${q}` !== filterValue) return false;
    }
    if (filterType === 'semester' && filterValue !== 'ALL') {
      const s = m <= 6 ? 'S1' : 'S2';
      if (s !== filterValue) return false;
    }
    return true;
  });

  const programsToMonitor = isPIC 
    ? ctx.programs.filter((p) => p.sport.includes(ctx.user.sport) && p.area === ctx.user.area) 
    : ctx.programs.filter((p) => {
        if (filterArea !== 'all' && p.area !== filterArea) return false;
        if (filterPic !== 'all') {
           const selectedPic = ctx.accounts.find(a => a.id === filterPic);
           return p.sport === selectedPic?.sport && p.area === selectedPic?.area;
        }
        return true;
      });
  
  const totalCompletedEvents = currentPeriodEvents.filter((e) => e.status === 'completed').length;
  
  const totalBudgetSpent = currentPeriodEvents.filter((e) => e.status === 'completed')
    .reduce((acc, curr) => acc + (curr.report?.actual_cost || calculateTotalBudget(curr.budget_items)), 0);
  
  // Plafon dihitung secara dinamis via budget_history per bulannya
  const totalAllocated = programsToMonitor.reduce((acc, p) => acc + getTotalPlafonForPeriod(p, filterType, filterValue, filterYear), 0);

  const generateChartData = () => {
    let periods = [];
    if (filterType === 'month') periods = monthOptions.map(m => ({ label: m.label.substring(0,3), check: (evMonth) => evMonth === parseInt(m.val) }));
    else if (filterType === 'quarter') periods = quarterOptions.map(q => ({ label: q.val, check: (evMonth) => `Q${Math.ceil(evMonth/3)}` === q.val }));
    else if (filterType === 'semester') periods = semesterOptions.map(s => ({ label: s.val, check: (evMonth) => (evMonth <= 6 ? 'S1' : 'S2') === s.val }));
    else periods = [{ label: filterYear, check: () => true }];

    return periods.map(p => {
      const evtsInYear = roleFilteredEvents.filter((e) => {
        const d = new Date(e.event_date);
        return d.getFullYear().toString() === filterYear && 
               p.check(d.getMonth()+1) && 
               e.status === 'completed'; 
      });
      
      const totalEvts = evtsInYear.length;
      const totalPax = evtsInYear.reduce((sum, e) => sum + (e.report?.attended || e.participants?.length || 0), 0);
      const budgetSpent = evtsInYear.reduce((sum, e) => sum + (e.report?.actual_cost || calculateTotalBudget(e.budget_items)), 0);
      return { periodLabel: p.label, events: totalEvts, participants: totalPax, budgetSpent };
    });
  };

  const chartData = generateChartData();
  const maxEvents = Math.max(...chartData.map(d => d.events), 5);
  const maxPax = Math.max(...chartData.map(d => d.participants), 50);
  const maxBudget = Math.max(...chartData.map(d => d.budgetSpent), 1000000); 

  const ratedEvents = currentPeriodEvents.filter((e) => e.status === 'completed' && e.report && e.report.rating);
  const avgRating = ratedEvents.length > 0 ? (ratedEvents.reduce((acc, e) => acc + e.report.rating, 0) / ratedEvents.length).toFixed(1) : 0;

  const myProgram = isPIC ? programsToMonitor[0] : null;

  const periodName = filterType === 'month' && filterValue !== 'ALL' ? monthOptions.find(m=>m.val === filterValue)?.label :
                     filterType === 'quarter' && filterValue !== 'ALL' ? filterValue :
                     filterType === 'semester' && filterValue !== 'ALL' ? filterValue : `Tahun ${filterYear}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* SMART REMINDER BANNER FOR PIC */}
      {isPIC && myProgram && (
        <div className="bg-blue-700 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-8 -translate-y-8 pointer-events-none"><BellRing className="w-48 h-48" /></div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl mb-2 flex items-center text-white"><BellRing className="mr-3 w-6 h-6 animate-bounce text-yellow-300"/> Pengingat Jadwal Anda</h3>
            <p className="text-blue-100 font-medium">Jadwal kegiatan <b>{myProgram.sport} ({ctx.user.area})</b> adalah setiap hari <b>{myProgram.day}</b> ({myProgram.freqText}).</p>
            <p className="text-sm mt-2 text-yellow-300 font-bold">Periode ini tercatat {currentPeriodEvents.length} kegiatan masuk.</p>
          </div>
          <button onClick={() => ctx.setView('reporting')} className="bg-white text-indigo-700 hover:bg-blue-50 font-black px-6 py-3 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all relative z-10 flex-shrink-0 flex items-center">
            Buat Laporan Baru <ArrowRight className="ml-2 w-4 h-4"/>
          </button>
        </div>
      )}
// ... existing code ...
      {/* MASTER CALENDAR BANNER FOR ADMIN */}
      {!isPIC && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden mt-6">
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-4 translate-y-4"><CalendarDays className="w-48 h-48" /></div>
          <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center relative z-10">
            <CalendarDays className="w-5 h-5 mr-2 text-indigo-600" /> Kalender & Jadwal Program Rutin
            {filterArea !== 'all' ? ` (${filterArea})` : ''}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative z-10">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Random'].map(day => {
              const progsToday = programsToMonitor.filter(p => p.day === day);
              return (
                <div key={day} className={`p-4 rounded-2xl border-2 ${progsToday.length > 0 ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{day}</p>
                  {progsToday.length > 0 ? (
                    <div className="space-y-2">
                      {progsToday.map(p => (
                        <div key={p.id} className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-indigo-50 truncate flex flex-col">
                          <span className="flex items-center"><Activity className="w-3 h-3 mr-1.5 opacity-50 flex-shrink-0"/> <span className="truncate">{p.sport}</span></span>
                          {filterArea === 'all' && <span className="text-[9px] text-slate-400 font-medium ml-4 mt-0.5 truncate">{p.area || AREA_HO}</span>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs font-medium text-slate-400">-</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
// ... existing code ...
      {/* FILTER ANALISIS TERPADU */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 relative z-20 mt-8">
        <div className="flex items-center text-blue-900 font-black whitespace-nowrap bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
          <ListFilter className="w-5 h-5 mr-2"/> Filter Dashboard:
        </div>
        
        <div className="flex flex-wrap flex-grow w-full gap-3">
          <select className="flex-1 min-w-[100px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
          <select className="flex-1 min-w-[120px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="month">Per Bulan</option>
            <option value="quarter">Per Kuartal (Q)</option>
            <option value="semester">Per Semester (S)</option>
            <option value="year">Satu Tahun Penuh</option>
          </select>
          {filterType !== 'year' && (
            <select className="flex-1 min-w-[140px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={filterValue} onChange={e => setFilterValue(e.target.value)}>
              <option value="ALL">-- Semua Periode --</option>
              {filterType === 'month' && monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              {filterType === 'quarter' && quarterOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              {filterType === 'semester' && semesterOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          )}
          {!isPIC && (
            <>
              <select className="flex-1 min-w-[140px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={filterArea} onChange={e => {setFilterArea(e.target.value); setFilterPic('all');}}>
                <option value="all">Semua Area</option>
                <option value={AREA_HO}>{AREA_HO}</option>
                {ctx.branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              <select className="flex-1 min-w-[140px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={filterPic} onChange={e => setFilterPic(e.target.value)}>
                <option value="all">Semua Program / PIC</option>
                {ctx.accounts.filter(a => a.role === ROLES.PIC && (filterArea === 'all' || a.area === filterArea)).map(pic => <option key={pic.id} value={pic.id}>{pic.sport} ({pic.name})</option>)}
              </select>
            </>
          )}
        </div>
      </div>
      
      {/* TOP CARDS */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${!isPIC ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 bg-blue-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Kegiatan Selesai ({periodName})</p>
          <p className="text-4xl font-black text-slate-800 mt-2 relative z-10">{totalCompletedEvents}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 bg-orange-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Plafon Anggaran ({periodName})</p>
          <p className="text-2xl font-black text-orange-600 mt-2 relative z-10">{formatCurrency(totalAllocated)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 bg-emerald-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Realisasi Anggaran ({periodName})</p>
          <p className="text-2xl font-black text-emerald-600 mt-2 relative z-10">{formatCurrency(totalBudgetSpent)}</p>
        </div>
        
        {/* Rating Card Only For Admin */}
        {!isPIC && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-yellow-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Rating Kepuasan</p>
            <p className="text-3xl font-black text-yellow-500 mt-2 relative z-10 flex items-center">{avgRating} <Star className="w-5 h-5 ml-1 fill-current"/></p>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 bg-purple-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Total Tugas Pending</p>
          <p className="text-4xl font-black text-purple-600 mt-2 relative z-10">
            {roleFilteredEvents.filter(e => isPIC ? ['funded'].includes(e.status) : ['pending_approval', 'pending_settlement'].includes(e.status)).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Analytics */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-indigo-600" /> Analitik Tren Pertumbuhan Data Tervalidasi ({filterYear})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
            <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-500 mb-6 text-center uppercase tracking-wide">Tren Kegiatan Selesai</p>
              <div className="flex-grow w-full overflow-x-auto custom-scrollbar pb-2">
                <div className="flex gap-3 h-40 items-end justify-between px-2 min-w-[200px]">
                  {chartData.map((data, i) => (
                    <div key={`evt-${i}`} className="flex flex-col items-center justify-end flex-grow h-full gap-2 relative group min-w-[30px]">
                      <div className="w-full bg-indigo-300 rounded-t-md hover:bg-indigo-500 transition-all relative flex justify-center shadow-sm" style={{ height: `${Math.max((data.events/maxEvents)*100, 5)}%` }}>
                        {data.events > 0 && <span className="absolute -top-6 text-[10px] font-black text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">{data.events}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{data.periodLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-500 mb-6 text-center uppercase tracking-wide">Tren Kehadiran Peserta</p>
              <div className="flex-grow w-full overflow-x-auto custom-scrollbar pb-2">
                <div className="flex gap-3 h-40 items-end justify-between px-2 min-w-[200px]">
                  {chartData.map((data, i) => (
                    <div key={`pax-${i}`} className="flex flex-col items-center justify-end flex-grow h-full gap-2 relative group min-w-[30px]">
                      <div className="w-full bg-emerald-400 rounded-t-md hover:bg-emerald-600 transition-all relative flex justify-center shadow-sm" style={{ height: `${Math.max((data.participants/maxPax)*100, 5)}%` }}>
                        {data.participants > 0 && <span className="absolute -top-6 text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shadow-sm z-10 transition-opacity">{data.participants}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{data.periodLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-500 mb-6 text-center uppercase tracking-wide">Tren Realisasi Anggaran</p>
              <div className="flex-grow w-full overflow-x-auto custom-scrollbar pb-2">
                <div className="flex gap-3 h-40 items-end justify-between px-2 min-w-[200px]">
                  {chartData.map((data, i) => (
                    <div key={`budget-${i}`} className="flex flex-col items-center justify-end flex-grow h-full gap-2 relative group min-w-[30px]">
                      <div className="w-full bg-orange-400 rounded-t-md hover:bg-orange-600 transition-all relative flex justify-center shadow-sm" style={{ height: `${Math.max((data.budgetSpent/maxBudget)*100, 5)}%` }}>
                        {data.budgetSpent > 0 && <span className="absolute -top-6 text-[10px] font-black text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded shadow-sm z-10 whitespace-nowrap hidden group-hover:block transition-opacity">{formatCurrency(data.budgetSpent)}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{data.periodLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar Serapan Anggaran */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-blue-600" /> Analisis Serapan Anggaran Program</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {programsToMonitor.map((prog) => {
              const progEvents = currentPeriodEvents.filter(e => e.sport_type.includes(prog.sport) && e.status === 'completed');
              const spent = progEvents.reduce((sum, e) => sum + (e.report?.actual_cost || calculateTotalBudget(e.budget_items)), 0);
              
              const plafon = getTotalPlafonForPeriod(prog, filterType, filterValue, filterYear);
              const pct = plafon > 0 ? Math.min((spent / plafon) * 100, 100).toFixed(1) : 0;
              const isOver = spent > plafon;
              
              return (
                <div key={prog.id} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex justify-between text-sm font-bold mb-3">
                    <span className="text-slate-800 font-black truncate max-w-[50%]">
                      {prog.sport} <br/><span className="text-[10px] text-slate-400 font-medium">{prog.area}</span>
                    </span>
                    <span className={`text-right ${isOver ? 'text-red-600' : 'text-slate-600'}`}>
                      {formatCurrency(spent)} <span className="text-[10px] text-slate-400 font-medium block">Plafon: {formatCurrency(plafon)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div className={`h-full transition-all duration-1000 ease-out rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className={`text-xs font-black min-w-[35px] text-right ${isOver ? 'text-red-600' : 'text-slate-500'}`}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live Feed Event Terfilter */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full lg:col-span-1 max-h-[600px]">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center"><Activity className="w-5 h-5 mr-2 text-red-600" /> 
            {isPIC ? 'Status Kegiatan Anda' : 'Daftar Kegiatan'}
          </h3>
          <div className="space-y-4 overflow-y-auto flex-grow pr-2 custom-scrollbar">
            {currentPeriodEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <Calendar className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-center">Tidak ada kegiatan pada filter ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentPeriodEvents.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).map((evt) => {
                  const statusInfo = getStatusDisplay(evt.status);
                  const isPIC = ctx.user.role === ROLES.PIC;
                  const picAcc = ctx.accounts.find(a => a.id === evt.pic_id);
                  
                  return (
                    <div key={evt.id} className="flex flex-col p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-black text-slate-800 text-sm leading-tight">{evt.sport_type}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5"><Map className="w-3 h-3 inline mr-1 -mt-0.5"/>{picAcc?.area || AREA_HO}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1"><Calendar className="w-3 h-3 inline mr-1 -mt-0.5"/>{new Date(evt.event_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
                        </div>
                        <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 whitespace-nowrap">
                          {formatCurrency(isPIC ? (evt.report?.vendor_cost || evt.report?.actual_cost || calculateTotalBudget(evt.budget_items)) : (evt.report?.actual_cost || calculateTotalBudget(evt.budget_items)))}
                        </p>
                      </div>
                      
                      {/* Visual Stepper Khusus PIC */}
                      {isPIC && (
                        <div className="mt-1 pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-0 -translate-y-1/2 rounded-full"></div>
                            <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-0 -translate-y-1/2 rounded-full transition-all duration-1000" style={{ width: `${((statusInfo.step-1) / 3) * 100}%` }}></div>
                            {[1, 2, 3, 4].map(step => (
                              <div key={step} className={`w-3 h-3 rounded-full relative z-10 border-2 transition-colors ${statusInfo.step >= step ? 'bg-emerald-500 border-emerald-100 shadow-sm' : 'bg-slate-200 border-white'}`}></div>
                            ))}
                          </div>
                          <p className={`text-center mt-2 text-[9px] font-black uppercase tracking-wider ${statusInfo.color.split(' ')[1]}`}>{statusInfo.label}</p>
                        </div>
                      )}

                      {/* Tampilan Standar Untuk Admin */}
                      {!isPIC && (
                        <div className="text-right mt-1 border-t border-slate-100 pt-2 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400"><Users className="w-3 h-3 inline mr-1"/>{evt.report?.attended || evt.participants?.length || 0} Pax</span>
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Form Pelaporan & Pencatatan Baru (Kombinasi)
const ViewReporting = ({ ctx }) => {
  const defaultSport = ctx.user.sport || '';
  const defaultProgram = ctx.programs.find(p => p.sport === defaultSport && p.area === ctx.user.area) || {};
  const currentYm = new Date().toISOString().slice(0, 7);
  const activeRules = getActiveProgramRules(defaultProgram, currentYm);

  const [formData, setFormData] = useState({ 
    date: '', venue: '', actual_cost: '', attended: '', notes: '', rating: 5, 
    files: { nota: [], absensi: [], foto: [] } 
  });

  const handleFile = async (e, type) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    const processedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (file.type === 'application/pdf' && file.size > 800 * 1024) {
        ctx.showToast(`Ukuran PDF ${file.name} terlalu besar (Maks 800KB). File dilewati.`, 'error');
        continue;
      }

      const fileData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      if (file.type.startsWith('image/')) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              let width = img.width;
              let height = img.height;
              const MAX_DIMENSION = 800; 
              if (width > height && width > MAX_DIMENSION) { height = Math.round(height * (MAX_DIMENSION / width)); width = MAX_DIMENSION; }
              else if (height > MAX_DIMENSION) { width = Math.round(width * (MAX_DIMENSION / height)); height = MAX_DIMENSION; }

              const canvas = document.createElement('canvas');
              canvas.width = width; canvas.height = height;
              const canvasCtx = canvas.getContext('2d');
              if(canvasCtx) { 
                canvasCtx.fillStyle = '#FFFFFF'; 
                canvasCtx.fillRect(0, 0, width, height); 
                canvasCtx.drawImage(img, 0, 0, width, height); 
              }

              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
              processedFiles.push({ name: file.name, type: 'image/jpeg', data: compressedDataUrl });
              resolve(true);
            } catch(err) { 
              processedFiles.push({ name: file.name, type: file.type, data: fileData });
              resolve(true);
            }
          };
          img.onerror = () => { 
            processedFiles.push({ name: file.name, type: file.type, data: fileData });
            resolve(true);
          };
          img.src = fileData;
        });
      } else {
        processedFiles.push({ name: file.name, type: file.type, data: fileData });
      }
    }

    if (processedFiles.length > 0) {
      setFormData(prev => {
        const existing = Array.isArray(prev.files[type]) ? prev.files[type] : (prev.files[type] ? [prev.files[type]] : []);
        return {
          ...prev,
          files: {
            ...prev.files,
            [type]: [...existing, ...processedFiles]
          }
        };
      });
      ctx.showToast(`Berhasil memproses & menambahkan ${processedFiles.length} file ${type}.`, 'success');
    }
    
    e.target.value = '';
  };

  const removeFile = (type, index) => {
    setFormData(prev => {
      const newFiles = [...(prev.files[type] || [])];
      newFiles.splice(index, 1);
      return { ...prev, files: { ...prev.files, [type]: newFiles } };
    });
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if(!formData.files.nota || formData.files.nota.length === 0 || !formData.files.foto || formData.files.foto.length === 0) {
       return ctx.showToast('Silakan unggah Nota dan Foto Dokumentasi (minimal 1 file) untuk melanjutkan.', 'error');
    }
    if(Number(formData.attended) < 7) return ctx.showToast('Minimal pengajuan adalah 7 peserta.', 'error');

    // Menghitung Biaya dengan menyuntikkan Biaya Admin Otomatis tanpa PIC sadari
    const vendorCost = Number(formData.actual_cost);
    const adminFee = Number(activeRules.adminFee || 0);
    const totalCost = vendorCost + adminFee;

    const dummyParticipants = Array(Number(formData.attended)).fill(null).map((_, i) => ({ id: generateId(), name: `Peserta ${i + 1}`, dept: '-' }));

    const newEvent = {
      id: generateId(),
      pic_id: ctx.user.id,
      sport_type: ctx.user.sport,
      event_date: new Date(formData.date).toISOString(),
      venue_name: formData.venue,
      status: 'pending_settlement',
      participants: dummyParticipants,
      budget_items: [
        { desc: 'Realisasi Vendor (Nota)', qty: 1, unit: 'Sesi', price: vendorCost },
        { desc: 'Biaya Admin Transfer', qty: 1, unit: 'Trx', price: adminFee }
      ],
      report: {
        actual_cost: totalCost,      // Disimpan total beserta admin untuk Admin Approve
        vendor_cost: vendorCost,    // Disimpan untuk PIC
        admin_fee: adminFee,
        attended: Number(formData.attended),
        notes: formData.notes,
        rating: formData.rating,
        files: formData.files
      }
    };

    try {
      await ctx.addEvent(newEvent);
      ctx.setView('dashboard');
      ctx.showToast('Laporan berhasil dikirim untuk validasi Admin!', 'success');
    } catch (error) {
      ctx.showToast('Gagal mengirim laporan. Coba kurangi ukuran file Anda.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
        <div className="mb-8 border-b border-slate-100 pb-5">
          <h3 className="text-3xl font-black text-slate-800 flex items-center"><FileText className="mr-3 text-blue-500 w-8 h-8"/> Laporan Kegiatan Baru: {ctx.user.sport}</h3>
          <p className="text-sm font-bold text-slate-500 mt-2 flex items-center"><Map className="w-4 h-4 mr-1 text-slate-400"/> Area: {ctx.user.area}</p>
        </div>
        
        <form onSubmit={handleSubmitReport} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tanggal Pelaksanaan</label>
              <input type="date" required className="w-full p-4 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Venue Pelaksanaan</label>
              <input type="text" required placeholder="Cth: DDB Arena" className="w-full p-4 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} />
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex-grow w-full md:w-auto md:max-w-md">
              <label className="block text-sm font-black mb-2 text-emerald-700">Total Biaya Sesuai Nota/Vendor</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-4 w-5 h-5 text-emerald-500" />
                <input 
                  type="number" 
                  required 
                  className="w-full pl-12 pr-4 py-3 border-2 border-emerald-200 rounded-xl bg-white font-black text-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all" 
                  value={formData.actual_cost} 
                  onChange={(e) => setFormData({...formData, actual_cost: e.target.value})} 
                  placeholder="Masukkan Nominal Sesuai Nota"
                  onWheel={(e) => e.target.blur()}
                  onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-2 border-slate-100 p-6 rounded-2xl bg-white flex flex-col justify-center">
              <p className="font-black text-slate-800 mb-4">Jumlah Kehadiran Aktual</p>
              <div className="relative">
                <Users className="absolute left-4 top-4 w-6 h-6 text-blue-500" />
                <input 
                  type="number" 
                  required min="7" 
                  className="w-full pl-14 pr-4 py-3 border-2 border-blue-200 rounded-xl bg-slate-50 font-black text-2xl outline-none focus:border-blue-500 transition-all" 
                  value={formData.attended} 
                  onChange={(e) => setFormData({...formData, attended: e.target.value})} 
                  placeholder="0"
                  onWheel={(e) => e.target.blur()}
                  onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }} 
                />
              </div>
              <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">Ketikan angka total peserta yang hadir (Minimal 7 orang). <br/><span className="text-red-500 font-bold">Wajib melampirkan file dokumen absensi sebagai bukti otentik.</span></p>
            </div>
            <div className="border-2 border-slate-100 p-6 rounded-2xl bg-white flex flex-col justify-between">
              <div>
                <p className="font-black text-slate-800 mb-3">Penilaian Tempat / Vendor</p>
                <div className="flex gap-2 mb-6">
                  {[1,2,3,4,5].map(n => (
                    <button type="button" key={n} onClick={() => setFormData({...formData, rating: n})} className={`p-1 transition-transform hover:scale-125 ${formData.rating >= n ? 'text-orange-500' : 'text-slate-200'}`}><Star className="w-8 h-8 fill-current"/></button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">Catatan Pelaksanaan</label>
                <textarea className="w-full p-4 border-2 border-slate-100 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-500 focus:bg-white transition-colors" rows="3" placeholder="Tulis rincian atau kesan pesan acara..." value={formData.notes} onChange={(e)=>setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <p className="font-black text-blue-900 mb-5 flex items-center"><Paperclip className="w-5 h-5 mr-2"/> Unggah Dokumen Bukti (Multiple)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <label className="block text-xs font-bold text-slate-600 mb-2">1. Nota / Invoice (Wajib)</label>
                <input type="file" multiple required={!formData.files.nota || formData.files.nota.length === 0} accept="image/*,application/pdf" onChange={(e) => handleFile(e, 'nota')} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                {formData.files.nota && formData.files.nota.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {formData.files.nota.map((f, idx) => (
                      <li key={idx} className="text-[10px] text-emerald-700 font-bold flex justify-between items-center bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-100 shadow-sm">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => removeFile('nota', idx)} className="text-red-400 hover:text-red-600 ml-2 transition-colors flex-shrink-0"><XCircle className="w-4 h-4"/></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <label className="block text-xs font-bold text-slate-600 mb-2">2. Foto Kegiatan (Wajib)</label>
                <input type="file" multiple required={!formData.files.foto || formData.files.foto.length === 0} accept="image/*,application/pdf" onChange={(e) => handleFile(e, 'foto')} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                {formData.files.foto && formData.files.foto.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {formData.files.foto.map((f, idx) => (
                      <li key={idx} className="text-[10px] text-emerald-700 font-bold flex justify-between items-center bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-100 shadow-sm">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => removeFile('foto', idx)} className="text-red-400 hover:text-red-600 ml-2 transition-colors flex-shrink-0"><XCircle className="w-4 h-4"/></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <label className="block text-xs font-bold text-slate-600 mb-2">3. Daftar Hadir (Opsional)</label>
                <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => handleFile(e, 'absensi')} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                {formData.files.absensi && formData.files.absensi.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {formData.files.absensi.map((f, idx) => (
                      <li key={idx} className="text-[10px] text-emerald-700 font-bold flex justify-between items-center bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-100 shadow-sm">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => removeFile('absensi', idx)} className="text-red-400 hover:text-red-600 ml-2 transition-colors flex-shrink-0"><XCircle className="w-4 h-4"/></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => ctx.setView('dashboard')} className="px-8 py-4 bg-slate-100 font-black rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
            <button type="submit" className="flex-grow bg-blue-900 hover:bg-blue-800 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg">Kirim Laporan Akhir</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminSettlementCard = ({ evt, ctx }) => {
  const [editCost, setEditCost] = useState(evt.report?.actual_cost || 0);
  const [editAttended, setEditAttended] = useState(evt.report?.attended || 0);
  const [adminNote, setAdminNote] = useState('');

  const pic = ctx.accounts.find(a => a.id === evt.pic_id);
  const prog = ctx.programs.find(p => p.sport === evt.sport_type && p.area === pic?.area) || {};
  const currentYm = evt.event_date.slice(0, 7);
  const plafon = getProgramLimitForMonth(prog, currentYm);

  const diff = editCost - plafon;

  const handleAction = async (newStatus) => {
    const updatedReport = { ...evt.report, actual_cost: editCost, attended: editAttended };
    try {
      await ctx.updateEvent(evt.id, { status: newStatus, report: updatedReport, admin_notes: adminNote });
      ctx.showToast(newStatus === 'completed' ? 'Validasi Selesai & Data Diarsipkan!' : 'PIC Diminta Melakukan Revisi.', 'success');
    } catch(err) {
      ctx.showToast('Gagal memperbarui status laporan.', 'error');
    }
  };

  return (
    <div className="bg-white border-2 border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-lg transition-all p-6 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl tracking-wider shadow-sm">Review Dokumen</div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-black text-xl text-slate-800 mt-2">{evt.sport_type}</h3>
          <p className="text-xs font-bold text-slate-500 mt-1 flex items-center"><Map className="w-3 h-3 mr-1 text-slate-400"/> {pic?.area || AREA_HO}</p>
          <p className="text-sm font-semibold text-slate-500 mt-1">{new Date(evt.event_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
        </div>
        <button onClick={() => ctx.openModal(evt)} className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm">
          <Eye className="w-3 h-3 mr-1"/> Detail Rincian
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Plafon Max (Total)</p>
          <p className="font-bold text-slate-400 text-sm">{formatCurrency(plafon)}</p>
        </div>
        <div className={`p-3 rounded-xl border text-center flex flex-col justify-center ${diff > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-center">Realisasi Akhir (Termasuk Admin) <Edit3 className="w-3 h-3 ml-1 text-slate-400"/></p>
          <input 
            type="number" 
            className="bg-transparent font-black text-slate-800 text-lg leading-none text-center w-full outline-none focus:border-b border-slate-300" 
            value={editCost} 
            onChange={(e) => setEditCost(Number(e.target.value))} 
            title="Admin dapat mengedit nominal ini"
            onWheel={(e) => e.target.blur()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }} 
          />
        </div>
        <div className="col-span-2 bg-white p-3 rounded-xl border flex items-center justify-between shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">Total Kehadiran Aktual <Edit3 className="w-3 h-3 ml-2 text-slate-400"/></p>
          <div className="flex items-center">
            <input 
              type="number" 
              className="font-black text-blue-900 text-xl w-16 text-right outline-none bg-blue-50 border border-blue-100 rounded-lg px-2 focus:border-blue-400 transition-colors" 
              value={editAttended} 
              onChange={(e) => setEditAttended(Number(e.target.value))} 
              title="Admin dapat mengedit jumlah ini"
              onWheel={(e) => e.target.blur()}
              onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }} 
            />
            <span className="text-xs text-slate-500 ml-2 font-bold uppercase">Orang</span>
          </div>
        </div>
      </div>

      <div className="mb-5 bg-blue-50 p-4 rounded-xl border border-blue-100 max-h-48 overflow-y-auto custom-scrollbar">
        <p className="text-xs font-black mb-3 text-blue-900 tracking-wide uppercase">File Lampiran PIC:</p>
        <ul className="space-y-2">
          {['nota', 'absensi', 'foto'].map(fileKey => {
            const fileData = evt.report?.files?.[fileKey];
            if(!fileData) return null;
            
            // Handle multiple files gracefully
            const fileArray = Array.isArray(fileData) ? fileData : [fileData];
            
            return fileArray.map((fileObj, index) => {
              const displayLabel = typeof fileObj === 'string' ? fileObj : fileObj.name;
              return (
                <li key={`${fileKey}-${index}`} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                  <span className="flex items-center truncate mr-2"><Paperclip className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0"/> <span className="truncate text-xs font-bold text-slate-600">{fileKey.toUpperCase()} - {displayLabel}</span></span>
                  <button onClick={() => ctx.openPreview(fileObj)} className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors flex-shrink-0 flex items-center shadow-sm"><Eye className="w-3 h-3 mr-1"/> Lihat</button>
                </li>
              );
            });
          })}
        </ul>
      </div>

      <input type="text" placeholder="Berikan komen / catatan validasi..." className="w-full text-sm p-3 border-2 border-slate-100 rounded-xl mb-4 bg-white focus:border-purple-400 focus:ring-0 outline-none transition-colors" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
      <div className="flex gap-3">
        <button onClick={() => handleAction('funded')} className="px-4 py-3 bg-white text-orange-600 font-black rounded-xl border-2 border-orange-200 hover:bg-orange-50 transition-colors text-xs text-center shadow-sm">Tolak & Revisi</button>
        <button onClick={() => handleAction('completed')} className="flex-grow bg-blue-900 hover:bg-blue-800 text-white font-black py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center transition-all"><CheckSquare className="w-5 h-5 mr-2"/> Validasi Selesai</button>
      </div>
    </div>
  );
};

// 3. Admin Approvals & Tracking
const ViewAdminApprovals = ({ ctx }) => {
  const ongoingEvents = ctx.events.filter((e) => ['pending_approval', 'funded'].includes(e.status));
  const pendingSettlements = ctx.events.filter((e) => e.status === 'pending_settlement');
  const [adminNotes, setAdminNotes] = useState({});

  const handleApprove = async (id, newStatus) => {
    try {
      await ctx.updateEvent(id, { status: newStatus, admin_notes: adminNotes[id] || '' });
      setAdminNotes(prev => ({...prev, [id]: ''}));
      ctx.showToast('Keputusan berhasil disimpan!', 'success');
    } catch(err) {
      ctx.showToast('Gagal menyimpan keputusan', 'error');
    }
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center"><FileCheck className="mr-3 text-purple-600"/> 1. Validasi Laporan Masuk (Settlement Akhir)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingSettlements.length === 0 && <div className="col-span-2 bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-bold">Tidak ada laporan yang menunggu validasi.</div>}
          {pendingSettlements.map((evt) => (
             <AdminSettlementCard key={evt.id} evt={evt} ctx={ctx} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center"><Activity className="mr-3 text-blue-600"/> 2. Pantauan Proposal Legacy / Menunggu Revisi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ongoingEvents.length === 0 && <div className="col-span-2 bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-bold">Semua data aman. Tidak ada proposal atau status revisi.</div>}
          {ongoingEvents.map((evt) => {
            const pic = ctx.accounts.find((a) => a.id === evt.pic_id);
            const isLegacyPending = evt.status === 'pending_approval';
            
            return (
              <div key={evt.id} className="bg-white border-2 border-yellow-100 hover:border-yellow-300 shadow-sm hover:shadow-lg transition-all p-6 rounded-3xl">
                <div className="flex justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <p className="font-black text-xl text-slate-800">{evt.sport_type}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center"><Map className="w-3 h-3 mr-1 text-slate-400"/> {pic?.area || AREA_HO}</p>
                    <p className="text-sm text-slate-500 font-semibold mt-1">Oleh: <span className="text-blue-600">{pic?.name}</span></p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-black text-emerald-600 text-2xl">{formatCurrency(calculateTotalBudget(evt.budget_items))}</p>
                    <button onClick={() => ctx.openModal(evt)} className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg flex items-center hover:bg-blue-100 transition-colors shadow-sm">
                      <Eye className="w-3 h-3 mr-1"/> Lihat Rincian
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center mb-4 bg-blue-50 p-2.5 rounded-xl border border-blue-100 w-fit">
                  <Users className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="text-xs font-black text-blue-900">{evt.participants?.length || 0} Rencana Peserta Terdaftar</span>
                </div>
                
                {isLegacyPending ? (
                  <>
                    <input type="text" placeholder="Tambahkan catatan (Opsional)" className="w-full text-sm p-3 border-2 border-slate-100 rounded-xl mb-4 bg-white focus:border-blue-400 focus:ring-0 outline-none transition-colors" value={adminNotes[evt.id] || ''} onChange={e => setAdminNotes({...adminNotes, [evt.id]: e.target.value})} />
                    <div className="flex gap-3">
                      <button onClick={() => handleApprove(evt.id, 'rejected')} className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-xl border border-red-200 transition-colors shadow-sm">Tolak</button>
                      <button onClick={() => handleApprove(evt.id, 'funded')} className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center transition-all"><CheckCircle className="w-5 h-5 mr-2"/> Setujui Proposal</button>
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center">
                    <Activity className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Kegiatan butuh revisi oleh PIC.</p>
                      <p className="text-xs text-blue-700 font-medium mt-0.5">Sistem sedang menunggu PIC melakukan pengajuan ulang laporan terkait di halaman mereka.</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

// 4. Database & Export
const ViewDatabase = ({ ctx }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('completed');
  const [filterPic, setFilterPic] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  
  const picAccounts = ctx.accounts.filter(a => a.role === ROLES.PIC);
  
  let displayEvents = ctx.events
    .filter((e) => {
      if (ctx.user.role !== ROLES.ADMIN && e.pic_id !== ctx.user.id) return false;
      
      if (ctx.user.role === ROLES.ADMIN) {
        const pic = picAccounts.find(a => a.id === e.pic_id);
        if (filterArea !== 'all' && pic?.area !== filterArea) return false;
        if (filterPic !== 'all' && e.pic_id !== filterPic) return false;
      }
      
      if (filterStatus === 'all') return true;
      if (filterStatus === 'ongoing') return ['funded', 'pending_settlement'].includes(e.status);
      return e.status === 'completed';
    })
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  if (searchTerm) {
    const lowerTerm = searchTerm.toLowerCase();
    displayEvents = displayEvents.filter((e) => e.sport_type.toLowerCase().includes(lowerTerm) || e.venue_name.toLowerCase().includes(lowerTerm));
  }

  const handleDeleteEvent = async (id) => {
    if(window.confirm('Yakin ingin menghapus arsip data ini secara permanen? Hal ini akan memengaruhi metrik dasbor.')) {
      await ctx.deleteEvent(id);
      ctx.showToast('Arsip berhasil dihapus.', 'success');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID_Arsip', 'Tanggal', 'PIC_Nama', 'Area', 'Cabor_Program', 'Venue', 'Total_Peserta', 'Biaya_Vendor', 'Biaya_Admin', 'Total_Realisasi', 'Status_Akhir'];
    const rows = displayEvents.map((e) => {
      const pic = ctx.accounts.find(a => a.id === e.pic_id);
      const picName = pic?.name || 'Admin / PIC Terhapus';
      const area = pic?.area || AREA_HO;
      const dateStr = new Date(e.event_date).toLocaleDateString('id-ID');
      const vendorCost = e.report?.vendor_cost || e.report?.actual_cost || calculateTotalBudget(e.budget_items);
      const adminFee = e.report?.admin_fee || 0;
      const totalCost = e.report?.actual_cost || vendorCost;
      const statusLabel = getStatusDisplay(e.status).label;
      return [
        e.id, dateStr, picName, area, e.sport_type, e.venue_name, 
        e.report?.attended || e.participants?.length || 0,
        vendorCost, adminFee, totalCost, statusLabel
      ].map(v => `"${v}"`).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Export_Meratus_Happiness_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <h2 className="text-3xl font-black text-slate-800 flex items-center"><Database className="mr-3 text-blue-600 w-8 h-8" /> Arsip Database Program</h2>
        <div className="flex flex-wrap w-full xl:w-auto gap-3">
          <div className="relative flex-grow md:w-48">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari program / venue..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
          </div>
          
          {ctx.user.role === ROLES.ADMIN && (
            <>
              <div className="relative">
                <Map className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <select value={filterArea} onChange={(e) => {setFilterArea(e.target.value); setFilterPic('all');}} className="w-full pl-9 pr-8 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-white appearance-none cursor-pointer">
                  <option value="all">Semua Area</option>
                  <option value={AREA_HO}>{AREA_HO}</option>
                  {ctx.branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <select value={filterPic} onChange={(e) => setFilterPic(e.target.value)} className="w-full pl-9 pr-8 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-white appearance-none cursor-pointer">
                  <option value="all">Semua PIC</option>
                  {picAccounts.filter(a => filterArea === 'all' || a.area === filterArea).map(pic => <option key={pic.id} value={pic.id}>{pic.sport} ({pic.name})</option>)}
                </select>
              </div>
            </>
          )}

          <div className="relative">
            <Activity className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="pl-9 pr-8 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-white appearance-none cursor-pointer">
              <option value="completed">Arsip Selesai</option>
              <option value="ongoing">Sedang Berjalan</option>
              <option value="all">Semua Status</option>
            </select>
          </div>
          
          <button 
            onClick={handleExportCSV} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-black flex items-center transition-colors shadow-sm whitespace-nowrap">
            <Download className="w-4 h-4 mr-2" /> Data CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider">Tanggal Aktivitas</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider">Program & Area</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-center">Peserta</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-right">Biaya (Vendor)</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-right">Total Realisasi (Incl Admin)</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayEvents.length === 0 && (
                <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold">Tidak ada rekaman data yang ditemukan.</td></tr>
              )}
              {displayEvents.map((evt) => {
                const pic = ctx.accounts.find(a => a.id === evt.pic_id);
                const picName = pic?.name || 'Manual Admin';
                const area = pic?.area || AREA_HO;
                const actualCost = evt.report?.actual_cost || calculateTotalBudget(evt.budget_items || []);
                const vendorCost = evt.report?.vendor_cost || actualCost;
                
                return (
                  <tr key={evt.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="p-5 text-slate-700 text-sm font-bold">{new Date(evt.event_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                    <td className="p-5">
                      <p className="font-black text-blue-900 flex items-center">
                        {evt.sport_type}
                        {evt.status !== 'completed' && <span className="ml-2 bg-blue-100 text-blue-700 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Berjalan</span>}
                      </p>
                      <p className="text-xs text-slate-500 font-bold mt-1 flex items-center"><Map className="w-3 h-3 mr-1"/> {area}</p>
                      <p className="text-xs text-slate-500 font-bold mt-0.5"><User className="w-3 h-3 mr-1 inline"/>{picName}</p>
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-slate-100 text-slate-700 font-black text-xs px-3 py-1.5 rounded-lg border border-slate-200 group-hover:bg-white transition-colors">{evt.report?.attended || evt.participants?.length || 0} Orang</span>
                    </td>
                    <td className="p-5 font-black text-slate-500 text-md text-right">{formatCurrency(vendorCost)}</td>
                    <td className="p-5 font-black text-emerald-600 text-lg text-right">{formatCurrency(actualCost)}</td>
                    <td className="p-5 text-center whitespace-nowrap">
                      <button onClick={() => ctx.openModal(evt)} className="text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl text-xs font-black inline-flex items-center transition-all shadow-sm">
                        <Eye className="w-4 h-4 mr-2" /> Detail
                      </button>
                      {ctx.user.role === ROLES.ADMIN && (
                        <button onClick={() => handleDeleteEvent(evt.id)} className="text-red-600 hover:text-white bg-red-50 hover:bg-red-500 px-4 py-2 rounded-xl text-xs font-black inline-flex items-center transition-all shadow-sm ml-2">
                          <Trash2 className="w-4 h-4 mr-2" /> Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// 5. PDF Builder Khusus (Baru)
const ViewPDFReport = ({ ctx }) => {
  const [reportPeriodType, setReportPeriodType] = useState('Bulanan');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportDate, setReportDate] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterPic, setFilterPic] = useState('all');
  const [transactionPdfUrl, setTransactionPdfUrl] = useState('');
  const [transactionPdfFile, setTransactionPdfFile] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [totalBudget, setTotalBudget] = useState('');
  const [masterBudget, setMasterBudget] = useState('');
  const [deductedEventIds, setDeductedEventIds] = useState(new Set());

  // Filter Data
  let displayEvents = ctx.events.filter(e => e.status === 'completed');
  
  if (filterArea !== 'all') {
    displayEvents = displayEvents.filter(e => {
      const pic = ctx.accounts.find(a => a.id === e.pic_id);
      return pic?.area === filterArea;
    });
  }

  if (filterPic !== 'all') {
    displayEvents = displayEvents.filter(e => e.pic_id === filterPic);
  }

  if (reportPeriodType === 'Bulanan' && filterMonth) {
    displayEvents = displayEvents.filter(e => e.event_date.startsWith(filterMonth));
  } else if (reportPeriodType !== 'Bulanan' && reportDate) {
    const start = new Date(reportDate);
    const end = new Date(reportDate);
    if (reportPeriodType === 'Mingguan') end.setDate(end.getDate() + 7);
    if (reportPeriodType === 'Bi-Weekly') end.setDate(end.getDate() + 14);
    
    displayEvents = displayEvents.filter((e) => {
      const d = new Date(e.event_date);
      return d >= start && d < end;
    });
  }
  
  displayEvents.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  // Effect to auto-select events when display changes
  useEffect(() => {
     setSelectedIds(new Set(displayEvents.map(e => e.id)));
  }, [filterMonth, reportDate, reportPeriodType, filterPic, filterArea, ctx.events]);

  const handleSelectAll = (e) => {
     if (e.target.checked) setSelectedIds(new Set(displayEvents.map(ev => ev.id)));
     else setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
     const newSet = new Set(selectedIds);
     if (newSet.has(id)) newSet.delete(id);
     else newSet.add(id);
     setSelectedIds(newSet);
  };

  // Kalkulasi Deductions
  let currentYear = '';
  let currentMonth = '';
  if (reportPeriodType === 'Bulanan' && filterMonth) {
     const parts = filterMonth.split('-');
     currentYear = parts[0]; currentMonth = parts[1];
  } else if (reportDate) {
     const d = new Date(reportDate);
     currentYear = d.getFullYear().toString(); currentMonth = String(d.getMonth() + 1).padStart(2, '0');
  } else {
     const d = new Date();
     currentYear = d.getFullYear().toString(); currentMonth = String(d.getMonth() + 1).padStart(2, '0');
  }
  const yyyymm = `${currentYear}-${currentMonth}`;

  const availableForDeduction = ctx.events.filter((e) => {
      if (e.status !== 'completed') return false;
      if (filterArea !== 'all') {
         const pic = ctx.accounts.find(a => a.id === e.pic_id);
         if (pic?.area !== filterArea) return false;
      }
      if (filterPic !== 'all' && e.pic_id !== filterPic) return false;
      if (!e.event_date.startsWith(yyyymm)) return false;
      return !selectedIds.has(e.id);
  });
  
  useEffect(() => {
     if (masterBudget !== '') {
        const totalDeducted = availableForDeduction
           .filter(e => deductedEventIds.has(e.id))
           .reduce((sum, e) => sum + (e.report?.actual_cost || calculateTotalBudget(e.budget_items || [])), 0);
        setTotalBudget((Number(masterBudget) || 0) - totalDeducted);
     }
  }, [masterBudget, deductedEventIds, availableForDeduction]);

  useEffect(() => {
     let year = ''; let month = '';
     if (reportPeriodType === 'Bulanan' && filterMonth) {
        const parts = filterMonth.split('-');
        year = parts[0]; month = parts[1];
     } else if (reportDate) {
        const d = new Date(reportDate);
        year = d.getFullYear().toString(); month = String(d.getMonth() + 1).padStart(2, '0');
     } else {
        const d = new Date();
        year = d.getFullYear().toString(); month = String(d.getMonth() + 1).padStart(2, '0');
     }

     const programsToSum = ctx.programs.filter((p) => {
         if (filterArea !== 'all' && p.area !== filterArea) return false;
         if (filterPic !== 'all') {
             const selectedPic = ctx.accounts.find(a => a.id === filterPic);
             return p.sport === selectedPic?.sport && p.area === selectedPic?.area;
         }
         return true;
     });
         
     const autoTotal = programsToSum.reduce((acc, p) => acc + getTotalPlafonForPeriod(p, 'month', month, year), 0);
     setMasterBudget(autoTotal || '');
  }, [reportPeriodType, filterMonth, reportDate, filterPic, filterArea, ctx.programs, ctx.accounts]);

  const toggleDeduction = (id) => {
     const newSet = new Set(deductedEventIds);
     if (newSet.has(id)) newSet.delete(id);
     else newSet.add(id);
     setDeductedEventIds(newSet);
  };

  // --- PDF GENERATOR NATIVE ---
  const handleDownloadPDF = async () => {
    if (!window.PDFLib) {
       ctx.showToast('Library PDF sedang dimuat, coba lagi sebentar.', 'error');
       return;
    }
    const completedEvents = [...displayEvents.filter(e => selectedIds.has(e.id))]
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    
    if (completedEvents.length === 0) {
       ctx.showToast('Pilih setidaknya 1 kegiatan (Checklist) yang berstatus Selesai.', 'error');
       return;
    }

    setIsGeneratingPdf(true);
    try {
       const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
       const pdfDoc = await PDFDocument.create();
       const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
       const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

       // 1. Cover / Summary Page (Budget Realisasi)
       const page = pdfDoc.addPage([841.89, 595.28]); // Landscape A4 for table
       const { width, height } = page.getSize();
       
       page.drawText(`MERATUS`, { x: 50, y: height - 50, size: 14, font: fontBold, color: rgb(0, 0, 0.5) });
       page.drawText(`MERATUS ACADEMY`, { x: width - 200, y: height - 50, size: 14, font: fontBold, color: rgb(0, 0, 0.5) });
       
       page.drawText(`Budget Realisasi`, { x: width / 2 - 60, y: height - 70, size: 16, font: fontBold, color: rgb(0, 0, 0) });
       page.drawText(`Happiness Program Meratus Group`, { x: width / 2 - 120, y: height - 90, size: 14, font: fontBold, color: rgb(0, 0, 0) });
       
       const areaLabel = filterArea === 'all' ? 'Semua Area' : filterArea;
       page.drawText(`Area: ${areaLabel}`, { x: width / 2 - (fontBold.widthOfTextAtSize(`Area: ${areaLabel}`, 12) / 2), y: height - 105, size: 12, font: fontBold });

       const downloadDateStr = new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
       page.drawText(`Tanggal Diunduh: ${downloadDateStr}`, { x: 50, y: height - 120, size: 10, font });
       page.drawText(`Total Budget Awal Laporan: IDR ${(Number(totalBudget) || 0).toLocaleString('id-ID')}.00`, { x: width - 280, y: height - 120, size: 10, font: fontBold });
       
       // Draw Table Headers (Yellow)
       page.drawRectangle({ x: 50, y: height - 150, width: width - 100, height: 25, color: rgb(1, 0.8, 0.2) });
       page.drawRectangle({ x: 50, y: height - 150, width: width - 100, height: 25, borderColor: rgb(0,0,0), borderWidth: 1 });
       
       page.drawText(`Jenis Kegiatan`, { x: 60, y: height - 143, size: 10, font: fontBold });
       page.drawText(`Tanggal Pelaksanaan`, { x: 200, y: height - 143, size: 10, font: fontBold });
       page.drawText(`Keterangan`, { x: 350, y: height - 143, size: 10, font: fontBold });
       page.drawText(`Amount`, { x: 550, y: height - 143, size: 10, font: fontBold });
       page.drawText(`Balance`, { x: 680, y: height - 143, size: 10, font: fontBold });

       page.drawLine({ start: { x: 190, y: height - 125 }, end: { x: 190, y: height - 150 }, thickness: 1, color: rgb(0,0,0) });
       page.drawLine({ start: { x: 340, y: height - 125 }, end: { x: 340, y: height - 150 }, thickness: 1, color: rgb(0,0,0) });
       page.drawLine({ start: { x: 540, y: height - 125 }, end: { x: 540, y: height - 150 }, thickness: 1, color: rgb(0,0,0) });
       page.drawLine({ start: { x: 670, y: height - 125 }, end: { x: 670, y: height - 150 }, thickness: 1, color: rgb(0,0,0) });

       let currentY = height - 175;
       let totalAmount = 0;
       let currentBalance = Number(totalBudget) || 0;

       for (const evt of completedEvents) {
          const dateStr = new Date(evt.event_date).toLocaleDateString('id-ID');
          const cost = evt.report?.actual_cost || calculateTotalBudget(evt.budget_items);
          totalAmount += cost;
          currentBalance -= cost;

          if(currentY < 150) { break; } // Simple pagination limit for now
          
          page.drawRectangle({ x: 50, y: currentY, width: width - 100, height: 25, borderColor: rgb(0.8,0.8,0.8), borderWidth: 1 });
          
          page.drawText(evt.sport_type, { x: 60, y: currentY + 7, size: 9, font });
          page.drawText(dateStr, { x: 200, y: currentY + 7, size: 9, font });
          page.drawText('Biaya Pelaksanaan', { x: 350, y: currentY + 7, size: 9, font });
          page.drawText(`IDR ${cost.toLocaleString('id-ID')}.00`, { x: 550, y: currentY + 7, size: 9, font });
          page.drawText(`IDR ${currentBalance.toLocaleString('id-ID')}.00`, { x: 680, y: currentY + 7, size: 9, font });
          
          page.drawLine({ start: { x: 190, y: currentY }, end: { x: 190, y: currentY + 25 }, thickness: 1, color: rgb(0.8,0.8,0.8) });
          page.drawLine({ start: { x: 340, y: currentY }, end: { x: 340, y: currentY + 25 }, thickness: 1, color: rgb(0.8,0.8,0.8) });
          page.drawLine({ start: { x: 540, y: currentY }, end: { x: 540, y: currentY + 25 }, thickness: 1, color: rgb(0.8,0.8,0.8) });
          page.drawLine({ start: { x: 670, y: currentY }, end: { x: 670, y: currentY + 25 }, thickness: 1, color: rgb(0.8,0.8,0.8) });

          currentY -= 25;
       }
       
       // Footer row
       page.drawRectangle({ x: 50, y: currentY, width: width - 100, height: 25, color: rgb(1, 0.8, 0.2), borderColor: rgb(0,0,0), borderWidth: 1 });
       page.drawText(`Total Realisasi`, { x: 60, y: currentY + 7, size: 10, font: fontBold });
       page.drawText(`IDR ${totalAmount.toLocaleString('id-ID')}.00`, { x: 550, y: currentY + 7, size: 10, font: fontBold });
       page.drawText(`IDR ${currentBalance.toLocaleString('id-ID')}.00`, { x: 680, y: currentY + 7, size: 10, font: fontBold });
       
       page.drawLine({ start: { x: 540, y: currentY }, end: { x: 540, y: currentY + 25 }, thickness: 1, color: rgb(0,0,0) });
       page.drawLine({ start: { x: 670, y: currentY }, end: { x: 670, y: currentY + 25 }, thickness: 1, color: rgb(0,0,0) });
       
       currentY -= 30;
       page.drawText(`*Note: ${reportPeriodType} budget realization`, { x: 50, y: currentY, size: 9, font });
       
       currentY -= 40;
       page.drawText(`Prepared By,`, { x: 100, y: currentY, size: 10, font });
       page.drawText(`Approved By,`, { x: width - 200, y: currentY, size: 10, font });
       
       currentY -= 50;
       page.drawText(`(................................)`, { x: 90, y: currentY, size: 10, font });
       page.drawText(`(................................)`, { x: width - 210, y: currentY, size: 10, font });

       // 2. Transaction Status PDF Merge
       if (transactionPdfFile && transactionPdfUrl) {
          try {
             const base64Data = transactionPdfUrl.split(';base64,').pop();
             const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
             const extPdf = await PDFDocument.load(bytes);
             const copiedPages = await pdfDoc.copyPages(extPdf, extPdf.getPageIndices());
             copiedPages.forEach((p) => {
                const newP = pdfDoc.addPage(p);
                newP.drawText(`Lampiran Transaction Status`, { x: 10, y: 10, size: 10, font, color: rgb(1,0,0) });
             });
          } catch (err) {
             console.error('Failed merging Transaction Status PDF', err);
          }
       }

       // 3. Merge Documents (Nota, Foto, Absensi)
       for (const evt of completedEvents) {
          const files = evt.report?.files;
          if (files) {
             for (const fType of ['nota', 'foto', 'absensi']) {
                const fileData = files[fType];
                if (!fileData) continue;
                
                const fileArray = Array.isArray(fileData) ? fileData : [fileData];
                for (let i = 0; i < fileArray.length; i++) {
                   const fileObj = fileArray[i];
                   if (!fileObj || typeof fileObj === 'string') continue;

                   try {
                      const base64Data = fileObj.data.split(';base64,').pop();
                      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                      const labelCounter = fileArray.length > 1 ? ` ${i + 1}` : '';

                      if (fileObj.type === 'application/pdf') {
                         const extPdf = await PDFDocument.load(bytes);
                         const copiedPages = await pdfDoc.copyPages(extPdf, extPdf.getPageIndices());
                         copiedPages.forEach((p) => {
                            const newP = pdfDoc.addPage(p);
                            newP.drawText(`Lampiran ${fType.toUpperCase()}${labelCounter} - ${evt.sport_type}`, { x: 10, y: 10, size: 10, font, color: rgb(1,0,0) });
                         });
                      } else if (fileObj.type.startsWith('image/')) {
                         let img;
                         if (fileObj.type === 'image/jpeg' || fileObj.type === 'image/jpg') {
                            img = await pdfDoc.embedJpg(bytes);
                         } else if (fileObj.type === 'image/png') {
                            img = await pdfDoc.embedPng(bytes);
                         }

                         if (img) {
                            const imgPage = pdfDoc.addPage([595.28, 841.89]); // Portrait
                            imgPage.drawText(`LAMPIRAN: ${fType.toUpperCase()}${labelCounter} - ${evt.sport_type}`, { x: 50, y: 800, size: 14, font: fontBold });

                            const { width: iW, height: iH } = img.scaleToFit(495.28, 700);
                            imgPage.drawImage(img, {
                               x: 50 + (495.28 - iW) / 2,
                               y: 400 - iH / 2 + 30,
                               width: iW,
                               height: iH
                            });
                         }
                      }
                   } catch(err) {
                      console.error(`Failed merging ${fType} item ${i}`, err);
                   }
                }
             }
          }
       }

       const pdfBytes = await pdfDoc.save();
       const blob = new Blob([pdfBytes], { type: 'application/pdf' });
       const url = window.URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       
       const filenameSafeArea = filterArea.replace(/[^a-z0-9]/gi, '_').toLowerCase();
       link.download = `Laporan_${reportPeriodType}_${filenameSafeArea}_${new Date().getTime()}.pdf`;
       
       document.body.appendChild(link);
       link.click();
       link.remove();
       window.URL.revokeObjectURL(url);
       ctx.showToast('Laporan PDF berhasil disusun dan diunduh!', 'success');
    } catch(err) {
       console.error(err);
       ctx.showToast('Terjadi kesalahan saat merakit file PDF.', 'error');
    } finally {
       setIsGeneratingPdf(false);
    }
  };

  const handleTransactionPdfUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
      if(file.type !== 'application/pdf') {
         ctx.showToast('Hanya file PDF yang diizinkan untuk status transaksi!', 'error');
         return;
      }
      setTransactionPdfFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setTransactionPdfUrl(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-2 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center"><FileText className="mr-3 text-purple-600 w-8 h-8" /> Tarikan Laporan PDF</h2>
          <p className="text-slate-500 mt-1">Susun dan gabungkan dokumen bukti realisasi kegiatan menjadi satu file PDF yang rapi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Filter & Setting (Sticky) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-28">
            <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center border-b pb-3"><Filter className="w-5 h-5 mr-2 text-blue-500"/> Parameter Laporan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Area / Cabang</label>
                <select value={filterArea} onChange={(e) => {setFilterArea(e.target.value); setFilterPic('all');}} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-slate-50">
                  <option value="all">Semua Area</option>
                  <option value={AREA_HO}>{AREA_HO}</option>
                  {ctx.branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">PIC / Program</label>
                <select value={filterPic} onChange={(e) => setFilterPic(e.target.value)} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-slate-50">
                  <option value="all">Semua PIC</option>
                  {ctx.accounts.filter(a => a.role === ROLES.PIC && (filterArea === 'all' || a.area === filterArea)).map(pic => <option key={pic.id} value={pic.id}>{pic.sport} ({pic.name})</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipe Periode</label>
                  <select value={reportPeriodType} onChange={(e) => setReportPeriodType(e.target.value)} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-slate-50">
                    <option value="Mingguan">Mingguan</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Bulanan">Bulanan</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Waktu</label>
                  {reportPeriodType === 'Bulanan' ? (
                    <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-slate-50" />
                  ) : (
                    <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-slate-50" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-emerald-500"/> Setup Anggaran</h3>
              
              <label className="block text-xs font-bold text-slate-500 mb-1">Total Plafon Budget Master (Rp)</label>
              <input type="number" placeholder="Contoh: 50000000" value={masterBudget} onChange={(e) => setMasterBudget(Number(e.target.value) || '')} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 mb-4 bg-slate-50" />

              {masterBudget !== '' && availableForDeduction.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Potong dengan Realisasi Sebelumnya:</label>
                  <div className="max-h-32 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 custom-scrollbar">
                     {availableForDeduction.map((e) => {
                        const cost = e.report?.actual_cost || calculateTotalBudget(e.budget_items || []);
                        return (
                           <label key={e.id} className="flex items-start text-xs text-slate-700 cursor-pointer font-semibold hover:bg-slate-100 p-1 rounded">
                              <input type="checkbox" checked={deductedEventIds.has(e.id)} onChange={() => toggleDeduction(e.id)} className="mr-2 mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
                              <span>{new Date(e.event_date).toLocaleDateString('id-ID')} - {e.sport_type} <br/><span className="text-emerald-600">(Rp {cost.toLocaleString('id-ID')})</span></span>
                           </label>
                        )
                     })}
                  </div>
                </div>
              )}

              <label className="block text-xs font-bold text-slate-500 mb-1">Balance Start Laporan Ini (Rp)</label>
              <input type="number" value={totalBudget} onChange={(e) => setTotalBudget(Number(e.target.value) || '')} className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 mb-4 bg-emerald-50 text-emerald-900" />
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 mb-2">Upload Transaction Status PDF (Opsional)</label>
              <input type="file" accept="application/pdf" onChange={handleTransactionPdfUpload} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer" />
              {transactionPdfFile && <p className="text-xs text-emerald-600 font-bold mt-2 truncate">Terlampir: {transactionPdfFile.name}</p>}
            </div>

            <button 
               onClick={handleDownloadPDF} 
               disabled={isGeneratingPdf || selectedIds.size === 0} 
               className={`w-full mt-8 bg-purple-600 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg flex items-center justify-center ${isGeneratingPdf || selectedIds.size === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}>
               {isGeneratingPdf ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileText className="w-5 h-5 mr-2" />}
               {isGeneratingPdf ? 'Memproses PDF...' : `Generate PDF (${selectedIds.size} Data)`}
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Daftar Kegiatan untuk dipilih */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-slate-800">Pilih Data Untuk Dimasukkan ke Laporan</h3>
                <p className="text-xs text-slate-500 mt-1">Daftar kegiatan yang berstatus 'Selesai' sesuai filter di samping.</p>
              </div>
              <div className="text-right">
                <span className="bg-purple-100 text-purple-800 font-black px-3 py-1.5 rounded-lg text-sm border border-purple-200">
                  {selectedIds.size} Terpilih
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-grow max-h-[800px] custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-slate-200">
                    <th className="p-4 font-black text-slate-500 text-xs w-12 text-center">
                      <input type="checkbox" onChange={handleSelectAll} checked={displayEvents.length > 0 && selectedIds.size === displayEvents.length} className="w-4 h-4 cursor-pointer" />
                    </th>
                    <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-wider">Info Kegiatan</th>
                    <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-wider text-right">Realisasi (Rp)</th>
                    <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-wider text-center">Lampiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayEvents.length === 0 && (
                    <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold">Tidak ada data selesai pada periode/filter ini.</td></tr>
                  )}
                  {displayEvents.map((evt) => {
                    const pic = ctx.accounts.find(a => a.id === evt.pic_id);
                    const area = pic?.area || AREA_HO;
                    const actualCost = evt.report?.actual_cost || calculateTotalBudget(evt.budget_items || []);
                    
                    const files = evt.report?.files || {};
                    const fileCount = (Array.isArray(files.nota)?files.nota.length:(files.nota?1:0)) + 
                                      (Array.isArray(files.foto)?files.foto.length:(files.foto?1:0)) + 
                                      (Array.isArray(files.absensi)?files.absensi.length:(files.absensi?1:0));

                    return (
                      <tr key={evt.id} className={`transition-colors cursor-pointer ${selectedIds.has(evt.id) ? 'bg-purple-50/50' : 'hover:bg-slate-50'}`} onClick={() => toggleSelect(evt.id)}>
                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(evt.id)} onChange={() => toggleSelect(evt.id)} className="w-4 h-4 cursor-pointer" />
                        </td>
                        <td className="p-4">
                          <p className="font-black text-blue-900">{evt.sport_type}</p>
                          <p className="text-xs font-bold text-slate-600 mt-1">{new Date(evt.event_date).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})} • {area}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{evt.venue_name}</p>
                        </td>
                        <td className="p-4 font-black text-emerald-600 text-right">{formatCurrency(actualCost)}</td>
                        <td className="p-4 text-center">
                           <span className="inline-flex items-center bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">
                             <Paperclip className="w-3 h-3 mr-1"/> {fileCount} File
                           </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 6. Master Data & Pengaturan Jadwal
const ViewMasterData = ({ ctx }) => {
  const [tab, setTab] = useState('pic');
  const [newAcc, setNewAcc] = useState({ 
    name: '', username: '', division: '', sport: '', area: AREA_HO,
    day: 'Senin', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 0, adminFee: 0 
  });
  
  const [editingProgId, setEditingProgId] = useState(null);
  const [editProgData, setEditProgData] = useState({});

  // Cabang Management State
  const [newBranch, setNewBranch] = useState('');

  const handleAddPIC = async (e) => {
    e.preventDefault();
    if (!newAcc.name || !newAcc.username || !newAcc.sport) return ctx.showToast('Harap lengkapi Nama, Username, dan Cabang Olahraga!', 'error');
    if (ctx.accounts.find((a) => a.username === newAcc.username.toLowerCase())) return ctx.showToast('Username sudah digunakan, pilih yang lain.', 'error');

    const newPicAccount = {
      id: generateId(), role: ROLES.PIC, password: '123', 
      name: newAcc.name, username: newAcc.username.toLowerCase(),
      division: newAcc.division, sport: newAcc.sport, area: newAcc.area
    };
    
    // Tanam histori budget awal
    const defaultLimit = (Number(newAcc.costPerSession) + Number(newAcc.adminFee)) * Number(newAcc.freqNum);
    const newProgram = {
      id: generateId(), sport: newAcc.sport, day: newAcc.day, area: newAcc.area,
      freqText: newAcc.freqText, freqNum: Number(newAcc.freqNum),
      costPerSession: Number(newAcc.costPerSession), adminFee: Number(newAcc.adminFee),
      budget_history: [{
        effective_month: '2020-01', 
        costPerSession: Number(newAcc.costPerSession), adminFee: Number(newAcc.adminFee), freqNum: Number(newAcc.freqNum),
        limit: defaultLimit
      }]
    };

    try {
      await ctx.addAccount(newPicAccount);
      await ctx.addProgram(newProgram);
      setNewAcc({ name: '', username: '', division: '', sport: '', area: AREA_HO, day: 'Senin', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 0, adminFee: 0 });
      ctx.showToast('Akun PIC dan Jadwal Program berhasil dibuat!', 'success');
    } catch(err) {
      ctx.showToast('Gagal menambahkan data PIC.', 'error');
    }
  };

  const deleteAccount = async (id) => {
    if(window.confirm('Yakin ingin menghapus PIC ini?')) {
      try { await ctx.deleteAccount(id); ctx.showToast('Akun berhasil dihapus.', 'success'); } 
      catch (error) { ctx.showToast('Gagal menghapus data.', 'error'); }
    }
  };

  const handleDeleteProgram = async (id) => {
    if(window.confirm('PERINGATAN: Yakin ingin menghapus master jadwal & anggaran ini secara permanen? Hal ini akan memengaruhi metrik target.')) {
      try { await ctx.deleteProgram(id); ctx.showToast('Jadwal program dan limit anggaran dihapus.', 'success'); } 
      catch (error) { ctx.showToast('Gagal menghapus data program.', 'error'); }
    }
  };

  const startEditProg = (prog) => {
    setEditingProgId(prog.id);
    const currentYm = new Date().toISOString().slice(0, 7);
    const activeRules = getActiveProgramRules(prog, currentYm);
    
    setEditProgData({ 
      ...prog, 
      costPerSession: activeRules.costPerSession,
      adminFee: activeRules.adminFee,
      freqNum: activeRules.freqNum,
      effective_month: currentYm 
    });
  };

  const saveProg = async () => {
    const effMonth = editProgData.effective_month || new Date().toISOString().slice(0,7);
    const newLimit = (Number(editProgData.costPerSession) + Number(editProgData.adminFee)) * Number(editProgData.freqNum);
    
    let hist = editProgData.budget_history ? [...editProgData.budget_history] : [];
    
    if (hist.length === 0) {
      const oldProg = ctx.programs.find((p) => p.id === editingProgId);
      if (oldProg) {
        hist.push({
          effective_month: '2020-01',
          costPerSession: oldProg.costPerSession, adminFee: oldProg.adminFee, freqNum: oldProg.freqNum,
          limit: (Number(oldProg.costPerSession) + Number(oldProg.adminFee)) * Number(oldProg.freqNum)
        });
      }
    }

    hist = hist.filter(h => h.effective_month !== effMonth);
    
    hist.push({
      effective_month: effMonth,
      costPerSession: Number(editProgData.costPerSession), adminFee: Number(editProgData.adminFee), freqNum: Number(editProgData.freqNum),
      limit: newLimit
    });

    const finalData = {
      ...editProgData,
      budget_history: hist,
      costPerSession: Number(editProgData.costPerSession), adminFee: Number(editProgData.adminFee), freqNum: Number(editProgData.freqNum)
    };

    try {
      await ctx.updateProgram(editingProgId, finalData);
      setEditingProgId(null);
      ctx.showToast('Anggaran baru tersimpan! Data lama tetap aman via Histori.', 'success');
    } catch (error) {
      ctx.showToast('Gagal memperbarui program.', 'error');
    }
  };

  const deleteHistory = async (progId, effMonth) => {
    if(!window.confirm(`Hapus aturan anggaran yang berlaku mulai ${effMonth}?`)) return;
    const prog = ctx.programs.find((p) => p.id === progId);
    const newHist = prog.budget_history.filter((h) => h.effective_month !== effMonth);
    try {
      await ctx.updateProgram(progId, { budget_history: newHist });
      if (editingProgId === progId) setEditProgData({ ...editProgData, budget_history: newHist });
      ctx.showToast('Riwayat aturan berhasil dihapus.', 'success');
    } catch(err) { ctx.showToast('Gagal menghapus riwayat.', 'error'); }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if(!newBranch) return;
    try {
      await ctx.addBranch({ id: generateId(), name: newBranch });
      setNewBranch('');
      ctx.showToast('Cabang baru berhasil ditambahkan.', 'success');
    } catch(err) { ctx.showToast('Gagal menambah cabang.', 'error'); }
  };

  const handleDeleteBranch = async (id) => {
    if(window.confirm('Hapus cabang ini? Pastikan tidak ada PIC yang masih menggunakan area ini.')) {
      try {
        await ctx.deleteBranch(id);
        ctx.showToast('Cabang dihapus.', 'success');
      } catch(err) { ctx.showToast('Gagal menghapus.', 'error'); }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center"><Settings className="mr-3 text-blue-600 w-8 h-8" /> Pengaturan Master Data</h2>
      
      <div className="flex space-x-4 border-b border-slate-200 mb-8 overflow-x-auto custom-scrollbar">
        <button onClick={() => setTab('pic')} className={`pb-3 px-4 font-black border-b-4 transition-colors whitespace-nowrap ${tab === 'pic' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400'}`}>Manajemen Akun PIC</button>
        <button onClick={() => setTab('program')} className={`pb-3 px-4 font-black border-b-4 transition-colors whitespace-nowrap ${tab === 'program' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400'}`}>Edit Jadwal & Anggaran</button>
        <button onClick={() => setTab('cabang')} className={`pb-3 px-4 font-black border-b-4 transition-colors whitespace-nowrap ${tab === 'cabang' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400'}`}>Area & Cabang</button>
      </div>

      {tab === 'pic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-28">
              <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-emerald-600"/> Tambah PIC & Program Baru</h3>
              <form onSubmit={handleAddPIC} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">1. Data Personil (PIC)</p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap PIC</label>
                    <input type="text" required value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Cth: Budi Raharjo" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username Login</label>
                    <input type="text" required value={newAcc.username} onChange={e => setNewAcc({...newAcc, username: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Tanpa spasi" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Area Penempatan</label>
                      <select value={newAcc.area} onChange={e => setNewAcc({...newAcc, area: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm bg-white">
                        <option value={AREA_HO}>{AREA_HO}</option>
                        {ctx.branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Divisi</label>
                      <input type="text" value={newAcc.division} onChange={e => setNewAcc({...newAcc, division: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Cth: IT Support" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cabang Olahraga (Wajib)</label>
                    <input type="text" required value={newAcc.sport} onChange={e => setNewAcc({...newAcc, sport: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold text-blue-900" placeholder="Cth: Tenis Meja" />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                  <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">2. Setup Jadwal & Anggaran Awal</p>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hari</label>
                      <select className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm" value={newAcc.day} onChange={e => setNewAcc({...newAcc, day: e.target.value})}>
                        {['Senin','Selasa','Rabu','Kamis','Jumat','Random'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="w-2/3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teks Rutinitas</label>
                      <input type="text" className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm" placeholder="Cth: Setiap Minggu" value={newAcc.freqText} onChange={e => setNewAcc({...newAcc, freqText: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jml Frekuensi per Bulan</label>
                    <input type="number" className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm" value={newAcc.freqNum} onChange={e => setNewAcc({...newAcc, freqNum: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Biaya /Sesi</label>
                      <input type="number" className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm" value={newAcc.costPerSession} onChange={e => setNewAcc({...newAcc, costPerSession: e.target.value})} />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Admin Transfer</label>
                      <input type="number" className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm" value={newAcc.adminFee} onChange={e => setNewAcc({...newAcc, adminFee: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-bold text-slate-500 text-center">
                  *Password default PIC: <span className="text-red-500">123</span>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-md hover:-translate-y-0.5 transition-all">Buat PIC & Program</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center"><Users className="w-5 h-5 mr-2 text-blue-600"/> Daftar Akun PIC Terdaftar</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Nama & Divisi</th>
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Area</th>
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Username</th>
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Cabang Olahraga</th>
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ctx.accounts.filter((a) => a.role === ROLES.PIC).map((pic) => (
                      <tr key={pic.id} className="hover:bg-blue-50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-800 text-sm">{pic.name}</p>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">{pic.division || '-'}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-600 text-sm"><Map className="w-3 h-3 inline mr-1 text-slate-400"/>{pic.area || AREA_HO}</td>
                        <td className="p-4 font-bold text-slate-600 text-sm">{pic.username}</td>
                        <td className="p-4"><span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs font-black px-3 py-1 rounded-lg">{pic.sport}</span></td>
                        <td className="p-4 text-center">
                          <button onClick={() => deleteAccount(pic.id)} className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'cabang' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center mb-5"><Map className="w-5 h-5 mr-2 text-blue-600"/> Tambah Area/Cabang Baru</h3>
            <form onSubmit={handleAddBranch} className="flex gap-3">
              <input type="text" value={newBranch} onChange={e => setNewBranch(e.target.value)} placeholder="Nama Cabang (Cth: Cabang Surabaya)" className="flex-grow p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500" required />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 rounded-xl transition-colors whitespace-nowrap">Tambah</button>
            </form>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center">Daftar Cabang Aktif</h3>
             </div>
             <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
                <li className="p-4 flex justify-between items-center bg-slate-50/50">
                  <span className="font-bold text-slate-800 flex items-center"><MapPin className="w-4 h-4 mr-2 text-slate-400"/> {AREA_HO} (Head Office)</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">Default Sistem</span>
                </li>
                {ctx.branches.map(b => (
                  <li key={b.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="font-bold text-slate-800 flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-500"/> {b.name}</span>
                    <button onClick={() => handleDeleteBranch(b.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                  </li>
                ))}
             </ul>
          </div>
        </div>
      )}

      {tab === 'program' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-black text-slate-800 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-indigo-600"/> Jadwal Master & Plafon Anggaran Bulanan</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">Menggunakan Aturan Bulan: <b>{new Date().toISOString().slice(0, 7)} (Bulan Ini)</b></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider w-1/5">Program & Area</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider w-1/6">Jadwal (Hari)</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider w-1/5">Frekuensi /Bulan</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Biaya /Sesi</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider text-right">Plafon (Aktif)</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ctx.programs.map((prog) => {
                  const isEditing = editingProgId === prog.id;
                  const currentYm = new Date().toISOString().slice(0, 7);
                  const activeRules = getActiveProgramRules(prog, currentYm);
                  const currentLimit = getProgramLimitForMonth(prog, currentYm);

                  return (
                    <React.Fragment key={prog.id}>
                      {!isEditing && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="font-black text-blue-900">{prog.sport}</span>
                            <br/><span className="text-xs font-bold text-slate-500">{prog.area || AREA_HO}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">{prog.day}</td>
                          <td className="p-4">
                            <span className="font-bold text-slate-700">{prog.freqText}</span> <span className="text-xs text-slate-400">({activeRules.freqNum}x)</span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">{formatCurrency(activeRules.costPerSession)}</td>
                          <td className="p-4 font-black text-emerald-700 text-right">{formatCurrency(currentLimit)}</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <button onClick={() => startEditProg(prog)} className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors"><Edit3 size={16}/></button>
                            <button onClick={() => handleDeleteProgram(prog.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-colors ml-2"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      )}

                      {isEditing && (
                        <tr className="bg-indigo-50/60 border-y-2 border-indigo-200">
                          <td colSpan="6" className="p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h4 className="font-black text-indigo-900 text-lg flex items-center"><Edit3 className="w-5 h-5 mr-2"/> Set Anggaran & Jadwal: {prog.sport} ({prog.area || AREA_HO})</h4>
                                <button onClick={() => setEditingProgId(null)} className="text-slate-400 hover:bg-red-100 hover:text-red-500 p-2 rounded-full transition-colors"><XCircle className="w-6 h-6"/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Setting Anggaran Editor */}
                              <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
                                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2 mb-4">1. Parameter Anggaran</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jadwal Hari</label>
                                    <select className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-indigo-400" value={editProgData.day} onChange={e => setEditProgData({...editProgData, day: e.target.value})}>
                                      {['Senin','Selasa','Rabu','Kamis','Jumat','Random'].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teks Rutinitas</label>
                                    <input type="text" className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-indigo-400" value={editProgData.freqText} onChange={e => setEditProgData({...editProgData, freqText: e.target.value})} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jml Frekuensi (Pengali)</label>
                                  <input type="number" className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-indigo-400" value={editProgData.freqNum} onChange={e => setEditProgData({...editProgData, freqNum: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Biaya Vendor/Sesi</label>
                                    <input type="number" className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-indigo-400" value={editProgData.costPerSession} onChange={e => setEditProgData({...editProgData, costPerSession: e.target.value})} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Biaya Admin Trx</label>
                                    <input type="number" className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-indigo-400" value={editProgData.adminFee} onChange={e => setEditProgData({...editProgData, adminFee: e.target.value})} />
                                  </div>
                                </div>
                              </div>

                              {/* Rule Periode Editor */}
                              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                                <div>
                                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2 mb-4">2. Masa Berlaku & Snapshot</p>
                                  <label className="block text-sm font-black text-slate-700 mb-2">Perubahan ini Berlaku Mulai:</label>
                                  <input type="month" className="w-full p-4 border-2 border-emerald-100 rounded-xl text-lg font-black outline-none focus:border-emerald-500 text-emerald-900 bg-emerald-50/50" value={editProgData.effective_month} onChange={e => setEditProgData({...editProgData, effective_month: e.target.value})} />
                                  <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">Bulan sebelumnya akan otomatis dibekukan menggunakan nilai historis lamanya agar tidak merusak data dasbor masa lalu. Anggaran baru akan jadi *default* untuk bulan terpilih dan seterusnya.</p>
                                </div>
                                <button onClick={saveProg} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all mt-6 flex justify-center items-center"><Save className="w-5 h-5 mr-2" /> Terapkan & Simpan Anggaran</button>
                              </div>
                            </div>

                            {/* Tampilan Riwayat yang ada */}
                            <div className="mt-8">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Manajemen Riwayat Anggaran Bulanan</p>
                              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                {(prog.budget_history || [{ effective_month: '2024-01', limit: (Number(prog.costPerSession)+Number(prog.adminFee))*Number(prog.freqNum) }])
                                  .sort((a, b) => b.effective_month.localeCompare(a.effective_month))
                                  .map((h, i) => (
                                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 min-w-[200px] shadow-sm relative group flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">{h.effective_month}</span>
                                      <button onClick={() => deleteHistory(prog.id, h.effective_month)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                    <span className="font-black text-slate-800 text-lg tracking-tight">{formatCurrency(h.limit || (Number(h.costPerSession)+Number(h.adminFee))*Number(h.freqNum))}</span>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1">Default plafon aktif</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                <tr className="bg-blue-50/50">
                  <td colSpan="4" className="p-5 font-black text-right text-blue-900 uppercase tracking-widest text-xs">Total Target Plafon ({new Date().toISOString().slice(0, 7)})</td>
                  <td className="p-5 font-black text-xl text-blue-900 text-right">
                    {formatCurrency(ctx.programs.reduce((acc, p) => acc + getProgramLimitForMonth(p, new Date().toISOString().slice(0, 7)), 0))}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


// --- MAIN APP WRAPPER ---
export default function App() {
  const [user, setUser] = useState(null);
  const [fbUser, setFbUser] = useState(null); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [events, setEvents] = useState([]); 
  const [accounts, setAccounts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [view, setView] = useState('dashboard');
  
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [detailModalEvent, setDetailModalEvent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  const openPreview = (fileObj) => setPreviewFile(fileObj);
  const openModal = (evt) => setDetailModalEvent(evt);

  // 1. FIREBASE: Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  // 2. FIREBASE: Data Sync
  useEffect(() => {
    if (!fbUser) return;

    let unsubEvents = () => {};
    let unsubAccounts = () => {};
    let unsubPrograms = () => {};
    let unsubBranches = () => {};

    try {
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
      const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
      const programsRef = collection(db, 'artifacts', appId, 'public', 'data', 'programs');
      const branchesRef = collection(db, 'artifacts', appId, 'public', 'data', 'branches');

      let eventsLoaded = false;
      let accountsLoaded = false;
      let programsLoaded = false;
      let branchesLoaded = false;

      const checkAllLoaded = () => {
        if (eventsLoaded && accountsLoaded && programsLoaded && branchesLoaded) {
          setIsDataLoaded(true);
        }
      }

      unsubEvents = onSnapshot(eventsRef, (snap) => {
        setEvents(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        eventsLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Events err", err); eventsLoaded = true; checkAllLoaded(); });

      unsubAccounts = onSnapshot(accountsRef, (snap) => {
        setAccounts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        accountsLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Accounts err", err); accountsLoaded = true; checkAllLoaded(); });

      unsubPrograms = onSnapshot(programsRef, (snap) => {
        setPrograms(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        programsLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Programs err", err); programsLoaded = true; checkAllLoaded(); });

      unsubBranches = onSnapshot(branchesRef, (snap) => {
        setBranches(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        branchesLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Branches err", err); branchesLoaded = true; checkAllLoaded(); });

    } catch (error) {
      console.error("Firestore setup error:", error);
    }

    return () => { unsubEvents(); unsubAccounts(); unsubPrograms(); unsubBranches(); };
  }, [fbUser]);

  // 3. FIREBASE: Auto-Seed Initial Data if Database is completely empty
  useEffect(() => {
    if (isDataLoaded && accounts.length === 0 && fbUser) {
      const seedDatabase = async () => {
        for (const br of INITIAL_BRANCHES) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'branches', br.id), br);
        }
        for (const acc of INITIAL_ACCOUNTS) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', acc.id), acc);
        }
        for (const prog of INITIAL_PROGRAMS) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', prog.id), prog);
        }
      };
      seedDatabase();
    }
  }, [isDataLoaded, accounts.length, fbUser]);

  // --- CLOUD MUTATION FUNCTIONS ---
  const addEvent = async (newEvent) => {
    setEvents(prev => [...prev, newEvent]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', newEvent.id), newEvent); } catch(e) {}
  };
  const updateEvent = async (id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), updates); } catch(e) {}
  };
  const deleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id)); } catch(e) {}
  };
  
  const addAccount = async (newAcc) => {
    setAccounts(prev => [...prev, newAcc]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', newAcc.id), newAcc); } catch(e) {}
  };
  const deleteAccount = async (id) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', id)); } catch(e) {}
  };
  
  const addProgram = async (newProg) => {
    setPrograms(prev => [...prev, newProg]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', newProg.id), newProg); } catch(e) {}
  };
  const updateProgram = async (id, updates) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', id), updates); } catch(e) {}
  };
  const deleteProgram = async (id) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', id)); } catch(e) {}
  };

  const addBranch = async (newBranch) => {
    setBranches(prev => [...prev, newBranch]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'branches', newBranch.id), newBranch); } catch(e) {}
  };
  const deleteBranch = async (id) => {
    setBranches(prev => prev.filter(b => b.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'branches', id)); } catch(e) {}
  };

  const ctx = { 
    user, setUser, 
    events, addEvent, updateEvent, deleteEvent, 
    view, setView, 
    accounts, addAccount, deleteAccount, 
    programs, addProgram, updateProgram, deleteProgram,
    branches, addBranch, deleteBranch,
    showToast, openPreview, openModal 
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center border border-slate-100">
          <HeartPulse className="w-16 h-16 text-red-500 animate-pulse mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Sinkronisasi Cloud...</h2>
          <p className="text-sm font-medium text-slate-500 mb-6">Menghubungkan sistem ke database real-time.</p>
          <div className="w-full flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return (
    <>
      <LoginScreen ctx={ctx} />
      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center z-[100] text-white animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-6 h-6 mr-3" />}
          <p className="font-bold">{toast.msg}</p>
        </div>
      )}
    </>
  );

  const adminPendingAction = events.filter(e => ['pending_approval', 'pending_settlement'].includes(e.status)).length;

  const NavBtn = ({ id, label, icon, badge }) => (
    <button onClick={() => setView(id)} className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all relative whitespace-nowrap ${view === id ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
      {icon} <span className="ml-2.5 hidden lg:block">{label}</span>
      {badge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-sm border-2 border-white animate-pulse">{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 selection:bg-blue-200 relative">
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-red-50 p-2 rounded-lg border border-red-100"><HeartPulse className="text-red-600 w-6 h-6" /></div>
          <h1 className="text-xl font-black text-slate-800 hidden xl:block tracking-tight">Meratus <span className="text-blue-600">Happiness</span></h1>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0 flex-grow justify-end">
          <div className="flex space-x-2 mr-4 border-r border-slate-200 pr-4">
            <NavBtn id="dashboard" label="Dashboard" icon={<PieChart size={18} />} />
            {user.role === ROLES.PIC && (
              <>
                <NavBtn id="reporting" label="Buat Laporan" icon={<Upload size={18} />} />
              </>
            )}
            {user.role === ROLES.ADMIN && (
              <>
                <NavBtn id="approvals" label="Validasi" icon={<CheckSquare size={18} />} badge={adminPendingAction} />
                <NavBtn id="pdf_report" label="Tarikan PDF" icon={<FileText size={18} />} />
                <NavBtn id="master_data" label="Pengaturan" icon={<Settings size={18} />} />
              </>
            )}
            <NavBtn id="database" label="Arsip Data" icon={<Database size={18} />} />
          </div>
          <div className="flex items-center pl-2 flex-shrink-0">
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-sm font-black text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{user.role === ROLES.ADMIN ? 'Admin Pusat' : `PIC ${user.sport} (${user.area})`}</p>
            </div>
            <button onClick={() => { setUser(null); setView('dashboard'); }} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors shadow-sm">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <main className="p-4 md:p-8 relative">
        {view === 'dashboard' && <ViewDashboard ctx={ctx} />}
        {view === 'reporting' && <ViewReporting ctx={ctx} />}
        {view === 'approvals' && <ViewAdminApprovals ctx={ctx} />}
        {view === 'pdf_report' && <ViewPDFReport ctx={ctx} />}
        {view === 'database' && <ViewDatabase ctx={ctx} />}
        {view === 'master_data' && <ViewMasterData ctx={ctx} />}
      </main>

      {/* Global Modals */}
      <EventDetailModal event={detailModalEvent} onClose={() => setDetailModalEvent(null)} ctx={ctx} />
      <FilePreviewModal fileObj={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Global Toast */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center z-[100] text-white animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-6 h-6 mr-3" /> : <CheckCircle className="w-6 h-6 mr-3" />}
          <p className="font-bold">{toast.msg}</p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}} />
    </div>
  );
}
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Calendar, MapPin, DollarSign, Activity, CheckCircle, XCircle,
  Upload, PieChart, HeartPulse, CheckSquare, Plus, ArrowRight,
  Lock, User, FileCheck, Eye, LogOut, Star, Database, FileText,
  AlertCircle, BarChart3, Paperclip, MessageSquare, Target, Trash2, 
  Search, Filter, TrendingUp, Users, Settings, UserPlus, Download,
  BellRing, CalendarDays, Edit3, Save, Layers, ListFilter, Clock, Loader2
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

// jsPDF Injection untuk konversi Image ke PDF Otomatis
if (typeof window !== 'undefined' && !document.getElementById('jspdf-cdn')) {
  const script = document.createElement('script');
  script.id = 'jspdf-cdn';
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
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

const rawAppId = typeof __app_id !== 'undefined' ? String(__app_id) : 'meratus-happiness-app';
const appId = rawAppId.split('/')[0];

// --- CONSTANTS & INITIAL SEED DATA ---
const ROLES = { PIC: 'pic_olahraga', ADMIN: 'admin_approver' };

const INITIAL_ACCOUNTS = [
  { id: 'admin', username: 'admin', password: '123', role: ROLES.ADMIN, name: 'Admin Pusat', division: 'Pusat' },
  { id: 'a2', username: 'meliza', password: '123', role: ROLES.PIC, name: 'Meliza Latuputty', division: 'Liner Commercial', sport: 'Badminton' },
  { id: 'a3', username: 'pambudi', password: '123', role: ROLES.PIC, name: 'Pambudi Laksono', division: 'Liner Commercial', sport: 'Futsal' },
  { id: 'a4', username: 'intan', password: '123', role: ROLES.PIC, name: 'Intan Rekyan', division: 'Doc & Invoice', sport: 'Basket' },
  { id: 'a5', username: 'yugo', password: '123', role: ROLES.PIC, name: 'Yugo Adi Prawira', division: 'Asset & Charter', sport: 'Yoga, Zumba, Poundfit' },
];

const INITIAL_PROGRAMS = [
  { id: 'p1', sport: 'Badminton', day: 'Senin', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 480000, adminFee: 6500 },
  { id: 'p2', sport: 'Futsal', day: 'Selasa', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 300000, adminFee: 6500 },
  { id: 'p3', sport: 'Basket', day: 'Selasa', freqText: '2 Kali Sebulan', freqNum: 2, costPerSession: 706000, adminFee: 12500 },
  { id: 'p4', sport: 'Yoga, Zumba, Poundfit', day: 'Jumat', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 500000, adminFee: 6500 }
];

const INITIAL_EVENTS = [
  {
    id: 'evt1', pic_id: 'a3', sport_type: 'Futsal', event_date: '2026-05-20T19:00', venue_name: 'Futsal Surabaya', status: 'pending_approval',
    objective: 'Pertandingan persahabatan antar divisi Commercial dan Operasional.',
    participants: [{ id: 'p1', name: 'Andrew', dept: 'SBU' }, { id: 'p2', name: 'Ghofil', dept: 'SFU' }, { id: 'p3', name: 'Andi', dept: 'SBU' }, { id: 'p4', name: 'Budi', dept: 'SBU' }, { id: 'p5', name: 'Cici', dept: 'SFU' }, { id: 'p6', name: 'Dodi', dept: 'SFU' }, { id: 'p7', name: 'Eka', dept: 'SBU' }], 
    budget_items: [{ desc: 'Sewa Lapangan (2 Jam)', qty: 1, unit: 'Sesi', price: 300000 }, { desc: 'Biaya Admin', qty: 1, unit: 'Trx', price: 6500 }]
  },
  {
    id: 'evt2', pic_id: 'a2', sport_type: 'Badminton', event_date: '2026-05-18T18:00', venue_name: 'Lapangan Badminton Sudirman', status: 'funded',
    objective: 'Latihan rutin mingguan.',
    participants: Array(8).fill(0).map((_,i) => ({ id: `p${10+i}`, name: `Pemain ${i+1}`, dept: 'SBU' })), 
    budget_items: [{ desc: 'Sewa Lapangan', qty: 1, unit: 'Sesi', price: 480000 }, { desc: 'Admin', qty: 1, unit: 'Trx', price: 6500 }]
  },
  {
    id: 'evt3', pic_id: 'a5', sport_type: 'Yoga, Zumba, Poundfit', event_date: '2026-05-01T16:30', venue_name: 'Studio Yoga HO Meratus', status: 'pending_settlement',
    objective: 'Relaksasi karyawan bulanan.',
    participants: Array(10).fill(0).map((_,i) => ({ id: `p${20+i}`, name: `Peserta ${i+1}`, dept: 'SFU' })), 
    budget_items: [{ desc: 'Instruktur Yoga', qty: 1, unit: 'Sesi', price: 500000 }, { desc: 'Admin', qty: 1, unit: 'Trx', price: 6500 }],
    report: { actual_cost: 506500, attended: 10, notes: 'Instruktur datang tepat waktu.', rating: 5, files: { nota: 'inv_yoga.pdf', absensi: 'absen.jpg', foto: 'doc_yoga.jpg' } }
  },
  {
    id: 'evt4', pic_id: 'a3', sport_type: 'Futsal', event_date: '2026-04-15T19:00', venue_name: 'Futsal Surabaya', status: 'completed',
    objective: 'Latihan mingguan.', budget_items: [{ desc: 'Sewa Lapangan', qty: 1, unit: 'Sesi', price: 300000 }, { desc: 'Admin', qty: 1, unit: 'Trx', price: 6500 }],
    report: { actual_cost: 306500, attended: 12, notes: 'Berjalan lancar dan seru.', rating: 4, files: { nota: 'inv_futsal.pdf', foto: 'doc.jpg' } }
  },
  {
    id: 'evt5', pic_id: 'a2', sport_type: 'Badminton', event_date: '2026-02-10T18:00', venue_name: 'Badminton Sudirman', status: 'completed',
    objective: 'Persiapan turnamen.', budget_items: [{ desc: 'Sewa 2 Lapangan', qty: 1, unit: 'Sesi', price: 480000 }, { desc: 'Admin', qty: 1, unit: 'Trx', price: 6500 }],
    report: { actual_cost: 486500, attended: 14, notes: 'Fasilitas sangat mendukung.', rating: 5, files: { nota: 'inv_badminton.pdf', foto: 'doc.jpg' } }
  },
  {
    id: 'evt6', pic_id: 'a4', sport_type: 'Basket', event_date: '2026-01-20T18:00', venue_name: 'DDB Arena', status: 'completed',
    objective: 'Latihan basket rutin.', budget_items: [{ desc: 'Sewa Lapangan Indoor', qty: 1, unit: 'Sesi', price: 706000 }, { desc: 'Admin', qty: 1, unit: 'Trx', price: 12500 }],
    report: { actual_cost: 718500, attended: 18, notes: 'Banyak peserta dari SBU.', rating: 4, files: { nota: 'inv_basket.pdf', foto: 'doc.jpg' } }
  }
];

// --- HELPER FUNCTIONS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (amount: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0);
const calculateTotalBudget = (items: any) => Array.isArray(items) ? items.reduce((sum, item) => sum + Number(item?.qty || 0) * Number(item?.price || 0), 0) : 0;
const calculateProgramTotal = (prog: any) => (Number(prog.costPerSession) + Number(prog.adminFee)) * Number(prog.freqNum);

const getStatusDisplay = (status: any) => {
  const map: any = {
    pending_approval: { label: 'Menunggu Approval', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', step: 1 },
    funded: { label: 'Siap Jalan (Lapor!)', color: 'bg-blue-100 text-blue-800 border-blue-200', step: 2 },
    pending_settlement: { label: 'Validasi Laporan', color: 'bg-purple-100 text-purple-800 border-purple-200', step: 3 },
    completed: { label: 'Selesai & Diarsipkan', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', step: 4 },
    rejected: { label: 'Ditolak / Revisi', color: 'bg-red-100 text-red-800 border-red-200', step: 0 },
  };
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-800', step: 0 };
};

// Fungsi Utilitas Konversi String Base64 murni ke format Blob yang stabil untuk di download
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

const FilePreviewModal = ({ fileObj, onClose }: any) => {
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
          // Jika format data url kurang standar
          const link = document.createElement('a');
          link.href = fileData;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (e) {
        console.error("Gagal memproses unduhan secara native", e);
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

const EventDetailModal = ({ event, onClose, ctx }: any) => {
  if (!event) return null;
  const pic = ctx.accounts.find((a: any) => a.id === event.pic_id);
  const proposedTotal = calculateTotalBudget(event.budget_items);
  const actualTotal = event.report?.actual_cost || 0;
  const statusInfo = getStatusDisplay(event.status);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all custom-scrollbar">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-10 rounded-t-3xl">
          <div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide border mb-2 inline-block ${statusInfo.color}`}>{statusInfo.label}</span>
            <h2 className="text-2xl font-black text-slate-800">{event.sport_type}</h2>
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
                 <p className="text-[10px] font-black text-blue-600 uppercase">Rencana Peserta</p>
                 <p className="font-black text-blue-900 text-right">{event.participants?.length || 0} Orang</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 flex items-center"><Target className="w-5 h-5 mr-2 text-blue-600"/> Objektif Kegiatan</h3>
            <p className="text-sm text-slate-600 bg-white p-4 rounded-xl border border-slate-200 leading-relaxed">{event.objective || '-'}</p>
          </div>

          {ctx.user.role === ROLES.ADMIN && event.participants && (
            <div>
               <h3 className="font-bold text-slate-800 mb-3 flex items-center"><Users className="w-5 h-5 mr-2 text-blue-600"/> Rencana Daftar Peserta Awal</h3>
               <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                 {event.participants.map((p: any, i: number) => (
                   <div key={i} className="flex items-center text-sm p-2 bg-slate-50 border border-slate-100 rounded-lg">
                     <span className="font-black text-slate-400 w-6">{i+1}.</span>
                     <span className="font-bold text-slate-700 flex-grow">{p.name}</span>
                     <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">{p.dept}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          <div>
            <h3 className="font-bold text-slate-800 mb-3 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-emerald-600"/> Rincian Anggaran (Pengajuan)</h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr className="border-b border-slate-200"><th className="p-4 font-bold text-slate-600">Item</th><th className="p-4 font-bold text-slate-600">Qty</th><th className="p-4 font-bold text-slate-600">Harga Satuan</th><th className="p-4 font-bold text-slate-600 text-right">Total</th></tr></thead>
                <tbody>
                  {event.budget_items?.map((it: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0"><td className="p-4">{it.desc}</td><td className="p-4">{it.qty} {it.unit}</td><td className="p-4">{formatCurrency(it.price)}</td><td className="p-4 font-semibold text-right">{formatCurrency(it.price * it.qty)}</td></tr>
                  ))}
                  <tr className="bg-blue-50"><td colSpan="3" className="p-4 text-right font-bold text-slate-700">Total Pengajuan:</td><td className="p-4 font-black text-blue-900 text-right text-lg">{formatCurrency(proposedTotal)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {event.report && (
            <div className="border-t-2 pt-8 border-dashed border-slate-200">
              <h3 className="font-bold text-slate-800 mb-5 flex items-center"><FileCheck className="w-6 h-6 mr-2 text-purple-600"/> Laporan Realisasi Akhir</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className={`p-6 rounded-2xl border-2 ${actualTotal > proposedTotal ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Realisasi (Sesuai Nota)</p>
                    <p className="text-3xl font-black text-slate-800">{formatCurrency(actualTotal)}</p>
                    <p className="text-sm font-bold mt-2 text-slate-600">Selisih: <span className={actualTotal > proposedTotal ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(actualTotal - proposedTotal)}</span></p>
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
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 h-full">
                    <p className="text-xs font-bold text-blue-900 uppercase mb-4 tracking-wider">Lampiran Dokumen</p>
                    <ul className="space-y-3 text-sm text-blue-700 font-medium">
                      {['nota', 'absensi', 'foto'].map(fileKey => {
                        const fileObj = event.report.files?.[fileKey];
                        if (!fileObj) return null;
                        const displayLabel = typeof fileObj === 'string' ? fileObj : fileObj.name;
                        
                        return (
                          <li key={fileKey} className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                            <span className="flex items-center truncate mr-3">
                              <Paperclip className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0"/> 
                              <span className="truncate">{displayLabel}</span>
                            </span>
                            <button onClick={() => ctx.openPreview(fileObj)} className="flex items-center text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm">
                              <Eye className="w-3 h-3 mr-1"/> Lihat
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {event.admin_notes && (
            <div className="bg-orange-50 p-5 rounded-2xl border border-yellow-200 flex items-start shadow-sm">
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

const LoginScreen = ({ ctx }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: any) => {
    e.preventDefault();
    const account = ctx.accounts.find((a: any) => a.username === username && a.password === password);
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
const ViewDashboard = ({ ctx }: any) => {
  const isPIC = ctx.user.role === ROLES.PIC;
  
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState('month'); 
  const [filterValue, setFilterValue] = useState(String(new Date().getMonth() + 1).padStart(2, '0')); 
  const [filterPic, setFilterPic] = useState('all');

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

  const roleFilteredEvents = ctx.events.filter((e: any) => isPIC ? e.pic_id === ctx.user.id : true);
  
  const currentPeriodEvents = roleFilteredEvents.filter((e: any) => {
    const d = new Date(e.event_date);
    const y = d.getFullYear().toString();
    const m = d.getMonth() + 1;
    
    if (!isPIC && filterPic !== 'all' && e.pic_id !== filterPic) return false;
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
    ? ctx.programs.filter((p: any) => p.sport.includes(ctx.user.sport)) 
    : (filterPic !== 'all' 
        ? ctx.programs.filter((p: any) => p.sport === ctx.accounts.find((a: any)=>a.id===filterPic)?.sport) 
        : ctx.programs);
  
  const totalCompletedEvents = currentPeriodEvents.filter((e: any) => e.status === 'completed').length;
  
  const totalBudgetSpent = currentPeriodEvents.filter((e: any) => e.status === 'completed')
    .reduce((acc: any, curr: any) => acc + (curr.report?.actual_cost || 0), 0);
  
  let multiplier = 1;
  if(filterType === 'quarter' && filterValue !== 'ALL') multiplier = 3;
  if(filterType === 'semester' && filterValue !== 'ALL') multiplier = 6;
  if(filterType === 'year' || filterValue === 'ALL') multiplier = 12;
  const totalAllocated = programsToMonitor.reduce((acc: any, p: any) => acc + calculateProgramTotal(p), 0) * multiplier;

  const generateChartData = () => {
    let periods: any[] = [];
    if (filterType === 'month') periods = monthOptions.map(m => ({ label: m.label.substring(0,3), check: (evMonth: any) => evMonth === parseInt(m.val) }));
    else if (filterType === 'quarter') periods = quarterOptions.map(q => ({ label: q.val, check: (evMonth: any) => `Q${Math.ceil(evMonth/3)}` === q.val }));
    else if (filterType === 'semester') periods = semesterOptions.map(s => ({ label: s.val, check: (evMonth: any) => (evMonth <= 6 ? 'S1' : 'S2') === s.val }));
    else periods = [{ label: filterYear, check: () => true }];

    return periods.map(p => {
      const evtsInYear = roleFilteredEvents.filter((e: any) => {
        const d = new Date(e.event_date);
        return d.getFullYear().toString() === filterYear && 
               (!isPIC && filterPic !== 'all' ? e.pic_id === filterPic : true) && 
               p.check(d.getMonth()+1) && 
               e.status === 'completed'; 
      });
      
      const totalEvts = evtsInYear.length;
      const totalPax = evtsInYear.reduce((sum: any, e: any) => sum + (e.report?.attended || 0), 0);
      const budgetSpent = evtsInYear.reduce((sum: any, e: any) => sum + (e.report?.actual_cost || 0), 0);
      return { periodLabel: p.label, events: totalEvts, participants: totalPax, budgetSpent };
    });
  };

  const chartData = generateChartData();
  const maxEvents = Math.max(...chartData.map(d => d.events), 5);
  const maxPax = Math.max(...chartData.map(d => d.participants), 50);
  const maxBudget = Math.max(...chartData.map(d => d.budgetSpent), 1000000); 

  const ratedEvents = currentPeriodEvents.filter((e: any) => e.status === 'completed' && e.report && e.report.rating);
  const avgRating = ratedEvents.length > 0 ? (ratedEvents.reduce((acc: any, e: any) => acc + e.report.rating, 0) / ratedEvents.length).toFixed(1) : 0;

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
            <p className="text-blue-100 font-medium">Jadwal kegiatan <b>{myProgram.sport}</b> adalah setiap hari <b>{myProgram.day}</b> ({myProgram.freqText}).</p>
            <p className="text-sm mt-2 text-yellow-300 font-bold">Periode ini tercatat {currentPeriodEvents.length} pengajuan masuk.</p>
          </div>
          <button onClick={() => ctx.setView('new_proposal')} className="bg-white text-indigo-700 hover:bg-blue-50 font-black px-6 py-3 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all relative z-10 flex-shrink-0 flex items-center">
            Buat Proposal Sekarang <ArrowRight className="ml-2 w-4 h-4"/>
          </button>
        </div>
      )}

      {/* MASTER CALENDAR BANNER FOR ADMIN */}
      {!isPIC && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-4 translate-y-4"><CalendarDays className="w-48 h-48" /></div>
          <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center relative z-10"><CalendarDays className="w-5 h-5 mr-2 text-indigo-600" /> Kalender & Jadwal Program Rutin</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative z-10">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Random'].map(day => {
              const progsToday = ctx.programs.filter((p: any) => p.day === day);
              return (
                <div key={day} className={`p-4 rounded-2xl border-2 ${progsToday.length > 0 ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{day}</p>
                  {progsToday.length > 0 ? (
                    <div className="space-y-2">
                      {progsToday.map((p: any) => <div key={p.id} className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-indigo-50 truncate flex items-center"><Activity className="w-3 h-3 mr-1.5 opacity-50"/> {p.sport}</div>)}
                    </div>
                  ) : <p className="text-xs font-medium text-slate-400">-</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FILTER ANALISIS TERPADU */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 relative z-20 mt-8">
        <div className="flex items-center text-blue-900 font-black whitespace-nowrap bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
          <ListFilter className="w-5 h-5 mr-2"/> Filter Dasbor:
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
            <select className="flex-1 min-w-[140px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={filterPic} onChange={e => setFilterPic(e.target.value)}>
              <option value="all">Semua Program / PIC</option>
              {ctx.accounts.filter((a: any) => a.role === ROLES.PIC).map((pic: any) => <option key={pic.id} value={pic.id}>{pic.sport} ({pic.name})</option>)}
            </select>
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
            {roleFilteredEvents.filter((e: any) => isPIC ? ['funded'].includes(e.status) : ['pending_approval', 'pending_settlement'].includes(e.status)).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Analytics (FULL WIDTH untuk Admin & PIC) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-indigo-600" /> Analitik Tren Pertumbuhan Data Tervalidasi ({filterYear})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
            {/* Grafik 1: Pertumbuhan Event */}
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

            {/* Grafik 2: Pertumbuhan Peserta */}
            <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-500 mb-6 text-center uppercase tracking-wide">Tren Kehadiran Peserta</p>
              <div className="flex-grow w-full overflow-x-auto custom-scrollbar pb-2">
                <div className="flex gap-3 h-40 items-end justify-between px-2 min-w-[200px]">
                  {chartData.map((data, i) => (
                    <div key={`pax-${i}`} className="flex flex-col items-center justify-end flex-grow h-full gap-2 relative group min-w-[30px]">
                      <div className="w-full bg-emerald-400 rounded-t-md hover:bg-emerald-600 transition-all relative flex justify-center shadow-sm" style={{ height: `${Math.max((data.participants/maxPax)*100, 5)}%` }}>
                        {data.participants > 0 && <span className="absolute -top-6 text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">{data.participants}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{data.periodLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grafik 3: Tren Realisasi Anggaran */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {programsToMonitor.map((prog: any) => {
              // HANYA hitung dari status Completed
              const progEvents = currentPeriodEvents.filter((e: any) => e.sport_type.includes(prog.sport) && e.status === 'completed');
              const spent = progEvents.reduce((sum: any, e: any) => sum + (e.report?.actual_cost || 0), 0);
              const plafon = calculateProgramTotal(prog) * multiplier;
              const pct = plafon > 0 ? Math.min((spent / plafon) * 100, 100).toFixed(1) : 0;
              const isOver = spent > plafon;
              
              return (
                <div key={prog.id} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex justify-between text-sm font-bold mb-3">
                    <span className="text-slate-800 font-black truncate max-w-[50%]">{prog.sport}</span>
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
            {isPIC ? 'Status Pengajuan Periode Ini' : 'Daftar Kegiatan Berjalan'}
          </h3>
          <div className="space-y-4 overflow-y-auto flex-grow pr-2 custom-scrollbar">
            {currentPeriodEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <Calendar className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-center">Tidak ada kegiatan pada filter ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentPeriodEvents.sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).map((evt: any) => {
                  const statusInfo = getStatusDisplay(evt.status);
                  
                  return (
                    <div key={evt.id} className="flex flex-col p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-slate-800 text-sm leading-tight">{evt.sport_type}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase truncate max-w-[150px]"><MapPin className="w-3 h-3 inline mr-1 -mt-0.5"/>{evt.venue_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1"><Clock className="w-3 h-3 inline mr-1 -mt-0.5"/>{new Date(evt.event_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 whitespace-nowrap">{formatCurrency(evt.report?.actual_cost || calculateTotalBudget(evt.budget_items))}</p>
                      </div>
                      
                      {/* Visual Stepper Khusus PIC */}
                      {isPIC && (
                        <div className="mt-2 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-0 -translate-y-1/2 rounded-full"></div>
                            <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-0 -translate-y-1/2 rounded-full transition-all duration-1000" style={{ width: `${((statusInfo.step-1) / 3) * 100}%` }}></div>
                            
                            {[1, 2, 3, 4].map(step => (
                              <div key={step} className={`w-4 h-4 rounded-full relative z-10 border-2 transition-colors ${statusInfo.step >= step ? 'bg-emerald-500 border-emerald-100 shadow-sm' : 'bg-slate-200 border-white'}`}></div>
                            ))}
                          </div>
                          <p className={`text-center mt-3 text-[10px] font-black uppercase tracking-wider ${statusInfo.color.split(' ')[1]}`}>{statusInfo.label}</p>
                        </div>
                      )}

                      {/* Tampilan Standar Untuk Admin */}
                      {!isPIC && (
                        <div className="text-right mt-2 border-t border-slate-100 pt-3 flex justify-between items-center">
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

// 2. Form Pengajuan (Dengan Validasi Minimal 7 Peserta)
const ViewNewProposal = ({ ctx }: any) => {
  const defaultSport = ctx.user.sport || '';
  const defaultProgram = ctx.programs.find((p: any) => p.sport === defaultSport) || {};
  const [formData, setFormData] = useState<any>({ sport: defaultSport, date: '', venue: '', objective: '' });
  
  // Inisialisasi awal dengan 7 baris kosong
  const initialParticipants = Array(7).fill(null).map(() => ({ id: generateId(), name: '', dept: '' }));
  const [participants, setParticipants] = useState<any[]>(initialParticipants);
  
  const [budgetItems, setBudgetItems] = useState<any[]>([
    { desc: 'Sewa Lapangan/Vendor', qty: 1, unit: 'Sesi', price: defaultProgram.costPerSession || '' },
    { desc: 'Biaya Admin', qty: 1, unit: 'Trx', price: defaultProgram.adminFee || '' }
  ]);

  const totalProp = calculateTotalBudget(budgetItems);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const validParticipants = participants.filter(p => p.name.trim() !== '');
    
    if(validParticipants.length < 7) {
      return ctx.showToast(`Pengajuan wajib minimal 7 peserta! Anda baru memasukkan ${validParticipants.length} nama.`, 'error');
    }
    
    const newEvent = {
      id: generateId(), pic_id: ctx.user.id, sport_type: formData.sport, event_date: new Date(formData.date).toISOString(),
      venue_name: formData.venue, objective: formData.objective, status: 'pending_approval', participants: validParticipants,
      budget_items: budgetItems.map((i) => ({ ...i, price: Number(i.price) })),
    };
    try {
      await ctx.addEvent(newEvent);
      ctx.setView('dashboard');
      ctx.showToast('Proposal berhasil diajukan kepada Admin!', 'success');
    } catch (err) {
      ctx.showToast('Terjadi kesalahan saat menghubungi server.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-3xl font-black mb-8 text-slate-800 border-b border-slate-100 pb-5">Ajukan Proposal Baru</h2>
        
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-8 flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-blue-900 leading-relaxed">
            Perhatian PIC: Berdasarkan SOP, setiap pengajuan proposal kegiatan wajib menyertakan <span className="text-red-600 font-black">minimal 7 nama peserta rencana</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tanggal & Waktu</label>
              <input type="datetime-local" required className="w-full p-4 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium" onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Venue Pelaksanaan</label>
              <input type="text" required placeholder="Cth: DDB Arena" className="w-full p-4 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium" onChange={(e) => setFormData({ ...formData, venue: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Objektif Kegiatan (Justifikasi)</label>
            <textarea required rows="2" className="w-full p-4 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium" placeholder="Contoh: Latihan rutin dan persiapan acara akhir tahun..." onChange={(e) => setFormData({ ...formData, objective: e.target.value })}></textarea>
          </div>
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <label className="block text-sm font-black text-slate-800">Daftar Peserta (Rencana SBU/SFU)</label>
                <p className="text-xs text-red-500 font-bold mt-1">* Wajib Minimal 7 Orang</p>
              </div>
              <button type="button" onClick={() => setParticipants([...participants, { id: generateId(), name: '', dept: '' }])} className="text-xs bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors text-blue-700 flex items-center"><Plus className="w-4 h-4 mr-1"/> Tambah Baris</button>
            </div>
            <div className="space-y-3">
              {participants.map((p, idx) => (
                <div key={p.id} className="flex gap-3 items-center">
                  <span className="text-xs font-black text-slate-400 w-5 text-right">{idx+1}.</span>
                  <input type="text" placeholder="Nama Lengkap" className="flex-grow p-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-blue-500" value={p.name} onChange={e => { const arr = [...participants]; arr[idx] = {...arr[idx], name: e.target.value}; setParticipants(arr); }} />
                  <input type="text" placeholder="SBU/SFU" className="w-1/3 p-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-blue-500" value={p.dept} onChange={e => { const arr = [...participants]; arr[idx] = {...arr[idx], dept: e.target.value}; setParticipants(arr); }} />
                  <button type="button" onClick={() => setParticipants(participants.filter((_, i) => i !== idx))} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-blue-900">Rincian Anggaran</h3>
              <button type="button" onClick={() => setBudgetItems([...budgetItems, { desc: '', qty: 1, unit: 'Sesi', price: '' }])} className="text-xs bg-white shadow-sm border border-slate-200 px-4 py-2 rounded-lg font-bold text-blue-700 hover:bg-slate-50 flex items-center"><Plus className="w-4 h-4 mr-1"/> Tambah Item</button>
            </div>
            <div className="space-y-3">
              {budgetItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <input type="text" placeholder="Deskripsi Item" required className="flex-grow p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-white" value={item.desc} onChange={e => { const b = [...budgetItems]; b[idx] = {...b[idx], desc: e.target.value}; setBudgetItems(b); }} />
                  <input type="number" required min="1" className="w-24 p-3 border border-slate-200 rounded-xl text-sm text-center outline-none focus:border-blue-500 bg-white" value={item.qty} onChange={e => { const b = [...budgetItems]; b[idx] = {...b[idx], qty: e.target.value}; setBudgetItems(b); }} />
                  <input type="number" placeholder="Harga Satuan" required className="w-40 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-white" value={item.price} onChange={e => { const b = [...budgetItems]; b[idx] = {...b[idx], price: e.target.value}; setBudgetItems(b); }} />
                  <button type="button" onClick={() => setBudgetItems(budgetItems.filter((_, i) => i !== idx))} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
            <div className="mt-6 text-right pt-6 border-t border-blue-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Nilai Pengajuan</p>
              <p className="text-3xl font-black text-blue-900">{formatCurrency(totalProp)}</p>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 transition-all text-white font-black text-lg py-5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5">Kirim Pengajuan Proposal</button>
        </form>
      </div>
    </div>
  );
};

// 3. Form Pelaporan
const ViewReporting = ({ ctx }: any) => {
  const [reportingId, setReportingId] = useState(null);
  const [reportData, setReportData] = useState<any>({ actual_cost: '', attended: 0, notes: '', rating: 5, files: { nota: null, absensi: null, foto: null } });

  const eventsToReport = ctx.events.filter((e: any) => e.pic_id === ctx.user.id && e.status === 'funded');

  const openForm = (evt: any) => {
    setReportingId(evt.id);
    setReportData({ ...reportData, actual_cost: calculateTotalBudget(evt.budget_items), attended: evt.participants?.length || 0 }); 
  };

  // Konversi otomatis file gambar menjadi PDF dan kompresi jika besar
  const handleFile = (e: any, type: string) => { 
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const fileData = reader.result as string;

      // Jika file adalah gambar, konversi langsung menjadi file PDF
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          try {
            // Kompresi ukuran jika lebih dari 1000px untuk optimasi database Cloud (1MB Max)
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1000;
            
            if (width > height && width > MAX_SIZE) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const canvasCtx = canvas.getContext('2d');
            
            if(canvasCtx) {
              canvasCtx.fillStyle = '#FFFFFF';
              canvasCtx.fillRect(0, 0, width, height);
              canvasCtx.drawImage(img, 0, 0, width, height);
            }

            const compressedImg = canvas.toDataURL('image/jpeg', 0.7);

            // Jika JS PDF library tersedia dari CDN, langsung convert menjadi PDF
            if (window.jspdf && window.jspdf.jsPDF) {
              const { jsPDF } = window.jspdf;
              const orientation = width > height ? 'l' : 'p';
              const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });
              doc.addImage(compressedImg, 'JPEG', 0, 0, width, height);
              const pdfDataUri = doc.output('datauristring');
              
              const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
              setReportData(prev => ({
                ...prev, 
                files: { ...prev.files, [type]: { name: newFileName, type: 'application/pdf', data: pdfDataUri } }
              }));
              
              ctx.showToast(`Sukses memproses & mengkonversi ${file.name} menjadi dokumen PDF!`, 'success');
            } else {
               // Fallback: Jika internet jelek & CDN belum termuat, simpan file sebagai gambar yang dikompres saja
               setReportData(prev => ({
                ...prev, 
                files: { ...prev.files, [type]: { name: file.name, type: file.type, data: compressedImg } }
              }));
            }
          } catch(err) {
            console.error("Gagal melakukan optimasi/konversi PDF:", err);
            // Fallback fatal (simpan murni file mentah)
            setReportData(prev => ({
              ...prev, 
              files: { ...prev.files, [type]: { name: file.name, type: file.type, data: fileData } }
            }));
          }
        };
        img.src = fileData;
      } else {
        // Jika file bukan gambar (contoh: Upload langsung format PDF)
        setReportData(prev => ({
          ...prev, 
          files: { ...prev.files, [type]: { name: file.name, type: file.type, data: fileData } } 
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReport = async (id: string) => {
    if(!reportData.files.nota || !reportData.files.foto) return ctx.showToast('Silakan unggah Nota dan Foto Dokumentasi untuk melanjutkan.', 'error');
    if(reportData.attended === 0) return ctx.showToast('Silakan masukkan jumlah kehadiran aktual.', 'error');

    try {
      await ctx.updateEvent(id, { status: 'pending_settlement', report: { ...reportData, actual_cost: Number(reportData.actual_cost) } });
      setReportingId(null);
      ctx.showToast('Laporan berhasil dikirim untuk validasi Admin!', 'success');
    } catch (error) {
      ctx.showToast('Gagal mengirim laporan.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 mb-8">Tugas Pelaporan (Post-Event)</h2>
      {eventsToReport.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 flex flex-col items-center shadow-sm">
          <div className="bg-emerald-50 p-6 rounded-full mb-6">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>
          <p className="font-black text-2xl text-slate-700">Luar Biasa!</p>
          <p className="font-medium mt-2">Tidak ada laporan yang perlu diselesaikan saat ini.</p>
        </div>
      ) : (
        eventsToReport.map((evt: any) => (
          reportingId === evt.id ? (
            <div key={evt.id} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
              <h3 className="text-2xl font-black mb-8 text-slate-800 flex items-center"><FileText className="mr-3 text-red-500"/> Form Pelaporan: {evt.sport_type}</h3>
              <div className="space-y-8">
                
                {/* Realisasi vs Proposed */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Anggaran Disetujui (Proposal)</p>
                    <p className="text-2xl font-black text-slate-400 line-through mt-1">{formatCurrency(calculateTotalBudget(evt.budget_items))}</p>
                  </div>
                  <div className="flex-grow w-full md:w-auto md:max-w-sm">
                    <label className="block text-sm font-black mb-2 text-emerald-700">Total Realisasi Akhir (Sesuai Nota)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-4 w-5 h-5 text-emerald-500" />
                      <input type="number" className="w-full pl-12 pr-4 py-3 border-2 border-emerald-200 rounded-xl bg-white font-black text-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all" value={reportData.actual_cost} onChange={(e) => setReportData({...reportData, actual_cost: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Kehadiran & Evaluasi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border-2 border-slate-100 p-6 rounded-2xl bg-white flex flex-col justify-center">
                    <p className="font-black text-slate-800 mb-4">Jumlah Kehadiran Aktual</p>
                    <div className="relative">
                      <Users className="absolute left-4 top-4 w-6 h-6 text-blue-500" />
                      <input type="number" min="0" className="w-full pl-14 pr-4 py-3 border-2 border-blue-200 rounded-xl bg-slate-50 font-black text-2xl outline-none focus:border-blue-500 transition-all" value={reportData.attended} onChange={(e) => setReportData({...reportData, attended: parseInt(e.target.value) || 0})} />
                    </div>
                    <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">Cukup ketik total angka peserta yang hadir. <br/><span className="text-red-500 font-bold">Wajib melampirkan file dokumen absensi (Excel/PDF/Foto) pada kolom unggah di bawah sebagai bukti otentik.</span></p>
                  </div>
                  <div className="border-2 border-slate-100 p-6 rounded-2xl bg-white flex flex-col justify-between">
                    <div>
                      <p className="font-black text-slate-800 mb-3">Penilaian Tempat / Vendor</p>
                      <div className="flex gap-2 mb-6">
                        {[1,2,3,4,5].map(n => (
                          <button type="button" key={n} onClick={() => setReportData({...reportData, rating: n})} className={`p-1 transition-transform hover:scale-125 ${reportData.rating >= n ? 'text-orange-500' : 'text-slate-200'}`}><Star className="w-8 h-8 fill-current"/></button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">Catatan Pelaksanaan</label>
                      <textarea className="w-full p-4 border-2 border-slate-100 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-500 focus:bg-white transition-colors" rows="3" placeholder="Tulis rincian atau kesan pesan acara..." value={reportData.notes} onChange={(e)=>setReportData({...reportData, notes: e.target.value})}></textarea>
                    </div>
                  </div>
                </div>

                {/* Upload Bukti */}
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <p className="font-black text-blue-900 mb-5 flex items-center"><Paperclip className="w-5 h-5 mr-2"/> Unggah Dokumen Bukti</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <label className="block text-xs font-bold text-slate-600 mb-2">1. Nota / Invoice (Wajib)</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, 'nota')} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      {reportData.files.nota && <p className="text-[10px] text-emerald-600 font-bold mt-2 truncate">Terunggah: {reportData.files.nota.name}</p>}
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <label className="block text-xs font-bold text-slate-600 mb-2">2. Foto Kegiatan (Wajib)</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, 'foto')} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      {reportData.files.foto && <p className="text-[10px] text-emerald-600 font-bold mt-2 truncate">Terunggah: {reportData.files.foto.name}</p>}
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <label className="block text-xs font-bold text-slate-600 mb-2">3. Daftar Hadir (Opsional)</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, 'absensi')} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      {reportData.files.absensi && <p className="text-[10px] text-emerald-600 font-bold mt-2 truncate">Terunggah: {reportData.files.absensi.name}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setReportingId(null)} className="px-8 py-4 bg-slate-100 font-black rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
                  <button onClick={() => handleSubmitReport(evt.id)} className="flex-grow bg-blue-900 hover:bg-blue-800 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg">Kirim Laporan Akhir</button>
                </div>
              </div>
            </div>
          ) : (
            <div key={evt.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wide bg-blue-50 text-blue-700 border border-blue-200">Menunggu Laporan</span>
                  <h3 className="text-xl font-black text-slate-800 mt-4">{evt.sport_type}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1 flex items-center"><MapPin className="w-4 h-4 mr-1 text-red-500" /> {evt.venue_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-800">{formatCurrency(calculateTotalBudget(evt.budget_items))}</p>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{new Date(evt.event_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                </div>
              </div>
              <button onClick={() => openForm(evt)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl text-sm font-black shadow-md flex items-center justify-center transition-all hover:shadow-lg hover:-translate-y-0.5">
                <Upload className="w-5 h-5 mr-2" /> Mulai Buat Laporan
              </button>
            </div>
          )
        ))
      )}
    </div>
  );
};

const AdminSettlementCard = ({ evt, ctx }: any) => {
  const proposed = calculateTotalBudget(evt.budget_items);
  const [editCost, setEditCost] = useState(evt.report?.actual_cost || 0);
  const [editAttended, setEditAttended] = useState(evt.report?.attended || 0);
  const [adminNote, setAdminNote] = useState('');

  const diff = editCost - proposed;

  const handleAction = async (newStatus: string) => {
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
          <p className="text-sm font-semibold text-slate-500">{new Date(evt.event_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
        </div>
        <button onClick={() => ctx.openModal(evt)} className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm">
          <Eye className="w-3 h-3 mr-1"/> Detail Rincian
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Anggaran Awal</p>
          <p className="font-bold text-slate-400 line-through text-sm">{formatCurrency(proposed)}</p>
        </div>
        <div className={`p-3 rounded-xl border text-center flex flex-col justify-center ${diff > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-center">Realisasi Akhir <Edit3 className="w-3 h-3 ml-1 text-slate-400"/></p>
          <input type="number" className="bg-transparent font-black text-slate-800 text-lg leading-none text-center w-full outline-none focus:border-b border-slate-300" value={editCost} onChange={(e) => setEditCost(Number(e.target.value))} title="Admin dapat mengedit nominal ini" />
        </div>
        <div className="col-span-2 bg-white p-3 rounded-xl border flex items-center justify-between shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">Total Kehadiran Aktual <Edit3 className="w-3 h-3 ml-2 text-slate-400"/></p>
          <div className="flex items-center">
            <input type="number" className="font-black text-blue-900 text-xl w-16 text-right outline-none bg-blue-50 border border-blue-100 rounded-lg px-2 focus:border-blue-400 transition-colors" value={editAttended} onChange={(e) => setEditAttended(Number(e.target.value))} title="Admin dapat mengedit jumlah ini" />
            <span className="text-xs text-slate-500 ml-2 font-bold uppercase">Orang</span>
          </div>
        </div>
      </div>

      <div className="mb-5 bg-blue-50 p-4 rounded-xl border border-blue-100">
        <p className="text-xs font-black mb-3 text-blue-900 tracking-wide uppercase">File Lampiran PIC:</p>
        <ul className="space-y-2">
          {['nota', 'absensi', 'foto'].map(fileKey => {
            const fileObj = evt.report?.files?.[fileKey];
            if(!fileObj) return null;
            const displayLabel = typeof fileObj === 'string' ? fileObj : fileObj.name;
            return (
              <li key={fileKey} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                <span className="flex items-center truncate mr-2"><Paperclip className="w-4 h-4 mr-2 text-blue-400 flex-shrink-0"/> <span className="truncate text-xs font-bold text-slate-600">{displayLabel}</span></span>
                <button onClick={() => ctx.openPreview(fileObj)} className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors flex-shrink-0 flex items-center shadow-sm"><Eye className="w-3 h-3 mr-1"/> Lihat</button>
              </li>
            )
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

// 4. Admin Approvals
const ViewAdminApprovals = ({ ctx }: any) => {
  const pendingApprovals = ctx.events.filter((e: any) => e.status === 'pending_approval');
  const pendingSettlements = ctx.events.filter((e: any) => e.status === 'pending_settlement');
  const [adminNotes, setAdminNotes] = useState<any>({});

  const handleApprove = async (id: string, newStatus: string) => {
    try {
      await ctx.updateEvent(id, { status: newStatus, admin_notes: adminNotes[id] || '' });
      setAdminNotes((prev: any) => ({...prev, [id]: ''}));
      ctx.showToast('Keputusan Proposal berhasil disimpan!', 'success');
    } catch(err) {
      ctx.showToast('Gagal menyimpan keputusan', 'error');
    }
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center"><Activity className="mr-3 text-blue-600"/> 1. Persetujuan Proposal Baru</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingApprovals.length === 0 && <div className="col-span-2 bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-bold">Tidak ada proposal baru yang diajukan.</div>}
          {pendingApprovals.map((evt: any) => {
            const pic = ctx.accounts.find((a: any) => a.id === evt.pic_id);
            return (
              <div key={evt.id} className="bg-white border-2 border-yellow-100 hover:border-yellow-300 shadow-sm hover:shadow-lg transition-all p-6 rounded-3xl">
                <div className="flex justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <p className="font-black text-xl text-slate-800">{evt.sport_type}</p>
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

                <div className="mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Objektif Kegiatan</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">{evt.objective}</p>
                </div>
                <input type="text" placeholder="Tambahkan catatan (Opsional)" className="w-full text-sm p-3 border-2 border-slate-100 rounded-xl mb-4 bg-white focus:border-blue-400 focus:ring-0 outline-none transition-colors" value={adminNotes[evt.id] || ''} onChange={e => setAdminNotes({...adminNotes, [evt.id]: e.target.value})} />
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(evt.id, 'rejected')} className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-xl border border-red-200 transition-colors shadow-sm">Tolak</button>
                  <button onClick={() => handleApprove(evt.id, 'funded')} className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center transition-all"><CheckCircle className="w-5 h-5 mr-2"/> Setujui Proposal</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center"><FileCheck className="mr-3 text-purple-600"/> 2. Validasi Laporan (Settlement Akhir)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingSettlements.length === 0 && <div className="col-span-2 bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-bold">Tidak ada laporan yang menunggu validasi.</div>}
          {pendingSettlements.map((evt: any) => (
             <AdminSettlementCard key={evt.id} evt={evt} ctx={ctx} />
          ))}
        </div>
      </div>
    </div>
  );
};

// 5. Database dengan Search & Filter Bulan + Add/Delete Manual Arsip
const ViewDatabase = ({ ctx }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); 
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newArchive, setNewArchive] = useState({ sport_type: '', event_date: '', venue_name: '', attended: 0, actual_cost: 0 });
  
  let displayEvents = ctx.events
    .filter((e: any) => e.status === 'completed' && (ctx.user.role === ROLES.ADMIN || e.pic_id === ctx.user.id))
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  if (filterMonth) {
    displayEvents = displayEvents.filter((e: any) => e.event_date.startsWith(filterMonth));
  }
  if (searchTerm) {
    const lowerTerm = searchTerm.toLowerCase();
    displayEvents = displayEvents.filter((e: any) => 
      e.sport_type.toLowerCase().includes(lowerTerm) || 
      e.venue_name.toLowerCase().includes(lowerTerm)
    );
  }

  const handleDeleteEvent = async (id: string) => {
    if(window.confirm('Yakin ingin menghapus arsip data ini secara permanen? Hal ini akan memengaruhi metrik dasbor.')) {
      await ctx.deleteEvent(id);
      ctx.showToast('Arsip berhasil dihapus.', 'success');
    }
  };

  const handleAddArchive = async (e: any) => {
    e.preventDefault();
    const archiveEvent = {
        id: generateId(),
        pic_id: ctx.user.id,
        sport_type: newArchive.sport_type,
        event_date: new Date(newArchive.event_date).toISOString(),
        venue_name: newArchive.venue_name,
        status: 'completed',
        report: {
            attended: Number(newArchive.attended),
            actual_cost: Number(newArchive.actual_cost),
            rating: 5,
            notes: 'Arsip histori ditambahkan secara manual.',
            files: {}
        },
        budget_items: [{ desc: 'Realisasi Arsip', qty: 1, unit: 'Lumpsum', price: Number(newArchive.actual_cost) }]
    };
    await ctx.addEvent(archiveEvent);
    setShowAddModal(false);
    setNewArchive({ sport_type: '', event_date: '', venue_name: '', attended: 0, actual_cost: 0 });
    ctx.showToast('Data arsip manual berhasil ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-black text-slate-800 flex items-center"><Database className="mr-3 text-blue-600 w-8 h-8" /> Arsip Database Program</h2>
        
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari program / venue..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-white" />
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-black flex items-center transition-colors shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" /> Tambah Arsip
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-md mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800">Tambah Arsip Histori Manual</h3>
            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500"><XCircle /></button>
          </div>
          <form onSubmit={handleAddArchive} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Cabor / Program</label>
              <input type="text" required placeholder="Cth: Tenis Meja" className="w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm outline-none focus:border-blue-500" value={newArchive.sport_type} onChange={e => setNewArchive({...newArchive, sport_type: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal</label>
              <input type="datetime-local" required className="w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm outline-none focus:border-blue-500" value={newArchive.event_date} onChange={e => setNewArchive({...newArchive, event_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Venue</label>
              <input type="text" required placeholder="Cth: DDB Arena" className="w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm outline-none focus:border-blue-500" value={newArchive.venue_name} onChange={e => setNewArchive({...newArchive, venue_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Peserta</label>
                <input type="number" required placeholder="Jml" className="w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm outline-none focus:border-blue-500" value={newArchive.attended} onChange={e => setNewArchive({...newArchive, attended: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Total Biaya</label>
                <input type="number" required placeholder="Rp" className="w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm outline-none focus:border-blue-500" value={newArchive.actual_cost} onChange={e => setNewArchive({...newArchive, actual_cost: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-lg shadow-sm transition-colors">Simpan Arsip</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider">Tanggal Aktivitas</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider">Program & PIC</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-center">Peserta</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-right">Total Realisasi (Rp)</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayEvents.length === 0 && (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold">Tidak ada rekaman data yang ditemukan.</td></tr>
              )}
              {displayEvents.map((evt: any) => {
                const picName = ctx.accounts.find((a: any) => a.id === evt.pic_id)?.name || 'Manual Admin';
                const actualCost = evt.report?.actual_cost || calculateTotalBudget(evt.budget_items || []);
                return (
                  <tr key={evt.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="p-5 text-slate-700 text-sm font-bold">{new Date(evt.event_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                    <td className="p-5">
                      <p className="font-black text-blue-900">{evt.sport_type}</p>
                      <p className="text-xs text-slate-500 font-bold mt-1">{picName}</p>
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-slate-100 text-slate-700 font-black text-xs px-3 py-1.5 rounded-lg border border-slate-200 group-hover:bg-white transition-colors">{evt.report?.attended || 0} Orang</span>
                    </td>
                    <td className="p-5 font-black text-emerald-600 text-lg text-right">{formatCurrency(actualCost)}</td>
                    <td className="p-5 text-center whitespace-nowrap">
                      <button onClick={() => ctx.openModal(evt)} className="text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl text-xs font-black inline-flex items-center transition-all shadow-sm">
                        <Eye className="w-4 h-4 mr-2" /> Detail
                      </button>
                      <button onClick={() => handleDeleteEvent(evt.id)} className="text-red-600 hover:text-white bg-red-50 hover:bg-red-500 px-4 py-2 rounded-xl text-xs font-black inline-flex items-center transition-all shadow-sm ml-2">
                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                      </button>
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

// 6. Master Data & Pengaturan Jadwal (+ Delete Program)
const ViewMasterData = ({ ctx }: any) => {
  const [tab, setTab] = useState('pic');
  const [newAcc, setNewAcc] = useState<any>({ 
    name: '', username: '', division: '', sport: '',
    day: 'Senin', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 0, adminFee: 0 
  });
  
  const [editingProgId, setEditingProgId] = useState(null);
  const [editProgData, setEditProgData] = useState<any>({});

  const handleAddPIC = async (e: any) => {
    e.preventDefault();
    if (!newAcc.name || !newAcc.username || !newAcc.sport) {
      return ctx.showToast('Harap lengkapi Nama, Username, dan Cabang Olahraga!', 'error');
    }
    
    if (ctx.accounts.find((a: any) => a.username === newAcc.username.toLowerCase())) {
      return ctx.showToast('Username sudah digunakan, pilih yang lain.', 'error');
    }

    const newPicAccount = {
      id: generateId(), role: ROLES.PIC, password: '123', 
      name: newAcc.name, username: newAcc.username.toLowerCase(),
      division: newAcc.division, sport: newAcc.sport
    };
    
    const newProgram = {
      id: generateId(), sport: newAcc.sport, day: newAcc.day,
      freqText: newAcc.freqText, freqNum: Number(newAcc.freqNum),
      costPerSession: Number(newAcc.costPerSession), adminFee: Number(newAcc.adminFee)
    };

    try {
      await ctx.addAccount(newPicAccount);
      await ctx.addProgram(newProgram);
      setNewAcc({ name: '', username: '', division: '', sport: '', day: 'Senin', freqText: 'Setiap Minggu', freqNum: 4, costPerSession: 0, adminFee: 0 });
      ctx.showToast('Akun PIC dan Jadwal Program berhasil dibuat!', 'success');
    } catch(err) {
      ctx.showToast('Gagal menambahkan data PIC.', 'error');
    }
  };

  const deleteAccount = async (id: string) => {
    if(window.confirm('Yakin ingin menghapus PIC ini?')) {
      try {
        await ctx.deleteAccount(id);
        ctx.showToast('Akun berhasil dihapus.', 'success');
      } catch (error) {
        ctx.showToast('Gagal menghapus data.', 'error');
      }
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if(window.confirm('PERINGATAN: Yakin ingin menghapus master jadwal & anggaran ini secara permanen? Hal ini akan memengaruhi metrik target.')) {
      try {
        await ctx.deleteProgram(id);
        ctx.showToast('Jadwal program dan limit anggaran dihapus.', 'success');
      } catch (error) {
        ctx.showToast('Gagal menghapus data program.', 'error');
      }
    }
  };

  const startEditProg = (prog: any) => {
    setEditingProgId(prog.id);
    setEditProgData({ ...prog });
  };

  const saveProg = async () => {
    try {
      await ctx.updateProgram(editingProgId, editProgData);
      setEditingProgId(null);
      ctx.showToast('Jadwal program berhasil diperbarui!', 'success');
    } catch (error) {
      ctx.showToast('Gagal memperbarui program.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center"><Settings className="mr-3 text-blue-600 w-8 h-8" /> Pengaturan Master Data</h2>
      
      <div className="flex space-x-4 border-b border-slate-200 mb-8">
        <button onClick={() => setTab('pic')} className={`pb-3 px-4 font-black border-b-4 transition-colors ${tab === 'pic' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400'}`}>Manajemen Akun PIC & Program Baru</button>
        <button onClick={() => setTab('program')} className={`pb-3 px-4 font-black border-b-4 transition-colors ${tab === 'program' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400'}`}>Edit Jadwal & Anggaran</button>
      </div>

      {tab === 'pic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-28">
              <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-emerald-600"/> Tambah PIC & Program Baru</h3>
              <form onSubmit={handleAddPIC} className="space-y-4">
                
                {/* Data PIC */}
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
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Divisi / Departemen</label>
                    <input type="text" value={newAcc.division} onChange={e => setNewAcc({...newAcc, division: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Cth: IT Support" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cabang Olahraga (Wajib)</label>
                    <input type="text" required value={newAcc.sport} onChange={e => setNewAcc({...newAcc, sport: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold text-blue-900" placeholder="Cth: Tenis Meja" />
                  </div>
                </div>

                {/* Data Program & Budget */}
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
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-md hover:-translate-y-0.5 transition-all">Buat PIC & Program Sekarang</button>
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
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Username</th>
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Cabang Olahraga</th>
                      <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ctx.accounts.filter((a: any) => a.role === ROLES.PIC).map((pic: any) => (
                      <tr key={pic.id} className="hover:bg-blue-50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-800 text-sm">{pic.name}</p>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">{pic.division || '-'}</p>
                        </td>
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

      {tab === 'program' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-black text-slate-800 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-indigo-600"/> Jadwal Master & Plafon Anggaran Bulanan</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">Perubahan pada data ini akan langsung mempengaruhi limit pengajuan PIC dan master kalender di Dashboard.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider w-1/6">Program</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider w-1/6">Jadwal (Hari)</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider w-1/5">Frekuensi /Bulan</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Biaya /Sesi</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider">Biaya Admin</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider text-right">Total Plafon</th>
                  <th className="p-4 font-black text-slate-500 text-[10px] uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ctx.programs.map((prog: any) => {
                  const isEditing = editingProgId === prog.id;
                  return (
                    <tr key={prog.id} className={`${isEditing ? 'bg-indigo-50' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="p-4 font-black text-blue-900">{prog.sport}</td>
                      <td className="p-4">
                        {isEditing ? (
                          <input type="text" className="w-full p-2 border-2 border-indigo-200 rounded-lg text-sm font-bold outline-none" value={editProgData.day} onChange={e => setEditProgData({...editProgData, day: e.target.value})} />
                        ) : <span className="font-bold text-slate-700">{prog.day}</span>}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input type="number" className="w-16 p-2 border-2 border-indigo-200 rounded-lg text-sm font-bold text-center outline-none" value={editProgData.freqNum} onChange={e => setEditProgData({...editProgData, freqNum: Number(e.target.value)})} />
                            <input type="text" className="w-full p-2 border-2 border-indigo-200 rounded-lg text-sm font-bold outline-none" value={editProgData.freqText} onChange={e => setEditProgData({...editProgData, freqText: e.target.value})} />
                          </div>
                        ) : <div><span className="font-bold text-slate-700">{prog.freqText}</span> <span className="text-xs text-slate-400">({prog.freqNum}x)</span></div>}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input type="number" className="w-full p-2 border-2 border-indigo-200 rounded-lg text-sm font-bold outline-none" value={editProgData.costPerSession} onChange={e => setEditProgData({...editProgData, costPerSession: Number(e.target.value)})} />
                        ) : <span className="font-bold text-slate-700">{formatCurrency(prog.costPerSession)}</span>}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input type="number" className="w-full p-2 border-2 border-indigo-200 rounded-lg text-sm font-bold outline-none" value={editProgData.adminFee} onChange={e => setEditProgData({...editProgData, adminFee: Number(e.target.value)})} />
                        ) : <span className="font-bold text-slate-700">{formatCurrency(prog.adminFee)}</span>}
                      </td>
                      <td className="p-4 font-black text-emerald-700 text-right">
                        {formatCurrency(isEditing ? calculateProgramTotal(editProgData) : calculateProgramTotal(prog))}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <button onClick={saveProg} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"><Save size={16}/></button>
                        ) : (
                          <>
                            <button onClick={() => startEditProg(prog)} className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors"><Edit3 size={16}/></button>
                            <button onClick={() => handleDeleteProgram(prog.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-colors ml-2"><Trash2 size={16}/></button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-blue-50">
                  <td colSpan="5" className="p-4 font-black text-right text-blue-900 uppercase tracking-wider text-xs">Grand Total Plafon / Bulan</td>
                  <td className="p-4 font-black text-xl text-blue-900 text-right">
                    {formatCurrency(ctx.programs.reduce((acc: any, p: any) => acc + calculateProgramTotal(p), 0))}
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
  const [user, setUser] = useState<any>(null);
  const [fbUser, setFbUser] = useState<any>(null); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [events, setEvents] = useState<any[]>([]); 
  const [accounts, setAccounts] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [view, setView] = useState('dashboard');
  
  const [toast, setToast] = useState<any>({ show: false, msg: '', type: 'success' });
  const [detailModalEvent, setDetailModalEvent] = useState<any>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  const openPreview = (fileObj: any) => setPreviewFile(fileObj);
  const openModal = (evt: any) => setDetailModalEvent(evt);

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

  // 2. FIREBASE: Data Sync (Real-time onSnapshot) dengan Loader Aman
  useEffect(() => {
    if (!fbUser) return;

    let unsubEvents = () => {};
    let unsubAccounts = () => {};
    let unsubPrograms = () => {};

    try {
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
      const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
      const programsRef = collection(db, 'artifacts', appId, 'public', 'data', 'programs');

      let eventsLoaded = false;
      let accountsLoaded = false;
      let programsLoaded = false;

      const checkAllLoaded = () => {
        if (eventsLoaded && accountsLoaded && programsLoaded) {
          setIsDataLoaded(true);
        }
      }

      unsubEvents = onSnapshot(eventsRef, (snap) => {
        setEvents(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        eventsLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Events load err", err); eventsLoaded = true; checkAllLoaded(); });

      unsubAccounts = onSnapshot(accountsRef, (snap) => {
        setAccounts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        accountsLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Accounts load err", err); accountsLoaded = true; checkAllLoaded(); });

      unsubPrograms = onSnapshot(programsRef, (snap) => {
        setPrograms(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        programsLoaded = true; checkAllLoaded();
      }, (err) => { console.error("Programs load err", err); programsLoaded = true; checkAllLoaded(); });

    } catch (error) {
      console.error("Firestore setup error:", error);
    }

    return () => { unsubEvents(); unsubAccounts(); unsubPrograms(); };
  }, [fbUser]);

  // 3. FIREBASE: Auto-Seed Initial Data if Database is completely empty
  useEffect(() => {
    if (isDataLoaded && accounts.length === 0 && fbUser) {
      const seedDatabase = async () => {
        for (const acc of INITIAL_ACCOUNTS) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', acc.id), acc);
        }
        for (const prog of INITIAL_PROGRAMS) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', prog.id), prog);
        }
        for (const evt of INITIAL_EVENTS) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', evt.id), evt);
        }
      };
      seedDatabase();
    }
  }, [isDataLoaded, accounts.length, fbUser]);

  // --- CLOUD MUTATION FUNCTIONS ---
  const addEvent = async (newEvent: any) => {
    setEvents(prev => [...prev, newEvent]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', newEvent.id), newEvent); } catch(e) {}
  };
  const updateEvent = async (id: string, updates: any) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), updates); } catch(e) {}
  };
  const deleteEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id)); } catch(e) {}
  };
  
  const addAccount = async (newAcc: any) => {
    setAccounts(prev => [...prev, newAcc]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', newAcc.id), newAcc); } catch(e) {}
  };
  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', id)); } catch(e) {}
  };
  
  const addProgram = async (newProg: any) => {
    setPrograms(prev => [...prev, newProg]);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', newProg.id), newProg); } catch(e) {}
  };
  const updateProgram = async (id: string, updates: any) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', id), updates); } catch(e) {}
  };
  const deleteProgram = async (id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'programs', id)); } catch(e) {}
  };

  const ctx = { 
    user, setUser, 
    events, addEvent, updateEvent, deleteEvent, 
    view, setView, 
    accounts, addAccount, deleteAccount, 
    programs, addProgram, updateProgram, deleteProgram,
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

  const picPendingReport = events.filter(e => e.pic_id === user.id && e.status === 'funded').length;
  const adminPendingAction = events.filter(e => ['pending_approval', 'pending_settlement'].includes(e.status)).length;

  const NavBtn = ({ id, label, icon, badge }: any) => (
    <button onClick={() => setView(id)} className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${view === id ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
      {icon} <span className="ml-2.5 hidden lg:block">{label}</span>
      {badge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-sm border-2 border-white animate-pulse">{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 selection:bg-blue-200 relative">
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-red-50 p-2 rounded-lg border border-red-100"><HeartPulse className="text-red-600 w-6 h-6" /></div>
          <h1 className="text-xl font-black text-slate-800 hidden lg:block tracking-tight">Meratus <span className="text-blue-600">Happiness</span></h1>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          <div className="flex space-x-2 mr-4 border-r border-slate-200 pr-4">
            <NavBtn id="dashboard" label="Dashboard" icon={<PieChart size={18} />} />
            {user.role === ROLES.PIC && (
              <>
                <NavBtn id="new_proposal" label="Pengajuan" icon={<Plus size={18} />} />
                <NavBtn id="reporting" label="Laporan Akhir" icon={<Upload size={18} />} badge={picPendingReport} />
              </>
            )}
            {user.role === ROLES.ADMIN && (
              <>
                <NavBtn id="approvals" label="Pusat Validasi" icon={<CheckSquare size={18} />} badge={adminPendingAction} />
                <NavBtn id="master_data" label="Pengaturan" icon={<Settings size={18} />} />
              </>
            )}
            <NavBtn id="database" label="Arsip Data" icon={<Database size={18} />} />
          </div>
          <div className="flex items-center pl-2">
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-sm font-black text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{user.role === ROLES.ADMIN ? 'Admin Pusat' : `PIC ${user.sport}`}</p>
            </div>
            <button onClick={() => { setUser(null); setView('dashboard'); }} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors shadow-sm">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <main className="p-4 md:p-8 relative">
        {view === 'dashboard' && <ViewDashboard ctx={ctx} />}
        {view === 'new_proposal' && <ViewNewProposal ctx={ctx} />}
        {view === 'reporting' && <ViewReporting ctx={ctx} />}
        {view === 'approvals' && <ViewAdminApprovals ctx={ctx} />}
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
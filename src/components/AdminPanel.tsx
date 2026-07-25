import React, { useState } from 'react';
import { TestModule, UserProfile, UserAttempt, Question, isAdminEmail } from '../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, FileText, PlusCircle, Upload, Sparkles, CheckCircle, Trash2, ChevronRight, ShieldAlert, FileType, Check, ArrowRight, RefreshCw, Eye } from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  users: UserProfile[];
  modules: TestModule[];
  attempts: UserAttempt[];
  onRefreshData: () => void;
}

export const AdminPanel: React.FC<Props> = ({
  currentUser,
  users,
  modules,
  attempts,
  onRefreshData,
}) => {
  const isAdmin = currentUser?.role === 'admin' || isAdminEmail(currentUser?.email);

  const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'wizard'>('users');

  // 3-Step Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedLevel, setSelectedLevel] = useState<string>('Level 1');
  const [testTitle, setTestTitle] = useState<string>('1-modul — Test 3');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [extractedModule, setExtractedModule] = useState<TestModule | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedModuleView, setSelectedModuleView] = useState<TestModule | null>(null);

  // Strict Security Check
  if (!isAdmin) {
    return (
      <div className="wrap max-w-lg my-12 text-center animate-fade-in">
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-8 shadow-lg">
          <ShieldAlert className="w-16 h-16 text-rose-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-rose-900 mb-2">Ruxsat Etilmadi</h2>
          <p className="text-sm text-rose-700 leading-relaxed">
            Admin panelga faqat tasdiqlangan administratorlar (<strong>ismoilovshohjahon750@gmail.com, ranvar611@gmail.com</strong>) ruxsat olgan.
          </p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!selectedFile && !pastedText.trim()) {
      setAiError("Iltimos, PDF fayl yuklang yoki savollar matnini kiriting.");
      return;
    }

    setLoadingAI(true);
    setAiError(null);

    try {
      let pdfBase64 = '';
      if (selectedFile) {
        const reader = new FileReader();
        pdfBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Clean = result.split(',')[1] || result;
            resolve(base64Clean);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      const response = await fetch('/api/ai/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          mimeType: selectedFile?.type || 'application/pdf',
          rawText: pastedText,
          level: selectedLevel,
          testTitle: testTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "AI tahlilida kutilmagan xatolik yuz berdi.");
      }

      if (data.module && data.module.id) {
        await setDoc(doc(db, 'testModules', data.module.id), data.module);
      }

      setExtractedModule(data.module);
      setWizardStep(3);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "PDF tahlili muvaffaqiyatsiz bo'ldi.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu test modulini o'chirib tashlamoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, 'testModules', id));
      await fetch(`/api/modules/${id}`, { method: 'DELETE' }).catch(() => {});
      onRefreshData();
      if (selectedModuleView?.id === id) setSelectedModuleView(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="wrap animate-fade-in">
      {/* Admin Panel Header & Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Administrative Dashboard
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              IC3 GS6 Boshqaruv Paneli
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Foydalanuvchilar statistikasi, savollar bazasi va AI orqali PDF savollarni tahlil qilish.
            </p>
          </div>

          <button
            onClick={onRefreshData}
            className="btn btn-secondary text-xs py-2 px-3 self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Ma'lumotlarni yangilash
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" /> Foydalanuvchilar ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'questions'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Savollar va Testlar ({modules.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('wizard');
              setWizardStep(1);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'wizard'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> + Yangi savol qo'shish (3-Step Wizard)
          </button>
        </div>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Ro'yxatdan O'tgan Foydalanuvchilar
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="p-3.5 rounded-l-xl">Foydalanuvchi</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Rol</th>
                  <th className="p-3.5">Topshirgan Testlari</th>
                  <th className="p-3.5">O'rtacha Ball</th>
                  <th className="p-3.5 rounded-r-xl">So'nggi Faollik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition">
                    <td className="p-3.5 font-bold text-gray-900 flex items-center gap-3">
                      <img
                        src={u.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
                        alt={u.name}
                        className="w-9 h-9 rounded-full bg-indigo-50 border border-gray-200"
                      />
                      {u.name}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-gray-600">{u.email}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-gray-700">{u.testsTaken} ta</td>
                    <td className="p-3.5 font-bold text-emerald-600">{u.avgScore}%</td>
                    <td className="p-3.5 text-xs text-gray-500">{u.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXISTING QUESTIONS & MODULES */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {modules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-xl mx-auto my-4">
              <FileText className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Hozircha hech qanday test moduli mavjud emas</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Yangi test moduli yaratish uchun yuqoridagi <strong>"+ Yangi savol qo'shish (3-Step Wizard)"</strong> tugmasini bosing va PDF test faylingizni yuklang.
              </p>
              <button
                onClick={() => setActiveTab('add-ai')}
                className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              >
                <PlusCircle className="w-4 h-4" /> PDF dan Test Yaratish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                        {m.level}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">
                        {m.questions.length} ta savol
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{m.title}</h3>
                    <p className="text-xs text-gray-500">
                      Baza moduli kodi: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{m.id}</code>
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedModuleView(m)}
                      className="btn btn-secondary text-xs py-1.5 px-3"
                    >
                      <Eye className="w-3.5 h-3.5" /> Savollarni ko'rish
                    </button>
                    <button
                      onClick={() => handleDeleteModule(m.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      title="Modulni o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Module Question Detail Modal */}
          {selectedModuleView && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-lg mt-6">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedModuleView.title} — Savollar ro'yxati
                </h3>
                <button
                  onClick={() => setSelectedModuleView(null)}
                  className="btn btn-secondary text-xs"
                >
                  Yopish
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {selectedModuleView.questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="font-bold text-sm text-gray-900 mb-1">
                      #{idx + 1}. {q.quz}
                    </div>
                    <div className="text-xs text-gray-500 italic mb-2">{q.qen}</div>
                    <div className="text-xs font-semibold text-indigo-600 uppercase">
                      Tur: {q.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 3-STEP WIZARD FOR ADDING NEW QUESTIONS */}
      {activeTab === 'wizard' && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg">
          {/* Wizard Stepper Bar */}
          <div className="flex items-center justify-between max-w-xl mx-auto mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-300"
              style={{
                width: wizardStep === 1 ? '0%' : wizardStep === 2 ? '50%' : '100%',
              }}
            />

            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                wizardStep >= 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
              }`}
            >
              1
            </div>
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                wizardStep >= 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </div>
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                wizardStep >= 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
              }`}
            >
              3
            </div>
          </div>

          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {wizardStep === 1 && "Bosqich 1: Murakkablik va Test Nomini Tanlash"}
              {wizardStep === 2 && "Bosqich 2: PDF Hujjatini Yuklash"}
              {wizardStep === 3 && "Bosqich 3: AI Tahlili va Natijani Saqlash"}
            </span>
          </div>

          {/* STEP 1: SELECT DIFFICULTY & TITLE */}
          {wizardStep === 1 && (
            <div className="max-w-md mx-auto space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  1. Murakkablik Darajasini Tanlang:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['Level 1', 'Level 2', 'Level 3'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`p-3 rounded-2xl border-2 font-bold text-xs text-center transition ${
                        selectedLevel === lvl
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  2. Test/Modul Nomi:
                </label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Masalan: 1-modul — Test 3"
                  className="w-full p-3.5 border border-gray-300 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={() => setWizardStep(2)}
                className="w-full btn btn-primary py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm shadow-md"
              >
                Keyingi Bosqichga O'tish <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PDF UPLOAD */}
          {wizardStep === 2 && (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
              <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 rounded-3xl p-8 text-center transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">
                  {selectedFile ? selectedFile.name : "PDF faylni shu yerga tashlang yoki bosing"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, TXT va DOC fayllari qo'llab-quvvatlanadi (maks. 15MB)
                </p>
                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" /> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB tayyor
                  </div>
                )}
              </div>

              <div className="relative text-center">
                <span className="bg-white px-3 text-xs text-gray-400 font-bold uppercase">Yoki matn nusxasini qo'ying</span>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="PDF savollari va kalitlar jadvali matnini shu yerga qo'ying..."
                  className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {aiError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold">
                  {aiError}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setWizardStep(1)}
                  className="btn btn-secondary text-xs py-3 px-5 rounded-2xl"
                >
                  Orqaga
                </button>
                <button
                  onClick={handleRunAIAnalysis}
                  disabled={loadingAI}
                  className="btn btn-primary py-3.5 px-8 rounded-2xl text-sm font-bold shadow-md flex items-center gap-2"
                >
                  {loadingAI ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      AI PDF tahlili va Kalitlar jadvalini moslashtirish...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" /> AI Tahlilini Boshlash
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: AI RESULTS & AUTO-SAVED PREVIEW */}
          {wizardStep === 3 && extractedModule && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  AI Tahlili Muvaffaqiyatli Yakunlandi! 🎉
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  PDF tahlil qilindi, Kalitlar jadvali moslashtirildi va <strong>{extractedModule.questions.length} ta savol</strong> avtomattik ravishda bazaga saqlandi va talabalar uchun tayyorlandi!
                </p>
              </div>

              {/* Preview extracted questions */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left max-h-60 overflow-y-auto space-y-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Ajratalgan savollar namunasi:
                </div>
                {extractedModule.questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-2.5 bg-white rounded-xl border text-xs">
                    <span className="font-bold text-gray-900">#{qIdx + 1}. {q.quz}</span>
                    <span className="ml-2 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                      {q.type}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setActiveTab('questions');
                  }}
                  className="btn btn-primary py-3 px-6 rounded-2xl text-xs font-bold"
                >
                  Barcha Testlarni Ko'rish
                </button>
                <button
                  onClick={() => {
                    setWizardStep(1);
                    setSelectedFile(null);
                    setPastedText('');
                    setExtractedModule(null);
                  }}
                  className="btn btn-secondary py-3 px-6 rounded-2xl text-xs font-bold"
                >
                  Yana Savol Qo'shish
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

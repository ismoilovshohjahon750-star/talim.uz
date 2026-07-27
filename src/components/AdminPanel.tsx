import React, { useState } from 'react';
import { TestModule, UserProfile, UserAttempt, Question, isAdminEmail, getNormalizedSubject } from '../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, FileText, PlusCircle, Upload, Sparkles, CheckCircle, Trash2, ChevronRight, ShieldAlert, FileType, Check, ArrowRight, RefreshCw, Eye, DollarSign, Lock, Unlock, Tag, Edit3, Save, Dna, Laptop, Zap, FlaskConical, BookOpen } from 'lucide-react';

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
  const [selectedSubject, setSelectedSubject] = useState<string>('Biologiya');
  const [selectedLevel, setSelectedLevel] = useState<string>('Level 1');
  const [testTitle, setTestTitle] = useState<string>('1-Mavzu: Kirish va Asoslar');
  const [wizardIsPaid, setWizardIsPaid] = useState<boolean>(false);
  const [wizardPrice, setWizardPrice] = useState<number>(5);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [extractedModule, setExtractedModule] = useState<TestModule | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedModuleView, setSelectedModuleView] = useState<TestModule | null>(null);

  // Pricing State
  const [editingPriceModuleId, setEditingPriceModuleId] = useState<string | null>(null);
  const [tempIsPaid, setTempIsPaid] = useState<boolean>(false);
  const [tempPrice, setTempPrice] = useState<number>(5);

  const handleSaveModulePrice = async (moduleId: string, isPaid: boolean, price: number) => {
    const validPrice = Math.min(10, Math.max(4, Number(price) || 5));
    try {
      await setDoc(doc(db, 'testModules', moduleId), { isPaid, price: isPaid ? validPrice : null }, { merge: true });
      await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid, price: isPaid ? validPrice : null }),
      }).catch(() => {});
      setEditingPriceModuleId(null);
      onRefreshData();
    } catch (err) {
      console.error('Price save error:', err);
    }
  };

  const handleToggleQuestionPaid = (idx: number, isPaid: boolean, price: number = 5) => {
    if (!selectedModuleView) return;
    const updatedQuestions = [...selectedModuleView.questions];
    updatedQuestions[idx] = {
      ...updatedQuestions[idx],
      isPaid,
      price: isPaid ? Math.min(10, Math.max(4, price)) : undefined,
    };
    setSelectedModuleView({
      ...selectedModuleView,
      questions: updatedQuestions,
    });
  };

  const handleSaveQuestionPrices = async () => {
    if (!selectedModuleView) return;
    try {
      await setDoc(
        doc(db, 'testModules', selectedModuleView.id),
        { questions: selectedModuleView.questions },
        { merge: true }
      );
      onRefreshData();
      alert("Savollar narxlari muvaffaqiyatli saqlandi!");
    } catch (err) {
      console.error(err);
      alert("Saqlashda xatolik yuz berdi.");
    }
  };

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
          subject: selectedSubject,
          level: selectedLevel,
          testTitle: testTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "AI tahlilida kutilmagan xatolik yuz berdi.");
      }

      if (data.module && data.module.id) {
        const moduleToSave = {
          ...data.module,
          subject: selectedSubject || 'Biologiya',
          isPaid: wizardIsPaid,
          price: wizardIsPaid ? Math.min(10, Math.max(4, wizardPrice)) : null,
        };
        await setDoc(doc(db, 'testModules', data.module.id), moduleToSave);
        data.module = moduleToSave;
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
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-200/80 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Boshqaruv Boshqaruvi (Admin Panel)
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              UniTest Boshqaruv Markazi
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Foydalanuvchilar statistikasi, savollar bazasi va AI PDF tahlil vositasi.
            </p>
          </div>

          <button
            onClick={onRefreshData}
            className="btn btn-secondary text-xs py-2 px-3.5 self-start md:self-auto rounded-xl active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Yangilash
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition active:scale-95 shrink-0 ${
              activeTab === 'users'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Foydalanuvchilar ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition active:scale-95 shrink-0 ${
              activeTab === 'questions'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Savollar & Testlar ({modules.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('wizard');
              setWizardStep(1);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition active:scale-95 shrink-0 ${
              activeTab === 'wizard'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
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
                onClick={() => {
                  setActiveTab('wizard');
                  setWizardStep(1);
                }}
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
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold bg-indigo-600 text-white px-2.5 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                          <span>
                            {getNormalizedSubject(m) === 'Biologiya' ? (
                              <Dna className="w-3.5 h-3.5" />
                            ) : getNormalizedSubject(m).includes('Informatika') ? (
                              <Laptop className="w-3.5 h-3.5" />
                            ) : getNormalizedSubject(m) === 'Fizika' ? (
                              <Zap className="w-3.5 h-3.5" />
                            ) : getNormalizedSubject(m) === 'Kimyo' ? (
                              <FlaskConical className="w-3.5 h-3.5" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5" />
                            )}
                          </span> {getNormalizedSubject(m)}
                        </span>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                          {m.level}
                        </span>
                        {m.isPaid ? (
                          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-200">
                            <Lock className="w-3 h-3 text-amber-600" /> Pullik (${m.price || 5})
                          </span>
                        ) : (
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                            <Unlock className="w-3 h-3 text-emerald-600" /> Bepul
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-semibold">
                        {(m.questions || []).length} ta savol
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">{m.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Baza moduli kodi: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{m.id}</code>
                    </p>

                    {/* Pricing Management Form per Module */}
                    {editingPriceModuleId === m.id ? (
                      <div className="mt-3 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3 animate-fade-in">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-amber-600" /> Test Narxini Sozlash ($4 - $10)
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTempIsPaid(false)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              !tempIsPaid ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            Bepul
                          </button>
                          <button
                            type="button"
                            onClick={() => setTempIsPaid(true)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              tempIsPaid ? 'bg-amber-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            Pullik ($4 - $10)
                          </button>
                        </div>

                        {tempIsPaid && (
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-700">
                              Narxni tanlang ($4 dan $10 gacha):
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {[4, 5, 6, 7, 8, 9, 10].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setTempPrice(p)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    tempPrice === p
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  ${p}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60">
                          <button
                            type="button"
                            onClick={() => setEditingPriceModuleId(null)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveModulePrice(m.id, tempIsPaid, tempPrice)}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Saqlash
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceModuleId(m.id);
                          setTempIsPaid(!!m.isPaid);
                          setTempPrice(m.price || 5);
                        }}
                        className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-600" /> Narxini sozlash ({m.isPaid ? `$${m.price || 5}` : 'Bepul'})
                      </button>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedModuleView(m)}
                      className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Savollar va Narxlar
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

          {/* Module Question Detail & Price Editor Modal */}
          {selectedModuleView && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl mt-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b pb-4 gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedModuleView.title} — Savollar va Narx Sozlamalari
                  </h3>
                  <p className="text-xs text-gray-500">
                    Admin sifatida istalgan yakka savolni ham pullik ($4 - $10) deb belgilashingiz mumkin.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveQuestionPrices}
                    className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="w-4 h-4" /> O'zgarishlarni Saqlash
                  </button>
                  <button
                    onClick={() => setSelectedModuleView(null)}
                    className="btn btn-secondary text-xs py-2 px-3"
                  >
                    Yopish
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                {(selectedModuleView.questions || []).map((q, idx) => (
                  <div key={idx} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-gray-900 mb-1">
                          #{idx + 1}. {q.quz}
                        </div>
                        <div className="text-xs text-gray-500 italic">{q.qen}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">
                          {q.type}
                        </span>
                      </div>
                    </div>

                    {/* Question-level pricing toggle */}
                    <div className="pt-2 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">Ushbu savol:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionPaid(idx, false)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            !q.isPaid ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          Bepul
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionPaid(idx, true, q.price || 5)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            q.isPaid ? 'bg-amber-600 text-white shadow-xs' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          Pullik ($4 - $10)
                        </button>
                      </div>

                      {q.isPaid && (
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                          <span className="text-[11px] font-bold text-amber-900">Narxi:</span>
                          {[4, 5, 6, 7, 8, 9, 10].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleToggleQuestionPaid(idx, true, p)}
                              className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center transition ${
                                (q.price || 5) === p
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-amber-100'
                              }`}
                            >
                              ${p}
                            </button>
                          ))}
                        </div>
                      )}
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
              {wizardStep === 1 && "Bosqich 1: Murakkablik, Nom va Narxni Tanlash"}
              {wizardStep === 2 && "Bosqich 2: PDF Hujjatini Yuklash"}
              {wizardStep === 3 && "Bosqich 3: AI Tahlili va Natijani Saqlash"}
            </span>
          </div>

          {/* STEP 1: SELECT SUBJECT, DIFFICULTY, TITLE & PRICE */}
          {wizardStep === 1 && (
            <div className="max-w-md mx-auto space-y-5 animate-fade-in">
              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  1. Fan Bo'limi (Subject Section):
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['Biologiya', 'Informatika (IC3)', 'Fizika', 'Kimyo'].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubject(sub)}
                      className={`p-2.5 rounded-2xl border-2 font-bold text-xs text-center transition flex items-center justify-center gap-1.5 ${
                        selectedSubject === sub
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span>
                        {sub === 'Biologiya' ? (
                          <Dna className="w-3.5 h-3.5 text-indigo-600" />
                        ) : sub.includes('Informatika') ? (
                          <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                        ) : sub === 'Fizika' ? (
                          <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </span>
                      <span>{sub}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="Yoki custom fan nomini kiriting (masalan: Matematika)"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50"
                />
              </div>

              {/* Difficulty Level Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  2. Murakkablik Darajasi:
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
                  3. Test/Modul Nomi:
                </label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Masalan: 1-Mavzu: Hujayra biologiyasi"
                  className="w-full p-3.5 border border-gray-300 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Wizard Pricing Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  4. Test Turi va Narxi (Bepul yoki $4 - $10):
                </label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setWizardIsPaid(false)}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs text-center transition flex items-center justify-center gap-2 ${
                      !wizardIsPaid
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <Unlock className="w-4 h-4 text-emerald-600" /> Bepul (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardIsPaid(true)}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs text-center transition flex items-center justify-center gap-2 ${
                      wizardIsPaid
                        ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-xs'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-amber-600" /> Pullik ($4 - $10)
                  </button>
                </div>

                {wizardIsPaid && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-fade-in">
                    <span className="block text-xs font-bold text-amber-900">
                      Ushbu test uchun narxni tanlang ($4 - $10):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[4, 5, 6, 7, 8, 9, 10].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setWizardPrice(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            wizardPrice === p
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          ${p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                <h2 className="text-2xl font-black text-gray-900 inline-flex items-center justify-center gap-2">
                  <span>AI Tahlili Muvaffaqiyatli Yakunlandi!</span>
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  PDF tahlil qilindi, Kalitlar jadvali moslashtirildi va <strong>{(extractedModule.questions || []).length} ta savol</strong> avtomattik ravishda bazaga saqlandi va talabalar uchun tayyorlandi!
                </p>
              </div>

              {/* Preview extracted questions */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left max-h-60 overflow-y-auto space-y-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Ajratalgan savollar namunasi:
                </div>
                {(extractedModule.questions || []).map((q, qIdx) => (
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

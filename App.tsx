
import React, { useState, useEffect } from 'react';
import { generateStrategies, generateQuestionBank, extractTextFromFile } from './services/geminiService';
import { compressImage, generateConfigUrl } from './services/utils';
import { LessonDetails, Strategy } from './types';
import { Input, TextArea } from './components/Input';
import { Button } from './components/Button';
import { ReportView } from './components/ReportView';
import { LOGO_OMAR, LOGO_MOE, LOGO_RABBIT } from './constants';
import { BookOpen, Sparkles, Printer, School, FileQuestion, Upload, Settings, Lock, X, FileText, ImageIcon, Trash2, Loader2, RotateCcw, Building2, Rabbit, Key, Link as LinkIcon, Check, Send, MessageCircle } from 'lucide-react';

const TiktokIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.11-1.47-.21-.15-.42-.31-.61-.48-.02 3.47-.02 6.94-.02 10.41 0 1.52-.45 3.01-1.35 4.21-1.01 1.41-2.61 2.37-4.32 2.74-2.14.49-4.52.07-6.28-1.28-1.76-1.34-2.73-3.56-2.52-5.74.2-2.18 1.62-4.19 3.65-5 1.1-.45 2.32-.59 3.5-.42.01 1.34.01 2.69.01 4.03-.84-.13-1.74-.01-2.48.42-.74.42-1.29 1.17-1.45 2-.23 1.15.22 2.4 1.17 3.07.94.67 2.27.73 3.25.13 1.05-.62 1.62-1.85 1.62-3.05V.02z" />
  </svg>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('platform_api_key') || '');
  const [customLogo, setCustomLogo] = useState(() => localStorage.getItem('platform_custom_logo') || LOGO_OMAR);
  const [moeLogo, setMoeLogo] = useState(() => localStorage.getItem('platform_moe_logo') || LOGO_MOE);
  const [rabbitLogo, setRabbitLogo] = useState(() => localStorage.getItem('platform_rabbit_logo') || LOGO_RABBIT);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [password, setPassword] = useState('');
  const [attachedFile, setAttachedFile] = useState<{data: string, mimeType: string, name: string} | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(5);

  const [form, setForm] = useState<LessonDetails>(() => {
    const saved = localStorage.getItem('platform_lesson_form');
    return saved ? JSON.parse(saved) : {
      teacherName: '', schoolName: '', region: 'الرياض', subject: '', lessonTitle: '', gradeLevel: '', content: '', principalName: '', date: new Date().toLocaleDateString('ar-SA'),
    };
  });

  useEffect(() => {
    const { content, lessonTitle, ...persistent } = form;
    localStorage.setItem('platform_lesson_form', JSON.stringify(persistent));
  }, [form]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleContentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const rawBase64 = base64String.split(',')[1];
        setAttachedFile({ data: rawBase64, mimeType: file.type, name: file.name });
        setIsExtractingText(true);
        try {
          const text = await extractTextFromFile({ data: rawBase64, mimeType: file.type }, customApiKey);
          setForm(prev => ({ ...prev, content: prev.content + "\n" + text }));
        } catch (e: any) { alert(e.message); } finally { setIsExtractingText(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!form.subject || (!form.content && !attachedFile)) {
      alert('الرجاء إدخال المادة ومحتوى الدرس'); return;
    }
    setLoading(true);
    try {
      const res = await generateStrategies(form.content, form.gradeLevel, form.subject, questionsCount, attachedFile, customApiKey);
      setStrategies(res);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  if (selectedStrategy) {
    return <ReportView details={form} strategy={selectedStrategy} customLogo={customLogo} moeLogo={moeLogo} rabbitLogo={rabbitLogo} onBack={() => setSelectedStrategy(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={customLogo} className="h-10 w-10 rounded-full border-2 border-white bg-white" />
          <h1 className="text-xl font-bold">منصة الأستاذ عمر العيسى</h1>
        </div>
        <button onClick={() => setShowPasswordModal(true)} className="p-2 hover:bg-slate-800 rounded-full"><Settings size={20}/></button>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
        <div className="bg-slate-800/50 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="teacherName" label="اسم المعلم/ة" value={form.teacherName} onChange={handleInputChange} />
            <Input name="schoolName" label="المدرسة" value={form.schoolName} onChange={handleInputChange} />
            <Input name="subject" label="المادة" value={form.subject} onChange={handleInputChange} />
            <Input name="gradeLevel" label="الصف" value={form.gradeLevel} onChange={handleInputChange} />
          </div>
          <TextArea name="content" label="محتوى الدرس" value={form.content} onChange={handleInputChange} placeholder="الصق محتوى الدرس هنا..." />
          <div className="flex gap-4">
             <Button onClick={handleGenerate} isLoading={loading} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600">
                <Sparkles size={20}/> توليد الاستراتيجيات
             </Button>
             <label className="cursor-pointer bg-slate-700 px-6 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-slate-600">
                <ImageIcon size={20}/> تحليل ملف
                <input type="file" className="hidden" onChange={handleContentFileUpload} />
             </label>
          </div>
        </div>

        {strategies.length > 0 && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {strategies.map(s => (
              <div key={s.id} onClick={() => setSelectedStrategy(s)} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-emerald-500 cursor-pointer transition-all">
                <h3 className="text-xl font-bold text-emerald-400 mb-3">{s.name}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{s.mainIdea}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-2xl w-80">
            <h3 className="font-bold mb-4">الرمز السري</h3>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center mb-4" />
            <div className="flex gap-2">
              <Button onClick={() => {if(password==='1408') {setShowPasswordModal(false); setShowSettingsModal(true);}}} className="flex-1">دخول</Button>
              <Button onClick={()=>setShowPasswordModal(false)} variant="outline">إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">إعدادات المنصة</h3>
               <button onClick={()=>setShowSettingsModal(false)}><X/></button>
            </div>
            <div className="space-y-6">
               <div>
                  <label className="block text-sm mb-2">مفتاح API Gemini</label>
                  <input type="text" value={customApiKey} onChange={e=>{setCustomApiKey(e.target.value); localStorage.setItem('platform_api_key', e.target.value);}} className="w-full bg-slate-900 p-2 rounded-lg text-xs" />
               </div>
               <div className="flex justify-around gap-4">
                  <a href="https://t.me/omaralessa" className="flex flex-col items-center text-blue-400"><Send/><span className="text-[10px]">تيليجرام</span></a>
                  <a href="https://wa.me/966555270318" className="flex flex-col items-center text-green-400"><MessageCircle/><span className="text-[10px]">واتساب</span></a>
                  <a href="https://www.tiktok.com/@omaralessa25" className="flex flex-col items-center text-pink-400"><TiktokIcon/><span className="text-[10px]">تيك توك</span></a>
               </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-800/30 p-8 text-center border-t border-slate-800">
         <p className="text-gray-500 text-sm">جميع الحقوق محفوظة © منصة الأستاذ عمر العيسى 2025</p>
      </footer>
    </div>
  );
};

export default App;

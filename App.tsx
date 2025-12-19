
import React, { useState, useEffect } from 'react';
import { generateStrategies, generateQuestionBank, extractTextFromFile } from './services/geminiService';
import { compressImage, generateConfigUrl } from './services/utils';
import { LessonDetails, Strategy } from './types';
import { Input, TextArea } from './components/Input';
import { Button } from './components/Button';
import { ReportView } from './components/ReportView';
import { LOGO_OMAR, LOGO_MOE, LOGO_RABBIT } from './constants';
import { BookOpen, Sparkles, Printer, School, FileQuestion, Upload, Settings, Lock, X, FileText, ImageIcon, Trash2, Loader2, RotateCcw, Building2, Rabbit, Key, Link as LinkIcon, Check, Send, MessageCircle } from 'lucide-react';

// Custom TikTok Icon SVG
const TiktokIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.11-1.47-.21-.15-.42-.31-.61-.48-.02 3.47-.02 6.94-.02 10.41 0 1.52-.45 3.01-1.35 4.21-1.01 1.41-2.61 2.37-4.32 2.74-2.14.49-4.52.07-6.28-1.28-1.76-1.34-2.73-3.56-2.52-5.74.2-2.18 1.62-4.19 3.65-5 1.1-.45 2.32-.59 3.5-.42.01 1.34.01 2.69.01 4.03-.84-.13-1.74-.01-2.48.42-.74.42-1.29 1.17-1.45 2-.23 1.15.22 2.4 1.17 3.07.94.67 2.27.73 3.25.13 1.05-.62 1.62-1.85 1.62-3.05V.02z" />
  </svg>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  
  // State for initial view mode if loaded from a share link
  const [initialViewMode, setInitialViewMode] = useState<'report' | 'game' | 'cards'>('report');

  // --- SETTINGS STATES ---
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
     if (typeof window !== 'undefined') return localStorage.getItem('platform_api_key') || '';
     return '';
  });

  const [customLogo, setCustomLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('platform_custom_logo') || LOGO_OMAR;
    }
    return LOGO_OMAR;
  });

  const [moeLogo, setMoeLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('platform_moe_logo') || LOGO_MOE;
    }
    return LOGO_MOE;
  });

  const [rabbitLogo, setRabbitLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('platform_rabbit_logo') || LOGO_RABBIT;
    }
    return LOGO_RABBIT;
  });
  
  // Settings UI State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [password, setPassword] = useState('');
  const [configCopied, setConfigCopied] = useState(false);

  // Attached File State for Analysis
  const [attachedFile, setAttachedFile] = useState<{data: string, mimeType: string, name: string} | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);

  // Questions Count State
  const [questionsCount, setQuestionsCount] = useState<number>(5);

  const [form, setForm] = useState<LessonDetails>(() => {
    const savedForm = typeof window !== 'undefined' ? localStorage.getItem('platform_lesson_form') : null;
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        return {
          ...parsed,
          date: new Date().toLocaleDateString('ar-SA') // Always fresh date
        };
      } catch (e) {
        console.error("Error parsing saved form", e);
      }
    }
    return {
      teacherName: '',
      schoolName: '',
      region: 'الرياض',
      subject: '',
      lessonTitle: '',
      gradeLevel: '',
      content: '',
      principalName: '',
      date: new Date().toLocaleDateString('ar-SA'),
    };
  });

  // Save form basic details to localStorage (except content/title)
  useEffect(() => {
    const { content, lessonTitle, date, ...persistentDetails } = form;
    localStorage.setItem('platform_lesson_form', JSON.stringify(persistentDetails));
  }, [form]);

  // Check for shared data (Lesson OR Configuration) in URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Check for Configuration Share (Logos & Key)
    const configData = params.get('config');
    if (configData) {
        try {
            const decodedConfig = JSON.parse(decodeURIComponent(configData));
            
            if (decodedConfig.cl) {
                setCustomLogo(decodedConfig.cl);
                localStorage.setItem('platform_custom_logo', decodedConfig.cl);
            }
            if (decodedConfig.ml) {
                setMoeLogo(decodedConfig.ml);
                localStorage.setItem('platform_moe_logo', decodedConfig.ml);
            }
            if (decodedConfig.rl) {
                setRabbitLogo(decodedConfig.rl);
                localStorage.setItem('platform_rabbit_logo', decodedConfig.rl);
            }
            if (decodedConfig.k) {
                const decodedKey = atob(decodedConfig.k);
                setCustomApiKey(decodedKey);
                localStorage.setItem('platform_api_key', decodedKey);
            }
            alert('تم تطبيق إعدادات المنصة (الشعارات والمفاتيح) بنجاح!');
        } catch (e) {
            console.error("Failed to parse config", e);
        }
    }

    // 2. Check for Lesson Share
    const shareData = params.get('share');
    if (shareData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        
        // Reconstruct form details
        setForm(prev => ({
          ...prev,
          lessonTitle: decoded.t || prev.lessonTitle,
          subject: decoded.s || prev.subject,
          gradeLevel: decoded.g || prev.gradeLevel,
          date: decoded.d || prev.date,
        }));

        // Reconstruct strategy
        const sharedStrategy: Strategy = {
          id: 'shared-1',
          name: decoded.sn || 'بطاقات الأسئلة',
          mainIdea: 'مجموعة بطاقات تفاعلية للدرس',
          objectives: [],
          implementationSteps: [],
          tools: [],
          questions: decoded.q || []
        };
        
        setSelectedStrategy(sharedStrategy);
        setInitialViewMode(decoded.v || 'cards'); 
      } catch (e) {
        console.error("Failed to parse shared data", e);
      }
    }
    
    if (shareData || configData) {
        window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomApiKey(e.target.value);
      localStorage.setItem('platform_api_key', e.target.value);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Logo = reader.result as string;
        const compressed = await compressImage(base64Logo, 200, 0.7);
        setCustomLogo(compressed);
        localStorage.setItem('platform_custom_logo', compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setCustomLogo(LOGO_OMAR);
    localStorage.removeItem('platform_custom_logo');
  };

  const handleMoeLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Logo = reader.result as string;
        const compressed = await compressImage(base64Logo, 200, 0.7);
        setMoeLogo(compressed);
        localStorage.setItem('platform_moe_logo', compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetMoeLogo = () => {
    setMoeLogo(LOGO_MOE);
    localStorage.removeItem('platform_moe_logo');
  };

  const handleRabbitLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Logo = reader.result as string;
        const compressed = await compressImage(base64Logo, 200, 0.7);
        setRabbitLogo(compressed);
        localStorage.setItem('platform_rabbit_logo', compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetRabbitLogo = () => {
    setRabbitLogo(LOGO_RABBIT);
    localStorage.removeItem('platform_rabbit_logo');
  };

  const handleShareConfig = async () => {
      const url = generateConfigUrl(customLogo, moeLogo, rabbitLogo, customApiKey);
      try {
          await navigator.clipboard.writeText(url);
          setConfigCopied(true);
          setTimeout(() => setConfigCopied(false), 3000);
      } catch (e) {
          alert('فشل نسخ الرابط، يرجى المحاولة يدوياً');
      }
  };

  const handleContentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const rawBase64 = base64String.split(',')[1];
        
        const fileData = {
          data: rawBase64,
          mimeType: file.type,
          name: file.name
        };
        
        setAttachedFile(fileData);

        setIsExtractingText(true);
        try {
          const extractedText = await extractTextFromFile(fileData, customApiKey);
          if (extractedText) {
            setForm(prev => ({
              ...prev,
              content: prev.content ? prev.content + "\n\n" + extractedText : extractedText
            }));
          }
        } catch (error: any) {
          console.error("Failed to extract text", error);
          alert(`تنبيه: ${error.message}`);
        } finally {
          setIsExtractingText(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachedFile = () => {
    setAttachedFile(null);
  };

  const handleGenerate = async () => {
    if ((!form.content && !attachedFile) || !form.subject) {
      alert('يرجى تعبئة الحقول الأساسية (المادة) وإدخال المحتوى (نص أو ملف)');
      return;
    }

    setLoading(true);
    try {
      const results = await generateStrategies(form.content, form.gradeLevel, form.subject, questionsCount, attachedFile, customApiKey);
      setStrategies(results);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'حدث خطأ أثناء توليد الاستراتيجيات. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if ((!form.content && !attachedFile) || !form.subject) {
      alert('يرجى تعبئة الحقول الأساسية (المادة) وإدخال المحتوى (نص أو ملف)');
      return;
    }

    setLoading(true);
    try {
      const results = await generateQuestionBank(form.content, form.gradeLevel, form.subject, questionsCount, attachedFile, customApiKey);
      setStrategies(results);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'حدث خطأ أثناء توليد بنك الأسئلة. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsClick = () => {
    setPassword('');
    setShowPasswordModal(true);
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1408') {
      setShowPasswordModal(false);
      setShowSettingsModal(true);
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  if (selectedStrategy) {
    return (
      <ReportView 
        details={form} 
        strategy={selectedStrategy} 
        customLogo={customLogo}
        moeLogo={moeLogo}
        rabbitLogo={rabbitLogo}
        onBack={() => {
           setSelectedStrategy(null);
           setInitialViewMode('report');
        }}
        initialMode={initialViewMode}
      />
    );
  }

  return (
    <div className="min-h-screen pb-10 bg-slate-900 text-slate-100 overflow-x-hidden relative flex flex-col">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#007f5f]/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-[#007f5f]/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
                 <div className="relative group shrink-0">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#007f5f] to-teal-400 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
                    <div className="relative h-10 w-10 md:h-12 md:w-12 rounded-full border-2 border-slate-900 bg-white overflow-hidden flex items-center justify-center">
                       <img src={customLogo} alt="Platform Logo" className="h-full w-full object-contain p-0.5" />
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <h1 className="text-sm md:text-xl font-bold text-white tracking-wide leading-tight text-right">منصة الأستاذ عمر العيسى</h1>
                    <p className="text-[10px] md:text-xs text-gray-400 hidden sm:block text-right">للتعلم النشط والابتكار التعليمي</p>
                 </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSettingsClick}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="الإعدادات"
              >
                <Settings size={20} />
              </button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl relative z-10 flex-grow">
        
        {/* Intro */}
        <div className="text-center mb-8 md:mb-10 mt-2 md:mt-4">
            <h2 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 md:mb-4 drop-shadow-sm leading-tight">
              مولد استراتيجيات التعلم النشط
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-lg">
                صمم دروسك بإبداع. أدخل التفاصيل، وسيقوم الذكاء الاصطناعي ببناء استراتيجيات تفاعلية وتقارير جاهزة للطباعة.
            </p>
        </div>

        {/* Form Area */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-8 mb-8 border border-slate-700 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007f5f] to-transparent opacity-50"></div>

            <div className="flex items-center gap-3 mb-6 md:mb-8 text-[#4ade80] border-b border-slate-700 pb-4">
                <School size={24} className="md:w-7 md:h-7 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                <h3 className="text-xl md:text-2xl font-bold text-white">بيانات الدرس الأساسية</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <Input name="teacherName" label="اسم المعلم/ة" placeholder="أ. محمد ...." value={form.teacherName} onChange={handleInputChange} />
                <Input name="principalName" label="اسم مدير/ة المدرسة" placeholder="أ. صالح ...." value={form.principalName} onChange={handleInputChange} />
                <Input name="schoolName" label="اسم المدرسة" placeholder="ابتدائية ...." value={form.schoolName} onChange={handleInputChange} />
                <Input name="region" label="إدارة التعليم (المنطقة)" placeholder="الرياض، جدة..." value={form.region} onChange={handleInputChange} />
                <Input name="subject" label="المادة الدراسية" placeholder="لغتي، رياضيات..." value={form.subject} onChange={handleInputChange} />
                <Input name="gradeLevel" label="الصف" placeholder="الخامس الابتدائي..." value={form.gradeLevel} onChange={handleInputChange} />
                <Input name="lessonTitle" label="عنوان الدرس" placeholder="الفاعل ونائب الفاعل..." value={form.lessonTitle} onChange={handleInputChange} />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input name="date" label="التاريخ" type="text" value={form.date} onChange={handleInputChange} />
                  </div>
                  <div className="w-1/3">
                    <div className="flex flex-col gap-2 w-full">
                       <label className="text-sm font-semibold text-gray-300">الأسئلة</label>
                       <input 
                         type="number" 
                         min="1" 
                         max="20"
                         className="bg-[#1e293b] border border-gray-600 text-white rounded-lg px-2 md:px-4 py-3 text-base focus:ring-2 focus:ring-[#007f5f] focus:border-[#007f5f] outline-none text-center"
                         value={questionsCount}
                         onChange={(e) => setQuestionsCount(parseInt(e.target.value) || 5)}
                       />
                    </div>
                  </div>
                </div>
            </div>

            <div className="mb-8">
                 <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-2 text-[#4ade80]">
                        <BookOpen size={20} />
                        <label className="font-bold text-gray-200 text-sm md:text-base">محتوى الدرس</label>
                     </div>
                     <div className="text-xs text-gray-400">نص أو ملف</div>
                 </div>
                 
                 <div className="relative">
                    <TextArea 
                        name="content" 
                        label="" 
                        placeholder={isExtractingText ? "جاري استخراج النص من الملف..." : "قم بلصق نص الدرس هنا، أو قم برفع صورة/ملف PDF للصفحة وسيتم استخراج النص تلقائيًا..."}
                        value={form.content} 
                        onChange={handleInputChange}
                        disabled={isExtractingText}
                        className={`min-h-[150px] text-base md:text-lg bg-slate-900/80 pb-16 transition-all ${isExtractingText ? 'animate-pulse bg-slate-800' : ''}`} 
                    />
                    
                    {isExtractingText && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg z-10">
                         <div className="flex flex-col items-center gap-2 text-[#4ade80]">
                            <Loader2 size={32} className="animate-spin" />
                            <span className="font-bold text-sm">جاري قراءة الملف...</span>
                         </div>
                      </div>
                    )}
                    
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                        {attachedFile ? (
                            <div className="flex items-center gap-2 bg-[#007f5f]/20 border border-[#007f5f] px-3 py-1.5 rounded-lg">
                                <FileText size={16} className="text-[#4ade80]" />
                                <span className="text-xs text-white max-w-[150px] truncate">{attachedFile.name}</span>
                                <button onClick={clearAttachedFile} className="text-gray-400 hover:text-red-400 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className={`cursor-pointer bg-slate-700 hover:bg-slate-600 text-gray-200 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center gap-2 shadow-sm border border-slate-600 ${isExtractingText ? 'opacity-50 pointer-events-none' : ''}`}>
                                <ImageIcon size={16} />
                                <span className="hidden sm:inline">تحليل صورة / PDF</span>
                                <span className="sm:hidden">ارفع ملف</span>
                                <input 
                                    type="file" 
                                    accept="image/*,application/pdf" 
                                    onChange={handleContentFileUpload} 
                                    className="hidden"
                                    disabled={isExtractingText}
                                />
                            </label>
                        )}
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-500 mt-2 mr-1">💡 يتم حفظ بياناتك الأساسية تلقائياً لاستخدامها لاحقاً.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleGenerate} isLoading={loading || isExtractingText} className="flex-1 py-3 md:py-4 text-base md:text-lg shadow-[0_0_20px_rgba(0,127,95,0.4)] hover:shadow-[0_0_30px_rgba(0,127,95,0.6)] transform hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r from-[#007f5f] to-teal-600 border-none">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                    توليد الاستراتيجيات
                </Button>
                
                <Button onClick={handleGenerateQuestions} isLoading={loading || isExtractingText} variant="secondary" className="flex-1 py-3 md:py-4 text-base md:text-lg transform hover:-translate-y-1 transition-all duration-300">
                    <FileQuestion className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                    بنك أسئلة (بطاقات)
                </Button>
            </div>
        </div>

        {/* Results */}
        {strategies.length > 0 && (
            <div className="animate-fade-in-up pb-10">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-6 md:mb-8 text-center flex items-center justify-center gap-3">
                   <span className="h-px w-8 md:w-12 bg-gray-700"></span>
                   الاستراتيجيات المقترحة
                   <span className="h-px w-8 md:w-12 bg-gray-700"></span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {strategies.map((strategy) => (
                        <div 
                            key={strategy.id} 
                            className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700 hover:border-[#007f5f] hover:shadow-[#007f5f]/20 hover:shadow-2xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                            onClick={() => setSelectedStrategy(strategy)}
                        >
                            <div className="bg-gradient-to-r from-[#007f5f] to-teal-700 p-4 flex justify-between items-center text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
                                <h4 className="font-bold text-base md:text-lg relative z-10">{strategy.name}</h4>
                                <Printer className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="p-4 md:p-6">
                                <p className="text-gray-300 line-clamp-3 mb-4 md:mb-6 text-sm leading-7 border-b border-slate-700 pb-4">{strategy.mainIdea}</p>
                                <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
                                    {strategy.tools.slice(0, 3).map((tool, idx) => (
                                        <span key={idx} className="bg-slate-700 border border-slate-600 text-teal-300 text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[#4ade80] font-bold text-sm flex items-center gap-2 group-hover:translate-x-[-5px] transition-transform text-right">
                                    عرض التقرير والطباعة <span>&larr;</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>

      {/* MODALS */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
           <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setShowPasswordModal(false)} className="absolute top-3 left-3 text-gray-400 hover:text-white"><X size={20}/></button>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 text-right"><Lock size={18} className="text-[#007f5f]"/> الدخول للإعدادات</h3>
              <form onSubmit={verifyPassword}>
                 <div className="mb-4">
                   <label className="block text-sm text-gray-400 mb-1 text-right">الرقم السري</label>
                   <input 
                     type="password" 
                     className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-[#007f5f] outline-none text-center tracking-widest text-lg"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     autoFocus
                   />
                 </div>
                 <button type="submit" className="w-full bg-[#007f5f] hover:bg-[#006048] text-white py-2 rounded-lg font-bold transition-colors">
                   دخول
                 </button>
              </form>
           </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
           <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 md:p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowSettingsModal(false)} className="absolute top-3 left-3 text-gray-400 hover:text-white"><X size={20}/></button>
              
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-3 text-right">
                 <Settings size={22} className="text-[#007f5f]"/> إعدادات المنصة
              </h3>

              <div className="space-y-6">
                 
                 {/* Links */}
                 <div className="grid grid-cols-3 gap-2">
                    <a href="https://t.me/omaralessa" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all">
                        <Send size={20} />
                        <span className="text-[10px] font-bold">تيليجرام</span>
                    </a>
                    <a href="https://wa.me/966555270318" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 hover:bg-green-500/20 transition-all">
                        <MessageCircle size={20} />
                        <span className="text-[10px] font-bold">واتساب</span>
                    </a>
                    <a href="https://www.tiktok.com/@omaralessa25" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl text-pink-400 hover:bg-pink-500/20 transition-all">
                        <TiktokIcon size={20} />
                        <span className="text-[10px] font-bold">تيك توك</span>
                    </a>
                 </div>

                 {/* API Key */}
                 <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-yellow-500 text-sm mb-2 flex items-center gap-2 text-right">
                        <Key size={16} /> مفتاح Gemini API
                    </h4>
                    <p className="text-[10px] text-gray-400 mb-3 leading-relaxed text-right">
                        مفتاحك الخاص لضمان استمرارية الخدمة.
                    </p>
                    <input 
                        type="text" 
                        placeholder="الصق مفتاح API هنا" 
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:border-[#007f5f] outline-none text-right"
                        value={customApiKey}
                        onChange={handleApiKeyChange}
                    />
                 </div>

                 {/* Config Share */}
                 <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                     <h4 className="font-bold text-blue-400 text-sm mb-2 flex items-center gap-2 text-right">
                        <LinkIcon size={16} /> تعميم الإعدادات
                     </h4>
                     <p className="text-[10px] text-gray-400 mb-3 text-right">مشاركة شعاراتك ومفتاحك مع بقية المستخدمين.</p>
                     <button 
                        onClick={handleShareConfig}
                        className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${configCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                     >
                        {configCopied ? <><Check size={16}/> تم النسخ</> : <><LinkIcon size={16}/> نسخ رابط التهيئة</>}
                     </button>
                 </div>

                 {/* Platform Logo */}
                 <div>
                    <h4 className="font-bold text-gray-300 text-sm mb-3 text-right">شعار المنصة (الأستاذ)</h4>
                    <div className="p-4 rounded-xl border border-dashed border-slate-500 bg-slate-900/50 flex flex-col items-center gap-4">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white p-1 flex items-center justify-center overflow-hidden border-2 border-slate-700 shadow-lg">
                             <img src={customLogo} alt="Current Logo" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex gap-2">
                          <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-slate-600">
                              <Upload size={14} /> رفع جديد
                              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                          {customLogo !== LOGO_OMAR && (
                             <button onClick={handleResetLogo} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 p-2 rounded-lg transition-colors" title="استعادة الافتراضي">
                               <RotateCcw size={14} />
                             </button>
                          )}
                        </div>
                    </div>
                 </div>

                 <button onClick={() => {
                    setShowSettingsModal(false);
                    // Force final confirmation save
                    localStorage.setItem('platform_api_key', customApiKey);
                    localStorage.setItem('platform_custom_logo', customLogo);
                    localStorage.setItem('platform_moe_logo', moeLogo);
                    localStorage.setItem('platform_rabbit_logo', rabbitLogo);
                 }} className="w-full bg-[#007f5f] hover:bg-[#006048] text-white py-3 rounded-lg font-bold transition-colors">
                   حفظ الإعدادات وإغلاق
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-slate-800/50 border-t border-slate-700 mt-auto">
        <div className="container mx-auto px-4 py-8 flex flex-col items-center gap-6 text-right">
            <div className="flex items-center gap-4 md:gap-6">
                 <a href="https://t.me/omaralessa" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-700 hover:bg-blue-600 rounded-full text-white transition-all shadow-lg group" title="تيليجرام">
                    <Send size={24} className="group-hover:scale-110 transition-transform" />
                 </a>
                 <a href="https://wa.me/966555270318" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-700 hover:bg-green-600 rounded-full text-white transition-all shadow-lg group" title="واتساب">
                    <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
                 </a>
                 <a href="https://www.tiktok.com/@omaralessa25" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-700 hover:bg-pink-600 rounded-full text-white transition-all shadow-lg group" title="تيك توك">
                    <TiktokIcon size={24} />
                 </a>
            </div>
            <div className="text-center">
                <p className="text-gray-300 font-bold mb-1">تواصل مع الأستاذ عمر العيسى</p>
                <div className="flex flex-wrap justify-center gap-4 text-xs md:text-sm text-gray-400">
                    <span>تيليجرام: @omaralessa</span>
                    <span>واتساب: 966555270318</span>
                    <span>تيك توك: @omaralessa25</span>
                </div>
            </div>
            <p className="text-gray-500 text-[10px] md:text-xs">جميع الحقوق محفوظة © منصة الأستاذ عمر العيسى {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;

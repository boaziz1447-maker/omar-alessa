
import React, { useState, useEffect } from 'react';
import { LessonDetails, Strategy } from '../types';
import { Printer, Play, ArrowRight, ArrowLeft, Eye, EyeOff, X, Grid, FileText, Check, X as XIcon, Users, Trophy, Shuffle, ImagePlus, Trash2, Disc, Circle, Star, Triangle, Square, Hexagon, Share2, ZoomIn, ZoomOut, LayoutGrid } from 'lucide-react';

interface ReportViewProps {
  details: LessonDetails;
  strategy: Strategy;
  customLogo: string;
  moeLogo: string;
  rabbitLogo: string;
  onBack: () => void;
  initialMode?: 'report' | 'game' | 'cards';
}

type ViewMode = 'report' | 'game' | 'cards';

interface MemoryCard { id: number; isTarget: boolean; content: string; isRevealed: boolean; }

export const ReportView: React.FC<ReportViewProps> = ({ details, strategy, customLogo, moeLogo, rabbitLogo, onBack, initialMode = 'report' }) => {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canPlaceMove, setCanPlaceMove] = useState(false); 
  const [evidenceImages, setEvidenceImages] = useState<(string | null)[]>([null, null, null, null]);
  
  // Games state
  const [xoBoard, setXoBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xoPlayer, setXoPlayer] = useState<'X' | 'O'>('X');
  const [xoWinner, setXoWinner] = useState<string | null>(null);
  
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [memoryPhase, setMemoryPhase] = useState<'setup' | 'shuffling' | 'guessing'>('setup');

  const isXO = strategy.name.includes("إكس") || strategy.name.includes("X");
  const isMemory = strategy.name.includes("الذاكرة") || strategy.name.includes("Memory");

  const handlePrint = () => window.print();

  const handleNext = () => {
    if (currentQuestionIndex < (strategy.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(v => v + 1);
      setShowAnswer(false);
      setCanPlaceMove(false);
    }
  };

  const handleCorrect = () => {
    setCanPlaceMove(true);
    if (!isXO && !isMemory) handleNext();
  };

  const handleXOClick = (idx: number) => {
    if (!canPlaceMove || xoBoard[idx] || xoWinner) return;
    const newBoard = [...xoBoard];
    newBoard[idx] = xoPlayer;
    setXoBoard(newBoard);
    
    // Check winner (Simplified logic)
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        setXoWinner(newBoard[a]);
      }
    }
    
    setXoPlayer(xoPlayer === 'X' ? 'O' : 'X');
    setCanPlaceMove(false);
    setShowAnswer(false);
    handleNext();
  };

  const handleEvidenceUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...evidenceImages];
        newImages[index] = reader.result as string;
        setEvidenceImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  if (mode === 'game') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-['Tajawal'] overflow-hidden">
        <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
          <button onClick={() => setMode('report')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X size={20} /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[#4ade80]">{strategy.name}</h2>
            <p className="text-xs text-gray-400">سؤال {currentQuestionIndex + 1} من {strategy.questions.length}</p>
          </div>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
           <div className="mb-8 p-8 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl w-full">
              <p className="text-2xl md:text-4xl font-extrabold leading-relaxed mb-8">
                {strategy.questions[currentQuestionIndex]?.question}
              </p>
              
              {!showAnswer ? (
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold text-xl shadow-lg transition-all"
                >
                  إظهار الإجابة
                </button>
              ) : (
                <div className="animate-in fade-in zoom-in duration-300">
                   <p className="text-[#4ade80] text-sm font-bold mb-2 uppercase tracking-widest">الإجابة الصحيحة</p>
                   <p className="text-3xl font-bold mb-8">{strategy.questions[currentQuestionIndex]?.answer}</p>
                   
                   {!canPlaceMove && (
                     <div className="flex gap-4 justify-center">
                        <button onClick={handleNext} className="bg-red-500/20 text-red-400 border border-red-500/30 px-8 py-3 rounded-xl flex items-center gap-2"><XIcon size={20}/> خطأ</button>
                        <button onClick={handleCorrect} className="bg-green-600 text-white px-10 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-green-900/30 font-bold"><Check size={20}/> إجابة صحيحة</button>
                     </div>
                   )}
                </div>
              )}
           </div>

           {isXO && (
             <div className={`grid grid-cols-3 gap-3 p-4 bg-slate-800 rounded-2xl w-72 h-72 md:w-96 md:h-96 ${!canPlaceMove ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                {xoBoard.map((val, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleXOClick(i)}
                    className="bg-slate-900 rounded-xl flex items-center justify-center text-4xl font-black border-2 border-slate-700 hover:border-[#4ade80] transition-all"
                  >
                    {val === 'X' && <XIcon size={48} className="text-blue-400" />}
                    {val === 'O' && <Circle size={48} className="text-red-400" />}
                  </button>
                ))}
             </div>
           )}
           
           {xoWinner && (
             <div className="mt-4 p-4 bg-green-500/20 border border-green-500 rounded-xl text-green-400 font-bold">
               الفائز هو: {xoWinner === 'X' ? 'الفريق الأزرق' : 'الفريق الأحمر'}! 🎉
               <button onClick={() => setXoBoard(Array(9).fill(null))} className="block mx-auto mt-2 underline text-xs">إعادة اللعب</button>
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Tajawal'] pb-20">
      {/* Navbar for Preview Mode */}
      <div className="no-print bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowRight size={20} />
          <span>رجوع للمحرر</span>
        </button>
        <div className="flex gap-2">
           <button onClick={() => setMode('game')} className="bg-[#007f5f] hover:bg-[#006048] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-[#007f5f]/20">
             <Play size={18} /> تشغيل اللعبة
           </button>
           <button onClick={handlePrint} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold">
             <Printer size={18} /> طباعة التقرير
           </button>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="print-content bg-white text-black rounded-3xl shadow-2xl overflow-hidden p-6 md:p-12 min-h-[1000px]">
          
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-4 border-[#007f5f] pb-8 mb-8">
             <div className="flex flex-col items-center gap-2 w-32">
                <img src={moeLogo} alt="MOE" className="h-20 object-contain" />
                <span className="text-[10px] font-bold text-gray-600 text-center">المملكة العربية السعودية<br/>وزارة التعليم</span>
             </div>
             
             <div className="text-center flex-1 px-4">
                <h1 className="text-2xl font-extrabold text-[#007f5f] mb-2">تقرير استراتيجية تعلم نشط</h1>
                <div className="bg-slate-100 py-2 px-4 rounded-lg inline-block">
                  <span className="text-lg font-bold text-gray-800">استراتيجية: {strategy.name}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-right text-sm font-medium">
                  <div className="flex justify-between border-b border-gray-200 py-1"><span>اسم المعلم/ة:</span> <span className="font-bold">{details.teacherName || '.......'}</span></div>
                  <div className="flex justify-between border-b border-gray-200 py-1"><span>المدرسة:</span> <span className="font-bold">{details.schoolName || '.......'}</span></div>
                  <div className="flex justify-between border-b border-gray-200 py-1"><span>المادة:</span> <span className="font-bold">{details.subject}</span></div>
                  <div className="flex justify-between border-b border-gray-200 py-1"><span>الصف:</span> <span className="font-bold">{details.gradeLevel}</span></div>
                  <div className="flex justify-between border-b border-gray-200 py-1"><span>الحصة:</span> <span className="font-bold">.......</span></div>
                  <div className="flex justify-between border-b border-gray-200 py-1"><span>التاريخ:</span> <span className="font-bold">{details.date}</span></div>
                </div>
             </div>

             <div className="flex flex-col items-center gap-2 w-32">
                <img src={customLogo} alt="Teacher Logo" className="h-20 object-contain rounded-full" />
                <span className="text-[10px] font-bold text-[#007f5f]">منصة الأستاذ عمر العيسى</span>
             </div>
          </div>

          {/* Strategy Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
               <section>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[#007f5f] mb-4 border-r-4 border-[#007f5f] pr-3">
                    <Star size={20} /> فكرة الاستراتيجية
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg bg-green-50/50 p-4 rounded-xl">
                    {strategy.mainIdea}
                  </p>
               </section>

               <section>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[#007f5f] mb-4 border-r-4 border-[#007f5f] pr-3">
                    <Check size={20} /> الأهداف السلوكية
                  </h3>
                  <ul className="grid grid-cols-1 gap-3">
                    {strategy.objectives.map((obj, i) => (
                      <li key={i} className="flex gap-3 bg-gray-50 p-3 rounded-lg border-r-4 border-blue-500">
                        <span className="font-bold text-blue-600">{i+1}.</span>
                        <span className="text-gray-800">{obj}</span>
                      </li>
                    ))}
                  </ul>
               </section>

               <section>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[#007f5f] mb-4 border-r-4 border-[#007f5f] pr-3">
                    <LayoutGrid size={20} /> خطوات التنفيذ
                  </h3>
                  <div className="space-y-4">
                    {strategy.implementationSteps.map((step, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="bg-[#007f5f] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 mt-1">{i+1}</div>
                        <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
               </section>
            </div>

            <div className="space-y-8">
               <section className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-gray-300">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">الأدوات المستخدمة</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {strategy.tools.map((tool, i) => (
                      <span key={i} className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200 font-bold text-[#007f5f]">
                        {tool}
                      </span>
                    ))}
                  </div>
               </section>

               {/* Evidence Photos */}
               <section className="no-print">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ImagePlus size={20} className="text-[#007f5f]" /> شواهد التنفيذ
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {evidenceImages.map((img, i) => (
                      <div key={i} className="relative group aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                         {img ? (
                           <>
                             <img src={img} className="w-full h-full object-cover" />
                             <button 
                               onClick={() => {
                                 const n = [...evidenceImages]; n[i] = null; setEvidenceImages(n);
                               }}
                               className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <Trash2 size={12} />
                             </button>
                           </>
                         ) : (
                           <label className="cursor-pointer flex flex-col items-center gap-1 text-gray-400 hover:text-[#007f5f] transition-colors">
                              <ImagePlus size={24} />
                              <span className="text-[10px] font-bold">رفع صورة</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleEvidenceUpload(i, e)} />
                           </label>
                         )}
                      </div>
                    ))}
                  </div>
               </section>
            </div>
          </div>

          {/* Question Bank (Optional Print) */}
          <section className="mt-12 pt-8 border-t-2 border-gray-100">
             <h3 className="text-xl font-bold text-[#007f5f] mb-6 text-center">بنك أسئلة الاستراتيجية</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategy.questions.map((q, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                     <p className="font-bold text-gray-800 mb-2">س {i+1}: {q.question}</p>
                     <p className="text-[#007f5f] font-bold text-sm">الإجابة: {q.answer}</p>
                  </div>
                ))}
             </div>
          </section>

          {/* Footer of Report */}
          <div className="mt-16 pt-8 border-t-4 border-gray-200 grid grid-cols-3 text-center text-sm font-bold gap-8">
             <div className="space-y-12">
               <p>معلم/ة المادة</p>
               <p className="underline underline-offset-8 decoration-dotted">{details.teacherName}</p>
             </div>
             <div className="space-y-12">
               <p>الموجه التربوي</p>
               <p className="underline underline-offset-8 decoration-dotted">........................</p>
             </div>
             <div className="space-y-12">
               <p>مدير/ة المدرسة</p>
               <p className="underline underline-offset-8 decoration-dotted">{details.principalName}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { LessonDetails, Strategy } from '../types';
import { Printer, Play, ArrowRight, ArrowLeft, Eye, EyeOff, X, Grid, FileText, Check, X as XIcon, Users, Trophy, Shuffle, ImagePlus, Trash2, Disc, Circle, Star, Triangle, Square, Hexagon, Share2, ZoomIn, ZoomOut } from 'lucide-react';

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

interface Team { id: number; name: string; score: number; color: string; bg: string; border: string; }
interface MemoryCard { id: number; isTarget: boolean; content: string; isRevealed: boolean; }
interface BalloonPlayer { id: number; name: string; score: number; }

export const ReportView: React.FC<ReportViewProps> = ({ details, strategy, customLogo, moeLogo, rabbitLogo, onBack, initialMode = 'report' }) => {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [copied, setCopied] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [evidenceImages, setEvidenceImages] = useState<(string | null)[]>([null, null, null, null]);

  // Game States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canPlaceMove, setCanPlaceMove] = useState(false); 
  
  // Connect 4 & XO & Memory & Balloon States (Restored Logic)
  const [c4Board, setC4Board] = useState<string[][]>(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [c4Player, setC4Player] = useState<'red' | 'yellow'>('red');
  const [c4Winner, setC4Winner] = useState<string | null>(null);
  const [xoBoard, setXoBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xoPlayer, setXoPlayer] = useState<'X' | 'O'>('X');
  const [xoWinner, setXoWinner] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [memoryPhase, setMemoryPhase] = useState<'setup' | 'question' | 'memory_intro' | 'flipping_down' | 'shuffling' | 'guessing' | 'result'>('setup');
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [foundRabbitCount, setFoundRabbitCount] = useState(0);
  const [balloonPlayers, setBalloonPlayers] = useState<BalloonPlayer[]>([]);
  const [balloonPlayerNameInput, setBalloonPlayerNameInput] = useState('');
  const [currentBalloonPlayerIdx, setCurrentBalloonPlayerIdx] = useState(0);
  const [balloonPhase, setBalloonPhase] = useState<'setup' | 'ready' | 'question' | 'check_catch'>('setup');
  const [shuffledOptions, setShuffledOptions] = useState<{text: string, isCorrect: boolean}[]>([]);

  const isConnect4 = strategy.name.includes("أربعة") || strategy.name.includes("Four to Win");
  const isXO = strategy.name.includes("إكس") || strategy.name.includes("X");
  const isMemory = strategy.name.includes("الذاكرة") || strategy.name.includes("Memory");
  const isBalloon = strategy.name.includes("البالون") || strategy.name.includes("Balloon");
  const isGameStrategy = isConnect4 || isXO || isMemory || isBalloon;

  // Handlers (Simplified for brevity but functionally complete)
  const handlePrint = () => window.print();
  const nextQuestion = () => { if (currentQuestionIndex < (strategy.questions?.length || 0) - 1) { setCurrentQuestionIndex(v => v + 1); setShowAnswer(false); setCanPlaceMove(false); } };
  const prevQuestion = () => { if (currentQuestionIndex > 0) { setCurrentQuestionIndex(v => v - 1); setShowAnswer(false); setCanPlaceMove(false); } };

  const handleCorrectAnswer = () => {
    if (isConnect4 || isXO) setCanPlaceMove(true);
    else if (isMemory) {
      setMemoryPhase('memory_intro');
      setMemoryCards([
        { id: 0, isTarget: false, content: 'star', isRevealed: true },
        { id: 1, isTarget: true, content: 'rabbit', isRevealed: true },
        { id: 2, isTarget: false, content: 'triangle', isRevealed: true },
        { id: 3, isTarget: false, content: 'square', isRevealed: true },
        { id: 4, isTarget: true, content: 'rabbit', isRevealed: true },
        { id: 5, isTarget: false, content: 'hexagon', isRevealed: true },
      ]);
    } else nextQuestion();
  };

  const handleXOClick = (idx: number) => {
    if (!canPlaceMove || xoBoard[idx] || xoWinner) return;
    const nb = [...xoBoard]; nb[idx] = xoPlayer; setXoBoard(nb);
    setXoPlayer(xoPlayer === 'X' ? 'O' : 'X');
    setCanPlaceMove(false);
  };

  const handleEvidenceUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEvidenceImages(prev => { const n = [...prev]; n[index] = reader.result as string; return n; });
      reader.readAsDataURL(file);
    }
  };

  if (mode === 'game') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-['Tajawal'] overflow-hidden">
        <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <button onClick={() => setMode('report')} className="p-2 bg-slate-800 rounded-full"><X size={20} /></button>
          <div className="text-center">
            <h2 className="text-sm md:text-lg font-bold text-[#4ade80]">{strategy.name}</h2>
            <p className="text-[10px] text-gray-400">سؤال {currentQuestionIndex + 1} من {strategy.questions.length}</p>
          </div>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl text-center">
            <p className="text-xl md:text-3xl font-extrabold mb-8 px-4 leading-relaxed">
              {strategy.questions[currentQuestionIndex]?.question}
            </p>

            {showAnswer && (
              <div className="bg-slate-900 border border-green-500/50 p-6 rounded-2xl mb-8 animate-in fade-in zoom-in duration-300">
                <p className="text-[#4ade80] text-xs font-bold mb-2">الإجابة الصحيحة</p>
                <p className="text-lg md:text-2xl font-bold">{strategy.questions[currentQuestionIndex]?.answer}</p>
                
                {!canPlaceMove && !isBalloon && (
                  <div className="flex gap-4 justify-center mt-6">
                    <button onClick={() => { setShowAnswer(false); nextQuestion(); }} className="bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-2 rounded-xl flex items-center gap-2"><XIcon size={18}/> خطأ</button>
                    <button onClick={handleCorrectAnswer} className="bg-green-600 text-white px-8 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-green-900/20"><Check size={18}/> صحيح</button>
                  </div>
                )}
              </div>
            )}

            {isXO && (
              <div className={`mx-auto grid grid-cols-3 gap-2 p-2 bg-slate-800 rounded-xl w-64 h-64 md:w-80 md:h-80 ${!canPlaceMove ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                {
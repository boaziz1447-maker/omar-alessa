
import React, { useState, useEffect } from 'react';
import { LessonDetails, Strategy } from '../types';
import { Printer, Play, ArrowRight, ArrowLeft, Eye, EyeOff, X, Grid, FileText, Scissors, Check, X as XIcon, Users, Trophy, Shuffle, HelpCircle, Upload, Trash2, ImagePlus, UserPlus, Disc, Circle, AlertCircle, Rabbit, Star, Triangle, Square, Hexagon, QrCode, Share2 } from 'lucide-react';

interface ReportViewProps {
  details: LessonDetails;
  strategy: Strategy;
  customLogo: string;
  moeLogo: string;
  rabbitLogo: string;
  onBack: () => void;
  initialMode?: 'report' | 'game' | 'cards'; // Added prop to control initial view
}

type ViewMode = 'report' | 'game' | 'cards';

// Memory Game Types
interface Team {
  id: number;
  name: string;
  score: number;
  color: string;
  bg: string;
  border: string;
}

interface MemoryCard {
  id: number;
  isTarget: boolean; // True if it contains the Rabbit/Custom Image
  content: string; // 'rabbit' | 'distractor'
  isRevealed: boolean;
}

// Balloon Game Types
interface BalloonPlayer {
  id: number;
  name: string;
  score: number;
}

export const ReportView: React.FC<ReportViewProps> = ({ details, strategy, customLogo, moeLogo, rabbitLogo, onBack, initialMode = 'report' }) => {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [copied, setCopied] = useState(false);
  
  // Evidence Images State
  const [evidenceImages, setEvidenceImages] = useState<(string | null)[]>([null, null, null, null]);

  // Game State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canPlaceMove, setCanPlaceMove] = useState(false); 
  
  // --- Connect 4 State ---
  const [c4Board, setC4Board] = useState<string[][]>(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [c4Player, setC4Player] = useState<'red' | 'yellow'>('red');
  const [c4Winner, setC4Winner] = useState<string | null>(null);

  // --- X & O State ---
  const [xoBoard, setXoBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xoPlayer, setXoPlayer] = useState<'X' | 'O'>('X');
  const [xoWinner, setXoWinner] = useState<string | null>(null);

  // --- Memory Power State ---
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [memoryPhase, setMemoryPhase] = useState<'setup' | 'question' | 'memory_intro' | 'flipping_down' | 'shuffling' | 'guessing' | 'result'>('setup');
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [foundRabbitCount, setFoundRabbitCount] = useState(0);

  // --- Balloon Game State ---
  const [balloonPlayers, setBalloonPlayers] = useState<BalloonPlayer[]>([]);
  const [balloonPlayerNameInput, setBalloonPlayerNameInput] = useState('');
  const [currentBalloonPlayerIdx, setCurrentBalloonPlayerIdx] = useState(0);
  const [balloonPhase, setBalloonPhase] = useState<'setup' | 'ready' | 'question' | 'check_catch'>('setup');
  const [shuffledOptions, setShuffledOptions] = useState<{text: string, isCorrect: boolean}[]>([]);

  // Strategy Detection
  const isConnect4 = strategy.name.includes("أربعة") || strategy.name.includes("Four to Win") || strategy.name.includes("بالأربعة");
  const isXO = strategy.name.includes("إكس") || strategy.name.includes("X") || strategy.name.includes("XO");
  const isMemory = strategy.name.includes("الذاكرة") || strategy.name.includes("Memory");
  const isBalloon = strategy.name.includes("البالون") || strategy.name.includes("Balloon");
  
  const isGameStrategy = isConnect4 || isXO || isMemory || isBalloon;

  // --- QR Code & Sharing Logic ---
  const getShareUrl = (targetView: 'report' | 'cards' = 'report') => {
    const minimalData = {
      t: details.lessonTitle,
      s: details.subject,
      g: details.gradeLevel,
      d: details.date,
      q: strategy.questions,
      sn: strategy.name,
      v: targetView
    };
    
    try {
      const jsonString = JSON.stringify(minimalData);
      const encodedData = btoa(encodeURIComponent(jsonString));
      const baseUrl = window.location.href.split('?')[0];
      return `${baseUrl}?share=${encodedData}`;
    } catch (e) {
      console.error("Error generating share URL", e);
      return window.location.href;
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&bgcolor=ffffff&data=${encodeURIComponent(getShareUrl('cards'))}`;
  
  const handleShare = async () => {
     const url = getShareUrl('report');
     const shareData = {
         title: `تقرير درس: ${details.lessonTitle}`,
         text: `تقرير تفعيل استراتيجية ${strategy.name} لمادة ${details.subject}`,
         url: url
     };

     if (navigator.share) {
         try {
             await navigator.share(shareData);
         } catch (err) {
             console.log('Error sharing:', err);
         }
     } else {
         try {
             await navigator.clipboard.writeText(url);
             setCopied(true);
             setTimeout(() => setCopied(false), 2000);
         } catch (err) {
             console.error('Failed to copy text: ', err);
         }
     }
  };
  
  const playSound = (type: 'correct' | 'wrong' | 'win' | 'move' | 'shuffle') => {
    console.log(`Playing sound: ${type}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEvidenceUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Img = reader.result as string;
        setEvidenceImages(prev => {
          const newImages = [...prev];
          newImages[index] = base64Img;
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceImages(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });
  };

  const setupMemoryTeams = (count: number) => {
    const colors = [
      { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' },
      { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500' },
      { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
      { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500' },
    ];
    
    const newTeams = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `فريق ${i + 1}`,
      score: 0,
      ...colors[i]
    }));
    
    setTeams(newTeams);
    setMemoryPhase('question');
  };

  const addBalloonPlayer = () => {
    if (balloonPlayerNameInput.trim() && balloonPlayers.length < 10) {
      setBalloonPlayers(prev => [...prev, { id: Date.now(), name: balloonPlayerNameInput.trim(), score: 0 }]);
      setBalloonPlayerNameInput('');
    }
  };

  const removeBalloonPlayer = (id: number) => {
    setBalloonPlayers(prev => prev.filter(p => p.id !== id));
  };

  const startBalloonGame = () => {
    if (balloonPlayers.length > 0) {
      setBalloonPhase('ready');
      prepareBalloonQuestion(0);
    }
  };

  const prepareBalloonQuestion = (qIndex: number) => {
      const q = strategy.questions?.[qIndex];
      if (q) {
          const correct = { text: q.answer, isCorrect: true };
          const wrong = { text: q.wrongAnswer || "إجابة خاطئة", isCorrect: false };
          const options = Math.random() > 0.5 ? [correct, wrong] : [wrong, correct];
          setShuffledOptions(options);
      }
  };

  const handleBalloonReveal = () => {
      setBalloonPhase('question');
  };

  const handleBalloonAnswer = (isCorrect: boolean) => {
      if (!isCorrect) {
          playSound('wrong');
          nextBalloonTurn();
      } else {
          playSound('correct');
          setBalloonPhase('check_catch');
      }
  };

  const handleBalloonCatch = (caught: boolean) => {
      const points = caught ? 30 : 15;
      if (caught) playSound('win');
      
      const updatedPlayers = [...balloonPlayers];
      updatedPlayers[currentBalloonPlayerIdx].score += points;
      setBalloonPlayers(updatedPlayers);
      
      nextBalloonTurn();
  };

  const nextBalloonTurn = () => {
      const nextPlayerIdx = (currentBalloonPlayerIdx + 1) % balloonPlayers.length;
      setCurrentBalloonPlayerIdx(nextPlayerIdx);
      setBalloonPhase('ready');
      nextQuestion();
  };
  
  useEffect(() => {
      if (isBalloon) {
          prepareBalloonQuestion(currentQuestionIndex);
      }
  }, [currentQuestionIndex, isBalloon]);

  const handleCorrectAnswer = () => {
    playSound('correct');
    if (isConnect4 || isXO) {
      setCanPlaceMove(true); 
    } else if (isMemory) {
      const updatedTeams = [...teams];
      updatedTeams[currentTeamIdx].score += 10;
      setTeams(updatedTeams);
      setFoundRabbitCount(0);
      const initialCards: MemoryCard[] = [
          { id: 0, isTarget: false, content: 'star', isRevealed: true },
          { id: 1, isTarget: true, content: 'rabbit', isRevealed: true },
          { id: 2, isTarget: false, content: 'triangle', isRevealed: true },
          { id: 3, isTarget: false, content: 'square', isRevealed: true },
          { id: 4, isTarget: true, content: 'rabbit', isRevealed: true },
          { id: 5, isTarget: false, content: 'hexagon', isRevealed: true },
      ];
      setMemoryCards(initialCards);
      setMemoryPhase('memory_intro');
    } else {
      nextQuestion();
    }
  };

  const handleWrongAnswer = () => {
    playSound('wrong');
    if (isConnect4) {
      setC4Player(prev => prev === 'red' ? 'yellow' : 'red');
    } else if (isXO) {
      setXoPlayer(prev => prev === 'X' ? 'O' : 'X');
    } else if (isMemory) {
       setCurrentTeamIdx((prev) => (prev + 1) % teams.length);
    }
  };

  const startCardShuffle = () => {
    setMemoryPhase('flipping_down');
    setMemoryCards(prev => prev.map(c => ({...c, isRevealed: false})));
    setTimeout(() => {
      setMemoryPhase('shuffling');
      playSound('shuffle');
      let shuffles = 0;
      const maxShuffles = 25;
      const interval = setInterval(() => {
        setMemoryCards(prev => {
          const newCards = [...prev];
          const idx1 = Math.floor(Math.random() * 6);
          const idx2 = Math.floor(Math.random() * 6);
          [newCards[idx1], newCards[idx2]] = [newCards[idx2], newCards[idx1]];
          return newCards;
        });
        shuffles++;
        if (shuffles >= maxShuffles) {
          clearInterval(interval);
          setMemoryPhase('guessing');
        }
      }, 150);
    }, 800);
  };

  const handleCardClick = (clickedCard: MemoryCard) => {
    if (memoryPhase !== 'guessing' || clickedCard.isRevealed) return;
    const updatedCards = memoryCards.map(c => 
        c === clickedCard ? { ...c, isRevealed: true } : c
    );
    setMemoryCards(updatedCards);
    if (clickedCard.isTarget) {
      const newFoundCount = foundRabbitCount + 1;
      setFoundRabbitCount(newFoundCount);
      if (newFoundCount === 2) {
          playSound('win');
          const updatedTeams = [...teams];
          updatedTeams[currentTeamIdx].score += 30;
          setTeams(updatedTeams);
          setMemoryPhase('result');
      } else {
          playSound('correct');
      }
    } else {
      playSound('wrong');
      setTimeout(() => {
         setMemoryPhase('result');
      }, 1000);
    }
  };

  const finishMemoryTurn = () => {
     setCurrentTeamIdx((prev) => (prev + 1) % teams.length);
     setMemoryPhase('question');
     nextQuestion();
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (strategy.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAnswer(false);
      setCanPlaceMove(false);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowAnswer(false);
      setCanPlaceMove(false);
    }
  };

  const dropC4Disc = (colIndex: number) => {
    if (!canPlaceMove || c4Winner) return;
    const newBoard = c4Board.map(row => [...row]);
    for (let r = 5; r >= 0; r--) {
      if (!newBoard[r][colIndex]) {
        newBoard[r][colIndex] = c4Player;
        setC4Board(newBoard);
        playSound('move');
        if (checkC4Win(newBoard, r, colIndex, c4Player)) {
          setC4Winner(c4Player);
          playSound('win');
        } else {
          setC4Player(c4Player === 'red' ? 'yellow' : 'red');
          nextQuestion();
        }
        return;
      }
    }
  };

  const checkC4Win = (board: string[][], r: number, c: number, player: string) => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let [dr, dc] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === player) count++; else break;
      }
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === player) count++; else break;
      }
      if (count >= 4) return true;
    }
    return false;
  };

  const handleXOClick = (index: number) => {
    if (!canPlaceMove || xoBoard[index] || xoWinner) return;
    const newBoard = [...xoBoard];
    newBoard[index] = xoPlayer;
    setXoBoard(newBoard);
    playSound('move');
    if (checkXOWin(newBoard, xoPlayer)) {
      setXoWinner(xoPlayer);
      playSound('win');
    } else {
      setXoPlayer(xoPlayer === 'X' ? 'O' : 'X');
      nextQuestion();
    }
  };

  const checkXOWin = (board: (string|null)[], player: string) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    return lines.some(([a, b, c]) => board[a] === player && board[b] === player && board[c] === player);
  };

  const resetGame = () => {
    if (isConnect4) {
      setC4Board(Array(6).fill(null).map(() => Array(7).fill(null)));
      setC4Winner(null);
      setC4Player('red');
    } else if (isXO) {
      setXoBoard(Array(9).fill(null));
      setXoWinner(null);
      setXoPlayer('X');
    } else if (isMemory) {
      setMemoryPhase('setup');
      setTeams([]);
      setCurrentTeamIdx(0);
    } else if (isBalloon) {
      setBalloonPhase('setup');
      setBalloonPlayers([]);
      setCurrentBalloonPlayerIdx(0);
    }
    setCurrentQuestionIndex(0);
    setCanPlaceMove(false);
    setShowAnswer(false);
  };

  const renderShape = (type: string) => {
      switch(type) {
          case 'rabbit': 
            return <img src={rabbitLogo} alt="Target" className="w-16 h-16 md:w-24 md:h-24 object-contain animate-bounce drop-shadow-xl" />;
          case 'star': return <Star className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" fill="currentColor" />;
          case 'triangle': return <Triangle className="w-8 h-8 md:w-12 md:h-12 text-blue-400" fill="currentColor" />;
          case 'square': return <Square className="w-8 h-8 md:w-12 md:h-12 text-red-400" fill="currentColor" />;
          case 'hexagon': return <Hexagon className="w-8 h-8 md:w-12 md:h-12 text-purple-400" fill="currentColor" />;
          default: return <Circle className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />;
      }
  };

  if (mode === 'game') {
    const currentQ = strategy.questions?.[currentQuestionIndex];
    
    if (isBalloon && balloonPhase === 'setup') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center font-['Tajawal'] px-4">
                 <div className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-lg w-full text-center">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-[#4ade80] flex items-center justify-center gap-3">
                         <Disc className="animate-bounce" /> استراتيجية البالون
                    </h2>
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-[#4ade80]"
                            placeholder="اسم اللاعب"
                            value={balloonPlayerNameInput}
                            onChange={(e) => setBalloonPlayerNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addBalloonPlayer()}
                        />
                        <button onClick={addBalloonPlayer} className="bg-[#007f5f] hover:bg-[#006048] p-2 rounded-lg text-white">
                            <UserPlus size={24} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-8 justify-center min-h-[50px]">
                        {balloonPlayers.map(player => (
                            <div key={player.id} className="bg-slate-700 px-3 py-1 rounded-full flex items-center gap-2 text-xs md:text-sm">
                                <span>{player.name}</span>
                                <button onClick={() => removeBalloonPlayer(player.id)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={startBalloonGame} disabled={balloonPlayers.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-lg">بدء المنافسة</button>
                    <button onClick={() => setMode('report')} className="mt-4 text-gray-400 hover:text-white underline text-sm">إلغاء</button>
                 </div>
            </div>
        );
    }

    if (isMemory && memoryPhase === 'setup') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center font-['Tajawal'] px-4">
                <div className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-lg w-full text-center">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-[#4ade80] flex items-center justify-center gap-3"><Users size={32} /> تحدي الذاكرة</h2>
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                        {[2, 3, 4].map(num => (
                            <button key={num} onClick={() => setupMemoryTeams(num)} className="bg-slate-700 hover:bg-[#007f5f] py-4 md:py-6 rounded-xl text-xl md:text-2xl font-bold transition-all transform hover:scale-105">{num} فرق</button>
                        ))}
                    </div>
                     <button onClick={() => setMode('report')} className="mt-8 text-gray-400 hover:text-white underline text-sm">إلغاء</button>
                </div>
            </div>
        );
    }

    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col font-['Tajawal'] overflow-hidden">
        <div className="flex justify-between items-center p-3 md:p-6 bg-slate-800 border-b border-slate-700 shadow-lg shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setMode('report')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-full text-gray-300 hover:text-white"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
             <div>
               <h2 className="text-sm md:text-xl font-bold text-[#4ade80] truncate max-w-[150px] md:max-w-none">{strategy.name}</h2>
               <p className="text-[10px] md:text-sm text-gray-400">السؤال {currentQuestionIndex + 1}</p>
             </div>
          </div>
          <div className="text-[10px] md:text-base font-bold bg-slate-950 px-2 py-1 rounded-lg border border-slate-700 hidden sm:block truncate max-w-[200px]">
            {details.lessonTitle}
          </div>
        </div>

        {isGameStrategy && !c4Winner && !xoWinner && (
          <div className="bg-slate-950/80 backdrop-blur border-y border-slate-700 py-1.5 flex justify-center gap-2 md:gap-4 overflow-x-auto px-4 scrollbar-hide">
            {isConnect4 && (
              <div className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-lg border flex items-center gap-2 transition-all ${c4Player === 'red' ? 'bg-red-500/20 text-red-400 border-red-500' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500'}`}>
                {c4Player === 'red' ? '🔴 دور الأحمر' : '🟡 دور الأصفر'}
              </div>
            )}
            {isXO && (
              <div className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-lg border flex items-center gap-2 transition-all ${xoPlayer === 'X' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500' : 'bg-pink-500/20 text-pink-400 border-pink-500'}`}>
                {xoPlayer === 'X' ? '✖️ الفريق X' : '⭕ الفريق O'}
              </div>
            )}
            {isMemory && teams.map((team, idx) => (
                <div key={team.id} className={`px-3 py-1 rounded-lg font-bold border text-[10px] md:text-sm flex items-center gap-2 ${idx === currentTeamIdx ? `${team.bg} ${team.border} ${team.color} scale-105` : 'bg-slate-800 border-slate-700 text-gray-500 opacity-70'}`}>
                    <span>{team.name} ({team.score})</span>
                </div>
            ))}
             {isBalloon && balloonPlayers.map((player, idx) => (
                <div key={player.id} className={`px-2 py-1 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 ${idx === currentBalloonPlayerIdx ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 opacity-60'}`}>
                    <span>{player.name} ({player.score})</span>
                </div>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
            {isMemory && memoryPhase !== 'question' && (
                <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center animate-fade-in-up">
                    <h3 className="text-xl md:text-4xl font-black text-white mb-6 md:mb-10 text-center">{memoryPhase === 'result' ? 'النتيجة' : (foundRabbitCount === 1 ? 'ابحث عن الثانية!' : 'تحدي الذاكرة')}</h3>
                    <div className="grid grid-cols-3 gap-2 md:gap-6 mb-8">
                        {memoryCards.map((card, idx) => (
                            <div key={idx} onClick={() => handleCardClick(card)} className={`w-20 h-28 md:w-32 md:h-44 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-500 transform-style-3d relative shadow-2xl border-2 md:border-4 ${card.isRevealed ? 'border-[#007f5f]' : 'rotate-y-180 border-slate-600'}`} style={{ transform: card.isRevealed ? 'rotateY(0deg)' : 'rotateY(180deg)', transformStyle: 'preserve-3d' }}>
                                <div className="absolute inset-0 backface-hidden bg-white rounded-lg md:rounded-xl flex items-center justify-center overflow-hidden">{renderShape(card.content)}</div>
                                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg md:rounded-xl flex items-center justify-center border-2 border-slate-600" style={{ transform: 'rotateY(180deg)' }}><img src={customLogo} className="w-[50%] opacity-30 object-contain grayscale" /></div>
                            </div>
                        ))}
                    </div>
                    {memoryPhase === 'memory_intro' && <button onClick={startCardShuffle} className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-full font-bold text-lg md:text-xl shadow-lg">بدء الخلط</button>}
                    {memoryPhase === 'guessing' && <div className="text-sm md:text-xl text-white font-bold bg-black/40 px-6 py-2 rounded-full border border-white/20">اختر البطاقة</div>}
                    {memoryPhase === 'result' && <button onClick={finishMemoryTurn} className="bg-[#007f5f] text-white px-8 py-3 rounded-xl font-bold">السؤال التالي</button>}
                </div>
            )}
            
            {isBalloon && (balloonPhase === 'ready' || balloonPhase === 'question' || balloonPhase === 'check_catch') && (
                <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center text-center">
                    {balloonPhase === 'ready' && <button onClick={handleBalloonReveal} className="bg-blue-600 text-white px-8 py-6 rounded-2xl font-black text-2xl md:text-4xl animate-pulse">إظهار السؤال 🎈</button>}
                    {(balloonPhase === 'question' || balloonPhase === 'check_catch') && (
                         <div className="w-full px-4">
                            <p className="text-lg md:text-4xl font-extrabold text-white mb-10 leading-relaxed">{currentQ?.question}</p>
                            {balloonPhase === 'question' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                                    {shuffledOptions.map((opt, idx) => (
                                        <button key={idx} onClick={() => handleBalloonAnswer(opt.isCorrect)} className="bg-slate-800 border-2 border-slate-600 text-base md:text-xl font-bold py-4 px-4 rounded-xl">{opt.text}</button>
                                    ))}
                                </div>
                            )}
                            {balloonPhase === 'check_catch' && (
                                <div className="bg-slate-800 border-2 border-[#4ade80] rounded-2xl p-6 max-w-md mx-auto">
                                    <h2 className="text-xl md:text-2xl font-black text-[#4ade80] mb-4">أحسنت!</h2>
                                    <p className="text-sm md:text-lg mb-6">هل أمسك البالون؟</p>
                                    <div className="flex gap-4"><button onClick={() => handleBalloonCatch(false)} className="flex-1 bg-slate-700 py-3 rounded-xl text-xs md:text-base font-bold">لا (+15)</button><button onClick={() => handleBalloonCatch(true)} className="flex-1 bg-green-600 py-3 rounded-xl text-xs md:text-base font-bold text-white">نعم (+30)</button></div>
                                </div>
                            )}
                         </div>
                    )}
                </div>
            )}

            {!isBalloon && (!isMemory || memoryPhase === 'question') && (
            <div className="w-full max-w-7xl text-center relative z-10 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-10 py-4">
              <div className="flex flex-col justify-center items-center flex-1 w-full">
                  <p className="text-lg md:text-4xl font-extrabold text-white mb-6 md:mb-12 leading-snug px-4">{currentQ?.question}</p>
                <div className={`mt-4 transition-all duration-500 w-full ${showAnswer ? 'opacity-100 scale-100' : 'opacity-0 scale-95 h-0 overflow-hidden'}`}>
                  <div className="bg-slate-800/90 border-2 border-[#4ade80] rounded-2xl p-6 md:p-8 inline-block w-full max-w-2xl mx-auto">
                     <h3 className="text-xs md:text-base text-[#4ade80] mb-2 font-bold">الإجابة</h3>
                     <p className="text-base md:text-2xl font-bold text-white">{currentQ?.answer}</p>
                     {isGameStrategy && !canPlaceMove && !xoWinner && !c4Winner && !isBalloon && (
                       <div className="flex gap-3 justify-center mt-6 pt-6 border-t border-slate-700/50">
                         <button onClick={handleWrongAnswer} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/50 py-2 rounded-lg flex flex-col items-center gap-1"><XIcon size={18} /><span className="text-[10px] font-bold">خطأ</span></button>
                         <button onClick={handleCorrectAnswer} className="flex-1 bg-green-500/20 text-green-400 border border-green-500/50 py-2 rounded-lg flex flex-col items-center gap-1"><Check size={18} /><span className="text-[10px] font-bold">صح</span></button>
                       </div>
                     )}
                  </div>
                </div>
              </div>

              {isConnect4 && (
                <div className="flex flex-col items-center bg-slate-900/50 p-3 md:p-6 rounded-2xl border border-slate-700 max-w-full">
                    <div className={`bg-blue-800 p-2 md:p-4 rounded-xl inline-block border-2 md:border-4 border-blue-700 relative ${!canPlaceMove && !c4Winner ? 'opacity-50 grayscale' : ''}`}>
                        <div className="grid grid-cols-7 gap-1 md:gap-3">
                            {c4Board.map((row, r) => row.map((cell, c) => (
                                <div key={`${r}-${c}`} onClick={() => dropC4Disc(c)} className="w-6 h-6 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-slate-900 cursor-pointer relative flex items-center justify-center">
                                    {cell && <div className={`w-[85%] h-[85%] rounded-full animate-bounce-in ${cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'}`}></div>}
                                </div>
                            )))}
                        </div>
                    </div>
                </div>
              )}

              {isXO && (
                <div className="flex flex-col items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                    <div className={`grid grid-cols-3 gap-2 p-2 bg-slate-800 rounded-lg relative ${!canPlaceMove && !xoWinner ? 'opacity-40' : ''}`}>
                        {xoBoard.map((cell, idx) => (
                          <div key={idx} onClick={() => handleXOClick(idx)} className="w-16 h-16 md:w-24 md:h-24 bg-slate-900 rounded-lg flex items-center justify-center text-3xl md:text-5xl font-black cursor-pointer shadow-inner">
                             {cell === 'X' && <span className="text-cyan-400 animate-scale-in">X</span>}
                             {cell === 'O' && <span className="text-pink-500 animate-scale-in">O</span>}
                          </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
            )}
        </div>

        <div className="p-3 md:p-6 bg-slate-800 border-t border-slate-700 flex justify-between items-center gap-2 md:gap-6 shrink-0 z-20">
            {!isGameStrategy && <button onClick={prevQuestion} disabled={currentQuestionIndex === 0} className="flex items-center justify-center gap-2 px-3 md:px-8 py-2 md:py-4 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-xs md:text-lg"><ArrowRight className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden sm:inline">السابق</span></button>}
            {(!isBalloon && (!isMemory || memoryPhase === 'question')) && (
                <button onClick={() => setShowAnswer(!showAnswer)} className="flex-1 max-w-md flex items-center justify-center gap-2 px-4 py-2 md:py-4 rounded-full font-bold text-xs md:text-xl bg-[#007f5f] text-white shadow-lg">{showAnswer ? <EyeOff size={18} /> : <Eye size={18} />} {showAnswer ? 'إخفاء الإجابة' : 'كشف الإجابة'}</button>
            )}
            {!isGameStrategy && <button onClick={nextQuestion} disabled={currentQuestionIndex === (strategy.questions?.length || 0) - 1} className="flex items-center justify-center gap-2 px-3 md:px-8 py-2 md:py-4 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-xs md:text-lg"><span className="hidden sm:inline">التالي</span> <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" /></button>}
             {isGameStrategy && <button onClick={resetGame} className="px-4 py-2 rounded-xl bg-slate-700 text-gray-400 font-bold text-[10px] md:text-sm">إنهاء / إعادة</button>}
        </div>
      </div>
    );
  }

  if (mode === 'cards') {
    return (
      <div className="min-h-screen bg-gray-100 font-['Tajawal'] text-black p-4 md:p-8">
         <div className="max-w-[210mm] mx-auto mb-8 flex flex-col md:flex-row justify-between items-center no-print gap-4">
            <button onClick={() => setMode('report')} className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2 w-full md:w-auto justify-center"><ArrowRight size={18} /> التقرير</button>
            <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded flex items-center justify-center gap-2 font-bold hover:bg-blue-700 w-full md:w-auto"><Printer size={18} /> طباعة البطاقات</button>
         </div>
         <div className="print-content bg-white shadow-2xl mx-auto w-full md:w-[210mm] min-h-[297mm] p-6 md:p-10 border border-gray-300 print:shadow-none print:border-none print:w-full print:m-0 overflow-hidden">
            <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
               <div className="text-right"><h1 className="text-xl md:text-2xl font-bold">بطاقات الأسئلة</h1><p className="text-gray-600 mt-1 text-xs md:text-base">{details.subject} | {details.lessonTitle}</p></div>
               <img src={customLogo} alt="Logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
               {strategy.questions?.map((q, idx) => (
                   <div key={idx} className="border-4 border-dashed border-gray-400 rounded-2xl p-6 md:p-8 flex flex-col justify-between min-h-[200px] relative bg-white page-break-inside-avoid shadow-sm">
                      <div className="relative z-10"><h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">سؤال {idx + 1}: {q.question}</h3></div>
                      <div className="mt-4 pt-4 border-t-2 border-gray-200"><p className="text-right transform rotate-180 text-xs md:text-sm font-semibold text-gray-500">الإجابة: {q.answer}</p></div>
                   </div>
               ))}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-2 md:p-4 relative font-['Tajawal'] overflow-x-hidden">
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center relative z-10 no-print gap-4">
        <button onClick={onBack} className="text-gray-300 hover:text-white flex items-center gap-2 font-bold transition-colors bg-white/10 px-4 py-2 rounded-lg w-full sm:w-auto justify-center text-sm md:text-base"><span>&rarr;</span> العودة</button>
        <div className="flex w-full sm:w-auto gap-2">
            <button onClick={handleShare} className="flex-1 bg-purple-600 text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold flex items-center justify-center gap-2">{copied ? <Check size={16} /> : <Share2 size={16} />}{copied ? 'تم النسخ' : 'مشاركة'}</button>
            <button onClick={handlePrint} className="flex-1 bg-[#007f5f] text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold flex items-center justify-center gap-2"><Printer size={16} /> طباعة التقرير</button>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-8 scrollbar-hide flex flex-col items-center">
          <p className="no-print sm:hidden text-gray-400 text-[10px] mb-2 font-bold">💡 اسحب لليسار لمعاينة التقرير بالكامل</p>
          <div className="print-content relative z-10 min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-2xl border-x border-b border-gray-300 print:shadow-none print:border-none print:w-full print:max-w-none print:min-w-0 print:m-0 p-6 md:p-8 text-black leading-relaxed border-t-8 border-t-[#007f5f]">
            <header className="flex justify-between items-start mb-6 border-b-2 border-double border-gray-200 pb-4">
              <div className="flex flex-col items-center w-1/3 text-center space-y-1"><h2 className="font-bold text-gray-900 text-[10px] md:text-xs">المملكة العربية السعودية</h2><h3 className="font-semibold text-gray-800 text-[10px] md:text-xs">وزارة التعليم</h3><div className="mt-1 text-[9px] text-gray-600 leading-tight"><p>إدارة التعليم: {details.region}</p><p>المدرسة: {details.schoolName}</p></div></div>
              <div className="flex flex-col items-center w-1/3"><img src={moeLogo} alt="MOE" className="h-16 md:h-20 object-contain mb-2" /><h1 className="font-bold text-[10px] md:text-sm text-[#007f5f] text-center mt-1 uppercase">تقرير التفعيل</h1></div>
              <div className="flex flex-col items-center w-1/3 pt-2"><img src={customLogo} alt="Logo" className="h-14 w-14 object-contain mb-1" /><span className="text-[8px] font-bold text-gray-500 text-center uppercase">عمر العيسى</span></div>
            </header>

            <div className="flex flex-wrap justify-between items-center bg-[#f0f9f6] border border-[#b2dfdb] rounded-lg p-2 md:p-3 mb-6 text-[10px] md:text-sm print:bg-gray-50">
              <div className="flex gap-1 md:gap-2 px-1"><span className="font-bold text-[#007f5f]">المادة:</span> {details.subject}</div>
              <div className="flex gap-1 md:gap-2 px-1"><span className="font-bold text-[#007f5f]">الصف:</span> {details.gradeLevel}</div>
              <div className="flex gap-1 md:gap-2 px-1"><span className="font-bold text-[#007f5f]">الدرس:</span> {details.lessonTitle}</div>
              <div className="flex gap-1 md:gap-2 px-1"><span className="font-bold text-[#007f5f]">التاريخ:</span> {details.date}</div>
            </div>

            <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-8 flex flex-col gap-4">
                    <div className="border-2 border-[#007f5f] rounded-lg p-4 relative pt-5 bg-white shadow-sm">
                        <div className="absolute -top-3 right-4 bg-[#007f5f] text-white px-3 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase">الفكرة المهمة</div>
                        <p className="text-gray-800 text-justify text-[11px] md:text-sm leading-relaxed">{strategy.mainIdea}</p>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-bold text-[#007f5f] mb-2 text-xs md:text-base border-b border-gray-200 pb-1 inline-block uppercase tracking-wider">طريقة التفعيل</h4>
                        <ul className="list-decimal list-inside space-y-1 text-gray-700 text-[10px] md:text-xs leading-relaxed">{strategy.implementationSteps.map((step, idx) => (<li key={idx} className="pr-1">{step}</li>))}</ul>
                    </div>
                    {strategy.questions && strategy.questions.length > 0 && (
                      <div className="border-2 border-teal-500/30 rounded-lg p-3 bg-teal-50 no-print flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                            <div><h4 className="font-bold text-[#007f5f] text-[10px] md:text-sm flex items-center gap-2 tracking-wide uppercase"><FileText size={16} /> بنك الأسئلة المرفق</h4></div>
                         </div>
                         <div className="flex gap-2 w-full"><button onClick={() => setMode('cards')} className="flex-1 flex items-center justify-center gap-2 bg-white border border-teal-600 text-teal-700 px-2 py-2 rounded-lg font-bold text-[10px] uppercase">بطاقات</button><button onClick={() => setMode('game')} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-2 py-2 rounded-lg font-bold text-[10px] uppercase shadow-md">عرض تفاعلي</button></div>
                         <div className="flex flex-col items-center pt-2 border-t border-teal-200/50">
                            <img src={qrCodeUrl} alt="QR" className="w-16 h-16 bg-white p-1 rounded" />
                            <p className="text-[8px] text-teal-800 mt-1 font-bold">امسح الكود لعرض البطاقات</p>
                         </div>
                      </div>
                    )}
                </div>

                <div className="col-span-4 flex flex-col gap-4">
                    <div className="border border-gray-300 rounded-lg p-3 bg-white">
                        <h3 className="font-bold text-center text-[#007f5f] border-b-2 border-gray-200 pb-1 mb-2 text-[10px] md:text-xs tracking-wider uppercase">الأهداف</h3>
                        <ul className="space-y-1">{strategy.objectives.map((obj, idx) => (<li key={idx} className="text-[9px] md:text-xs text-gray-700 leading-tight flex items-start gap-1"><span className="text-[#007f5f]">•</span>{obj}</li>))}</ul>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-3 bg-white flex-grow flex flex-col min-h-[200px]">
                        <h3 className="font-bold text-center text-[#007f5f] border-b-2 border-gray-200 pb-1 mb-2 text-[10px] md:text-xs uppercase tracking-wider">شواهد التفعيل</h3>
                        <div className="grid grid-cols-2 gap-1.5 flex-grow">
                            {evidenceImages.map((img, idx) => (
                                <div key={idx} className="border border-dashed border-gray-300 rounded bg-gray-50 flex flex-col items-center justify-center text-gray-400 relative overflow-hidden group min-h-[80px]">
                                    {img ? (<><img src={img} className="w-full h-full object-cover" /><button onClick={() => removeEvidence(idx)} className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full shadow-md no-print"><Trash2 size={10} /></button></>) : (
                                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full"><ImagePlus size={16} /><span className="text-[7px] text-center px-0.5">صورة {idx + 1}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleEvidenceUpload(idx, e)} /></label>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-gray-300 flex justify-between items-center px-8">
                <div className="text-center"><p className="font-bold text-gray-600 mb-4 text-[10px] md:text-xs uppercase tracking-widest">معلم المادة</p><p className="font-bold text-gray-900 text-xs md:text-lg border-t border-dotted border-gray-400 pt-1 min-w-[100px] uppercase tracking-wide">{details.teacherName}</p></div>
                <div className="text-center"><p className="font-bold text-gray-600 mb-4 text-[10px] md:text-xs uppercase tracking-widest">مدير المدرسة</p><p className="font-bold text-gray-900 text-xs md:text-lg border-t border-dotted border-gray-400 pt-1 min-w-[100px] uppercase tracking-wide">{details.principalName}</p></div>
            </div>
          </div>
      </div>
    </div>
  );
};

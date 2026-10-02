import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, 
  ArrowRight, 
  Volume2, 
  VolumeX,
  Square, 
  Download, 
  Share2, 
  BookOpen, 
  Feather, 
  Loader2, 
  RotateCcw, 
  Library as LibraryIcon,
  Check,
  AlertCircle,
  Star,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// Web Audio API Synthesized Paper Flip Sound
const playPageFlipSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const duration = 0.32;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 2.2);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.18;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1700, ctx.currentTime + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + duration);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch (err) {
    // If audio autoplay is blocked, ignore silently
  }
};

// Highlighted text component for karaoke TTS reading
const HighlightedNarrative = ({ text, highlightRange }) => {
  if (!highlightRange || highlightRange.start >= highlightRange.end) {
    return <span className="transition-all">{text}</span>;
  }

  const { start, end } = highlightRange;
  const before = text.slice(0, start);
  const highlighted = text.slice(start, end);
  const after = text.slice(end);

  return (
    <span>
      {before}
      <span className="bg-amber-200 text-[#78350f] px-1 py-0.5 rounded shadow-sm transition-all duration-150 font-semibold border-b-2 border-amber-400">
        {highlighted}
      </span>
      {after}
    </span>
  );
};

const StoryViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Page index: 0 = Cover, 1..N = Story Pages, N+1 = End Page
  const [currentPage, setCurrentPage] = useState(0);
  const [flipState, setFlipState] = useState('idle'); // 'idle' | 'flipping-next' | 'flipping-prev'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio / Speech State
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const [highlightRange, setHighlightRange] = useState(null);
  const [copied, setCopied] = useState(false);

  const isNarratingRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Feedback State
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/stories/${id}`);
        setStory(res.data);
      } catch (err) {
        console.error('Error fetching story:', err);
        setError(err.response?.data?.message || 'Story could not be retrieved.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStory();
    }
  }, [id]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      isNarratingRef.current = false;
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Chrome/Edge keepalive to prevent SpeechSynthesis from silently stopping on long narratives
  useEffect(() => {
    const keepAlive = setInterval(() => {
      if (isNarratingRef.current && window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(keepAlive);
  }, []);

  const totalPages = story ? story.pages.length + 2 : 0; // Cover(0), Pages(1..N), End(N+1)

  // Continuous Narration Controller
  const narratePage = (pageIdx) => {
    if (!isNarratingRef.current || !story || !synthRef.current) return;

    synthRef.current.cancel();

    let textToSpeak = '';
    if (pageIdx === 0) {
      textToSpeak = `${story.title}. A Visual Narrative.`;
    } else if (pageIdx === totalPages - 1) {
      textToSpeak = 'The End. Thank you for journeying through this legend.';
    } else if (pageIdx >= 1 && pageIdx <= story.pages.length) {
      const pageData = story.pages[pageIdx - 1];
      textToSpeak = pageData ? pageData.text : '';
    }

    if (!textToSpeak.trim()) {
      if (pageIdx < totalPages - 1) {
        advanceNarrationToNextPage(pageIdx);
      } else {
        stopContinuousNarration();
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    activeUtteranceRef.current = utterance;

    utterance.onboundary = (event) => {
      if (!isNarratingRef.current) return;
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        let nextSpace = textToSpeak.indexOf(' ', charIndex);
        if (nextSpace === -1) nextSpace = textToSpeak.length;
        setHighlightRange({ start: charIndex, end: nextSpace });
      }
    };

    utterance.onend = () => {
      setHighlightRange(null);
      if (!isNarratingRef.current) return;

      if (pageIdx < totalPages - 1) {
        // Pause briefly after the page concludes, then turn to the next page
        setTimeout(() => {
          if (!isNarratingRef.current) return;
          advanceNarrationToNextPage(pageIdx);
        }, 700);
      } else {
        // Reached the very end of the story!
        stopContinuousNarration();
      }
    };

    utterance.onerror = (e) => {
      if (!isNarratingRef.current) {
        setHighlightRange(null);
        return;
      }
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e);
        stopContinuousNarration();
      }
    };

    // Small delay to allow audio subsystem to prime
    setTimeout(() => {
      if (isNarratingRef.current && synthRef.current) {
        synthRef.current.speak(utterance);
      }
    }, 150);
  };

  const advanceNarrationToNextPage = (fromIdx) => {
    if (!isNarratingRef.current) return;
    const nextIdx = fromIdx + 1;
    if (nextIdx >= totalPages) {
      stopContinuousNarration();
      return;
    }

    if (soundEnabled) playPageFlipSound();
    setFlipState('flipping-next');

    setTimeout(() => {
      setCurrentPage(nextIdx);
      setFlipState('idle');
      // After 3D flip lands, immediately narrate next chapter!
      if (isNarratingRef.current) {
        narratePage(nextIdx);
      }
    }, 750);
  };

  const startContinuousNarration = () => {
    if (!story || !synthRef.current) return;
    isNarratingRef.current = true;
    setIsPlaying(true);
    narratePage(currentPage);
  };

  const stopContinuousNarration = () => {
    isNarratingRef.current = false;
    setIsPlaying(false);
    setHighlightRange(null);
    activeUtteranceRef.current = null;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const flipNext = () => {
    if (flipState !== 'idle' || !story || currentPage >= totalPages - 1) return;

    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setHighlightRange(null);

    const nextIdx = currentPage + 1;
    if (soundEnabled) playPageFlipSound();

    setFlipState('flipping-next');
    setTimeout(() => {
      setCurrentPage(nextIdx);
      setFlipState('idle');
      if (isNarratingRef.current) {
        narratePage(nextIdx);
      }
    }, 750);
  };

  const flipPrev = () => {
    if (flipState !== 'idle' || !story || currentPage <= 0) return;

    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setHighlightRange(null);

    const prevIdx = currentPage - 1;
    if (soundEnabled) playPageFlipSound();

    setFlipState('flipping-prev');
    setTimeout(() => {
      setCurrentPage(prevIdx);
      setFlipState('idle');
      if (isNarratingRef.current) {
        narratePage(prevIdx);
      }
    }, 750);
  };

  const jumpToPage = (target) => {
    if (flipState !== 'idle' || target === currentPage) return;

    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setHighlightRange(null);

    const direction = target > currentPage ? 'flipping-next' : 'flipping-prev';
    if (soundEnabled) playPageFlipSound();
    setFlipState(direction);

    setTimeout(() => {
      setCurrentPage(target);
      setFlipState('idle');
      if (isNarratingRef.current) {
        narratePage(target);
      }
    }, 750);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        flipPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleDownloadPDF = () => {
    if (!story) return;

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Cover Page
      doc.setFillColor(28, 25, 23);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(2);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

      doc.setTextColor(212, 175, 55);
      doc.setFont('times', 'bold');
      doc.setFontSize(30);
      doc.text(story.title, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(245, 245, 220);
      doc.setFont('times', 'italic');
      doc.text('A Visual Narrative', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      // Story Pages
      story.pages.forEach((p, idx) => {
        doc.addPage('a4', 'landscape');
        doc.setFillColor(251, 249, 244);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        doc.setDrawColor(218, 208, 192);
        doc.setLineWidth(1);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

        const imgIndex = p.imageIndex ?? 0;
        const imgData = story.images && story.images[imgIndex];
        if (imgData) {
          try {
            doc.addImage(imgData, 'JPEG', 20, 25, 120, 150, undefined, 'FAST');
          } catch (e) {
            console.warn('PDF image insert error', e);
          }
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(40, 36, 32);
        const splitText = doc.splitTextToSize(p.text, 115);
        doc.text(splitText, 155, 60);

        doc.setFontSize(11);
        doc.setTextColor(140, 130, 120);
        doc.text(`— Page ${idx + 1} —`, pageWidth / 2, pageHeight - 16, { align: 'center' });
      });

      doc.save(`${story.title.replace(/[^a-zA-Z0-9]/g, '_')}_Storybook.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Unable to generate PDF at this moment.');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Helper to render the Left or Right page content for a given page index
  const renderPage = (index, side) => {
    if (!story) return null;
    const isCover = index === 0;
    const isEnd = index === totalPages - 1;
    const pageData = !isCover && !isEnd ? story.pages[index - 1] : null;
    const imageSrc = pageData && story.images ? story.images[pageData.imageIndex] : null;

    if (side === 'left') {
      // LEFT PAGE
      if (isCover) {
        return (
          <div className="h-full w-full bg-[#f4eee1] p-8 sm:p-12 flex flex-col items-center justify-center text-center relative border-r border-[#d4cbba]">
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent pointer-events-none" />
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#c5b8a0] flex items-center justify-center text-[#8c7b64] mb-4">
              <BookOpen className="w-10 h-10 opacity-70" />
            </div>
            <h3 className="font-serif italic text-lg text-[#6b5e4c] max-w-xs">
              "Words and imagery woven across time."
            </h3>
            <p className="text-[11px] uppercase tracking-widest text-[#a89b88] mt-4 font-semibold">
              The Visual Narrator Collection
            </p>
          </div>
        );
      }

      if (isEnd) {
        return (
          <div className="h-full w-full bg-[#f4eee1] p-8 sm:p-12 flex flex-col items-center justify-center text-center relative border-r border-[#d4cbba]">
            <div className="w-16 h-16 rounded-full bg-[#ebdcc2] flex items-center justify-center text-[#8c6d3b] mb-4 shadow-inner">
              <Feather className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#3d3224] mb-2">
              Chronicle Concluded
            </h3>
            <p className="font-serif italic text-sm text-[#786955] max-w-xs leading-relaxed">
              Every memory holds a truth, and every tale preserves the wonder.
            </p>
          </div>
        );
      }

      // Standard Story Left Page: Artwork
      return (
        <div className="h-full w-full bg-[#f3ece0] p-6 sm:p-8 flex flex-col justify-between relative border-r border-[#d8cfbe] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-widest text-[#8c7e6c] pb-2 border-b border-[#ded5c4]">
            <span>Illustration</span>
            <span>Scene {(pageData?.imageIndex ?? 0) + 1}</span>
          </div>

          <div className="my-auto flex items-center justify-center">
            <div className="relative max-w-full max-h-[360px] sm:max-h-[420px] rounded-lg overflow-hidden shadow-md border-4 border-white bg-black/10 transition-transform duration-300 hover:scale-[1.01]">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={`Scene ${index}`}
                  className="w-full h-full object-contain max-h-[350px] sm:max-h-[400px]"
                />
              ) : (
                <div className="p-16 text-center text-xs text-[#8c7e6c] font-serif">
                  Visual scene unavailable
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-xs font-serif text-[#a69885]">
            — Plate {index} —
          </div>
        </div>
      );
    }

    if (side === 'right') {
      // RIGHT PAGE
      if (isCover) {
        return (
          <div className="h-full w-full bg-[#241e1b] text-[#f5f5dc] p-8 sm:p-14 flex flex-col items-center justify-center text-center relative overflow-hidden border-l border-[#3a322c]">
            {/* Ornate Gold Border Frame */}
            <div className="absolute inset-4 border-2 border-[#d4af37]/40 rounded-lg pointer-events-none" />
            <div className="absolute inset-6 border border-[#d4af37]/20 rounded-md pointer-events-none" />

            <div className="w-16 h-16 rounded-full bg-[#2e2722] border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37] mb-6 shadow-xl">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-[#d4af37] mb-4 max-w-md leading-tight">
              {story.title}
            </h1>

            <div className="w-20 h-0.5 bg-[#d4af37]/60 my-4" />

            <p className="text-xs font-serif italic text-[#d6d3d1]/80 tracking-widest uppercase mb-8">
              A Visual Narrative
            </p>

            <button
              onClick={flipNext}
              className="px-8 py-3 bg-[#d4af37] hover:bg-[#c29d29] text-[#1c1917] font-bold rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer hover:scale-105 active:scale-95 duration-200"
            >
              <span>Turn to Begin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
      }

      if (isEnd) {
        return (
          <div className="h-full w-full bg-[#fbf9f4] p-6 sm:p-10 flex flex-col justify-between text-[#2c2621] relative border-l border-[#d8cfbe] z-20 overflow-y-auto">
            <div className="text-center pt-2">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mb-1">
                The End
              </h2>
              <div className="w-16 h-0.5 bg-[#d4af37] mx-auto my-2.5" />
              <p className="text-xs font-serif text-[#786d60] mb-4">
                How did this tale resonate with you?
              </p>

              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRating(star);
                      setFeedbackSent(true);
                    }}
                    className={`p-1.5 transition-transform hover:scale-125 cursor-pointer ${
                      rating >= star ? 'text-amber-500 fill-amber-500' : 'text-stone-300'
                    }`}
                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>

              {feedbackSent && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-3">
                  <Check className="w-3.5 h-3.5" />
                  <span>Rating received with gratitude</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 max-w-xs mx-auto w-full pb-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToPage(0);
                }}
                className="w-full py-2.5 px-4 bg-[#ede6d8] hover:bg-[#e0d4c0] text-[#2c2621] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Read From Beginning</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPDF();
                }}
                className="w-full py-2.5 px-4 bg-[#29221e] hover:bg-[#382f2a] text-[#d4af37] border border-[#d4af37]/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Storybook</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/library');
                }}
                className="w-full py-2.5 px-4 bg-[#292524] hover:bg-[#3d3734] text-[#f5f5dc] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
              >
                <LibraryIcon className="w-4 h-4 text-[#d4af37]" />
                <span>Return to Bookshelf</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/dashboard');
                }}
                className="w-full py-2.5 px-4 bg-[#d4af37] hover:bg-[#c29d29] text-[#1c1917] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md cursor-pointer active:scale-95"
              >
                <Feather className="w-4 h-4" />
                <span>Weave Another Tale</span>
              </button>
            </div>
          </div>
        );
      }

      // Standard Story Right Page: Narrative text
      return (
        <div className="h-full w-full bg-[#fbf9f4] p-8 sm:p-14 flex flex-col justify-between text-[#2c2621] relative border-l border-[#d8cfbe]">
          <div>
            <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-widest text-[#8c7e6c] pb-2 border-b border-[#ded5c4] mb-8">
              <span>Chapter {index}</span>
              <span>The Visual Narrator</span>
            </div>

            <p className="font-serif text-lg sm:text-xl lg:text-2xl leading-relaxed text-[#26211c] first-letter:text-5xl first-letter:font-black first-letter:text-[#a16207] first-letter:float-left first-letter:mr-2.5 first-letter:leading-none">
              <HighlightedNarrative
                text={pageData?.text || ''}
                highlightRange={isPlaying ? highlightRange : null}
              />
            </p>
          </div>

          <div className="text-center text-xs font-serif text-[#a69885] pt-4 border-t border-[#ded5c4]">
            — {index} —
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c1917] text-[#f5f5dc] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#d4af37]" />
          <p className="font-serif text-lg text-[#d4af37]">Opening the archives...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-[#1c1917] text-[#f5f5dc] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-2xl font-serif font-bold text-red-200">Story Not Found</h2>
          <p className="text-sm text-[#a8a29e] max-w-md">{error || 'This tale does not exist or has been removed.'}</p>
          <Link
            to="/library"
            className="mt-4 px-6 py-2.5 bg-[#2a2522] hover:bg-[#38312d] text-[#d4af37] border border-[#d4af37]/40 rounded-xl transition text-sm font-semibold"
          >
            Return to Bookshelf
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141210] text-[#f5f5dc] flex flex-col font-sans select-none overflow-x-hidden">
      <Navbar />

      {/* Reader Controls Toolbar */}
      <div className="bg-[#1c1816]/95 backdrop-blur border-b border-[#352d28] px-4 sm:px-8 py-3 flex items-center justify-between shadow-lg sticky top-[57px] z-40">
        <div className="flex items-center gap-2">
          <Link
            to="/library"
            className="flex items-center gap-1.5 text-xs text-[#a8a29e] hover:text-[#d4af37] px-3 py-1.5 rounded-lg hover:bg-[#28221e] transition font-medium"
          >
            <LibraryIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Bookshelf</span>
          </Link>
          <span className="text-[#4b3f37]">/</span>
          <span className="text-xs font-serif font-semibold text-[#d4af37] truncate max-w-[160px] sm:max-w-md">
            {story.title}
          </span>
        </div>

        {/* Audio Narration, Sound Effect, PDF, Share */}
        <div className="flex items-center gap-2">
          {/* Continuous Story Narration Button */}
          {isPlaying ? (
            <button
              onClick={stopContinuousNarration}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/60 bg-red-950/50 text-red-200 hover:bg-red-900/60 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition cursor-pointer"
              title="Stop continuous story narration"
            >
              <Square className="w-3.5 h-3.5 fill-current text-red-400" />
              <span>Stop Narration</span>
            </button>
          ) : (
            <button
              onClick={startContinuousNarration}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-[#443831] bg-[#29221e] text-[#d6d3d1] hover:text-[#d4af37] hover:border-[#d4af37]/50 shadow-md transition cursor-pointer"
              title="Narrate the entire story from beginning to end with automatic 3D page turns"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Narrate Story</span>
            </button>
          )}

          {/* Continuous Narration Live Badge */}
          {isPlaying && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/30 px-2.5 py-1 rounded-full animate-pulse">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              <span>
                {currentPage === 0
                  ? 'Narrating Cover...'
                  : currentPage === totalPages - 1
                    ? 'Narrating Epilogue...'
                    : `Narrating Chapter ${currentPage} of ${story.pages.length}`}
              </span>
            </div>
          )}

          {/* Paper Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 ${
              soundEnabled
                ? 'bg-[#29221e] text-[#d4af37] border-[#5e4e37]'
                : 'bg-[#221c18] text-[#786d63] border-[#382f28]'
            }`}
            title={soundEnabled ? 'Paper flip sound on' : 'Paper flip sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{soundEnabled ? 'Rustle On' : 'Rustle Off'}</span>
          </button>

          {/* PDF Download */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#29221e] text-[#d6d3d1] hover:text-[#d4af37] border border-[#443831] transition cursor-pointer"
            title="Download PDF Storybook"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#29221e] text-[#d6d3d1] hover:text-[#d4af37] border border-[#443831] transition cursor-pointer"
            title="Copy Share Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Book Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl">
          
          {/* 3D Perspective Book Wrapper */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[640px] book-perspective">
            
            {/* Outer Leather Hardcover Binding Base */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c1714] via-[#2d2420] to-[#1c1714] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#3a2e27] p-2.5 sm:p-4 flex">
              
              {/* Stack of pages left and right (Physical page rim thickness) */}
              <div className="relative w-full h-full flex rounded-lg overflow-hidden shadow-2xl book-preserve-3d">
                
                {/* STATIONARY LEFT PAGE */}
                <div 
                  onClick={currentPage > 0 && flipState === 'idle' ? flipPrev : undefined}
                  className={`w-1/2 h-full relative ${currentPage > 0 && flipState === 'idle' ? 'cursor-pointer group' : ''}`}
                >
                  {/* Left Spine Crease Shadow */}
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/35 via-black/10 to-transparent pointer-events-none z-10" />
                  
                  {/* Left Page Paper Stack Rim */}
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-[#cfc3ad] to-transparent pointer-events-none z-10" />

                  {/* Content of the stationary left page */}
                  <div className="w-full h-full relative z-20">
                    {flipState === 'flipping-prev'
                      ? renderPage(currentPage - 1, 'left')
                      : renderPage(currentPage, 'left')}
                  </div>

                  {/* Left page peel hover indicator */}
                  {currentPage > 0 && flipState === 'idle' && (
                    <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-serif font-bold text-[#8c7b64] bg-[#ebdcc2]/80 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm pointer-events-none z-30">
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Turn Back</span>
                    </div>
                  )}
                </div>

                {/* CENTRAL SPINE CREASE (Deep 3D Binding Shadow) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1.5 -translate-x-1/2 bg-[#2c221c] shadow-[0_0_12px_rgba(0,0,0,0.8)] z-30 pointer-events-none" />

                {/* STATIONARY RIGHT PAGE */}
                <div 
                  onClick={currentPage < totalPages - 1 && flipState === 'idle' ? flipNext : undefined}
                  className={`w-1/2 h-full relative ${currentPage < totalPages - 1 && flipState === 'idle' ? 'cursor-pointer group' : ''}`}
                >
                  {/* Right Spine Crease Shadow */}
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black/35 via-black/10 to-transparent pointer-events-none z-10" />
                  
                  {/* Right Page Paper Stack Rim */}
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-[#cfc3ad] to-transparent pointer-events-none z-10" />

                  {/* Content of the stationary right page */}
                  <div className="w-full h-full relative z-20">
                    {flipState === 'flipping-next'
                      ? renderPage(currentPage + 1, 'right')
                      : renderPage(currentPage, 'right')}
                  </div>

                  {/* Right page peel hover indicator */}
                  {currentPage < totalPages - 1 && flipState === 'idle' && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-serif font-bold text-[#8c7b64] bg-[#ebdcc2]/80 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm pointer-events-none z-20">
                      <span>Turn Page</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* --- 3D TURNING LEAF (NEXT) --- */}
                {flipState === 'flipping-next' && (
                  <div className="absolute right-0 top-0 w-1/2 h-full leaf-flip-next z-40 pointer-events-none">
                    {/* Front side of flipping leaf (showing current right page) */}
                    <div className="absolute inset-0 backface-hidden shadow-2xl">
                      {renderPage(currentPage, 'right')}
                      {/* Dynamic light/shadow overlay as leaf curls upward */}
                      <div className="absolute inset-0 bg-black/40 dynamic-shading-next pointer-events-none" />
                    </div>

                    {/* Back side of flipping leaf (showing next left page) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 shadow-2xl">
                      {renderPage(currentPage + 1, 'left')}
                      {/* Dynamic light/shadow overlay as leaf settles down */}
                      <div className="absolute inset-0 bg-black/40 dynamic-shading-prev pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* --- 3D TURNING LEAF (PREVIOUS) --- */}
                {flipState === 'flipping-prev' && (
                  <div className="absolute left-0 top-0 w-1/2 h-full leaf-flip-prev z-40 pointer-events-none">
                    {/* Front side of flipping leaf (showing current left page) */}
                    <div className="absolute inset-0 backface-hidden shadow-2xl">
                      {renderPage(currentPage - 1, 'right')}
                      <div className="absolute inset-0 bg-black/40 dynamic-shading-next pointer-events-none" />
                    </div>

                    {/* Back side of flipping leaf (showing current left page before turn) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 shadow-2xl">
                      {renderPage(currentPage, 'left')}
                      <div className="absolute inset-0 bg-black/40 dynamic-shading-prev pointer-events-none" />
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Bottom Flip / Navigation Controls Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1f1a18] border border-[#3e342d] rounded-2xl px-5 py-3 shadow-xl">
            {/* Prev Button */}
            <button
              onClick={flipPrev}
              disabled={currentPage === 0 || flipState !== 'idle'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#29221e] hover:bg-[#382f2a] border border-[#483b32] text-xs font-bold text-[#d6d3d1] hover:text-[#d4af37] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Page</span>
            </button>

            {/* Chapter indicator & Page bullets */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-serif font-bold text-[#d4af37]">
                {currentPage === 0 
                  ? 'Cover Page' 
                  : currentPage === totalPages - 1 
                    ? 'Conclusion' 
                    : `Chapter ${currentPage} of ${story.pages.length}`}
              </span>

              <div className="flex items-center gap-1.5 max-w-[260px] sm:max-w-xs overflow-x-auto py-1">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToPage(idx)}
                    disabled={flipState !== 'idle'}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentPage === idx
                        ? 'bg-[#d4af37] w-6'
                        : 'bg-[#3e352f] hover:bg-[#61544a] w-2'
                    }`}
                    title={idx === 0 ? 'Cover' : idx === totalPages - 1 ? 'End' : `Page ${idx}`}
                  />
                ))}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={flipNext}
              disabled={currentPage >= totalPages - 1 || flipState !== 'idle'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#29221e] hover:bg-[#382f2a] border border-[#483b32] text-xs font-bold text-[#d6d3d1] hover:text-[#d4af37] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
            >
              <span>Next Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

      {/* 3D Page Turn Styles & Keyframes */}
      <style>{`
        .book-perspective {
          perspective: 2800px;
        }

        .book-preserve-3d {
          transform-style: preserve-3d;
        }

        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .rotate-y-180 {
          transform: rotateY(180deg);
        }

        /* Flipping leaf rotating from Right to Left */
        .leaf-flip-next {
          transform-origin: left center;
          transform-style: preserve-3d;
          animation: leafFlipNext 0.75s cubic-bezier(0.45, 0.05, 0.25, 1) forwards;
        }

        @keyframes leafFlipNext {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(-90deg) scale(1.015);
          }
          100% {
            transform: rotateY(-180deg);
          }
        }

        /* Flipping leaf rotating from Left to Right */
        .leaf-flip-prev {
          transform-origin: right center;
          transform-style: preserve-3d;
          animation: leafFlipPrev 0.75s cubic-bezier(0.45, 0.05, 0.25, 1) forwards;
        }

        @keyframes leafFlipPrev {
          0% {
            transform: rotateY(-180deg);
          }
          50% {
            transform: rotateY(-90deg) scale(1.015);
          }
          100% {
            transform: rotateY(0deg);
          }
        }

        /* Dynamic shading sweep across leaf face */
        .dynamic-shading-next {
          animation: shadingSweepNext 0.75s cubic-bezier(0.45, 0.05, 0.25, 1) forwards;
        }

        @keyframes shadingSweepNext {
          0% { opacity: 0; }
          45% { opacity: 0.45; }
          55% { opacity: 0.35; }
          100% { opacity: 0; }
        }

        .dynamic-shading-prev {
          animation: shadingSweepPrev 0.75s cubic-bezier(0.45, 0.05, 0.25, 1) forwards;
        }

        @keyframes shadingSweepPrev {
          0% { opacity: 0.4; }
          50% { opacity: 0.3; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StoryViewer;

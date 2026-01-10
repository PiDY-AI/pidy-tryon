import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface TrialRoomDoorProps {
  isOpening: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  onDoorOpened?: () => void;
}

const loadingMessages = [
  "Entering fitting room...",
  "Analyzing your measurements...",
  "Finding your perfect size...",
  "Generating virtual preview...",
  "AI styling in progress...",
  "Almost ready...",
];

export const TrialRoomDoor = ({ isOpening, isLoading, children, onDoorOpened }: TrialRoomDoorProps) => {
  const [phase, setPhase] = useState<'idle' | 'closing' | 'waiting' | 'opening' | 'open'>('idle');
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isOpening && phase === 'idle') {
      // Doors close first (person entering)
      setPhase('closing');
      const closeTimer = setTimeout(() => setPhase('waiting'), 800);
      return () => clearTimeout(closeTimer);
    }
  }, [isOpening, phase]);

  // When loading completes, open the door
  useEffect(() => {
    if (!isLoading && phase === 'waiting') {
      setPhase('opening');
      const openTimer = setTimeout(() => {
        setPhase('open');
        onDoorOpened?.();
      }, 800);
      return () => clearTimeout(openTimer);
    }
  }, [isLoading, phase, onDoorOpened]);

  // Cycle through messages while waiting
  useEffect(() => {
    if (phase === 'waiting' || phase === 'closing') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Reset when not opening
  useEffect(() => {
    if (!isOpening) {
      setPhase('idle');
      setMessageIndex(0);
    }
  }, [isOpening]);

  const isDoorClosed = phase === 'closing' || phase === 'waiting';
  const isDoorOpen = phase === 'opening' || phase === 'open';

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted to-background">
      {/* Room interior (visible when door is open) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className={`absolute inset-0 transition-opacity duration-500 ${phase === 'open' ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>

      {/* Left door panel */}
      <div 
        className={`absolute top-0 left-0 w-1/2 h-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          isDoorOpen ? '-rotate-y-105' : 'rotate-y-0'
        }`}
        style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,20%,14%)] to-[hsl(220,20%,18%)] border-r border-border/30 shadow-xl">
          {/* Elegant panel insets */}
          <div className="absolute top-6 bottom-6 left-4 right-2 border border-primary/10 rounded-lg bg-gradient-to-b from-primary/5 to-transparent" />
          {/* Handle */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-primary/80 to-primary/40 rounded-full shadow-lg" />
        </div>
      </div>

      {/* Right door panel */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full origin-right transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          isDoorOpen ? 'rotate-y-105' : 'rotate-y-0'
        }`}
        style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-[hsl(220,20%,14%)] to-[hsl(220,20%,18%)] border-l border-border/30 shadow-xl">
          {/* Elegant panel insets */}
          <div className="absolute top-6 bottom-6 right-4 left-2 border border-primary/10 rounded-lg bg-gradient-to-b from-primary/5 to-transparent" />
          {/* Handle */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-primary/80 to-primary/40 rounded-full shadow-lg" />
        </div>
      </div>

      {/* Overlay content on closed door */}
      {isDoorClosed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          {/* Fitting room sign */}
          <div className="mb-6 px-4 py-1.5 border border-primary/30 rounded-full bg-primary/10 backdrop-blur-sm">
            <span className="text-[10px] font-semibold tracking-[0.25em] text-primary uppercase">Fitting Room</span>
          </div>
          
          {/* Animated icon */}
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary animate-pulse" />
            </div>
          </div>
          
          {/* Loading message with smooth transition */}
          <div className="h-5 overflow-hidden mb-5 px-4">
            <div 
              className="transition-transform duration-500 ease-out"
              style={{ transform: `translateY(-${messageIndex * 20}px)` }}
            >
              {loadingMessages.map((msg, i) => (
                <p key={i} className="h-5 text-xs text-muted-foreground flex items-center justify-center">
                  {msg}
                </p>
              ))}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-32 h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full animate-progress" />
          </div>
        </div>
      )}

      {/* Door frame */}
      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-border/40" />
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-border/40" />
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-border/40" />
        <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-border/40" />
      </div>
    </div>
  );
};

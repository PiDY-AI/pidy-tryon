import { useState, useEffect } from 'react';
import { Sparkles, User } from 'lucide-react';

interface TrialRoomDoorProps {
  isOpening: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  onDoorOpened?: () => void;
}

const loadingMessages = [
  "Analyzing your measurements...",
  "Checking fit preferences...",
  "Calculating perfect size...",
  "Generating virtual preview...",
  "AI styling in progress...",
  "Almost ready...",
];

export const TrialRoomDoor = ({ isOpening, isLoading, children, onDoorOpened }: TrialRoomDoorProps) => {
  const [phase, setPhase] = useState<'idle' | 'walking' | 'entering' | 'closed' | 'waiting' | 'opening' | 'open'>('idle');
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isOpening && phase === 'idle') {
      // Start the sequence: walking -> entering -> closed -> waiting
      setPhase('walking');
      
      // Person walks to door
      const walkTimer = setTimeout(() => setPhase('entering'), 800);
      // Person enters, door starts closing
      const enterTimer = setTimeout(() => setPhase('closed'), 1600);
      // Door fully closed, waiting begins
      const closedTimer = setTimeout(() => setPhase('waiting'), 2200);
      
      return () => {
        clearTimeout(walkTimer);
        clearTimeout(enterTimer);
        clearTimeout(closedTimer);
      };
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
    if (phase === 'waiting' || phase === 'closed') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
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

  const isDoorClosed = phase === 'closed' || phase === 'waiting';
  const isDoorOpen = phase === 'opening' || phase === 'open';
  const showPerson = phase === 'walking' || phase === 'entering';

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted to-background">
      {/* Room interior (visible when door is open) */}
      <div className="absolute inset-0">
        {/* Interior lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_60%)]" />
        
        {/* Content inside the room */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${phase === 'open' ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>

      {/* Walking person silhouette */}
      {showPerson && (
        <div 
          className={`absolute bottom-0 left-1/2 z-20 transition-all duration-700 ease-out ${
            phase === 'walking' 
              ? '-translate-x-[200%] scale-75' 
              : phase === 'entering'
              ? '-translate-x-1/2 scale-100 opacity-0'
              : '-translate-x-1/2'
          }`}
        >
          <div className="relative">
            {/* Person silhouette */}
            <div className="w-16 h-32 relative animate-walk">
              {/* Head */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-foreground/80" />
              {/* Body */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-14 rounded-t-lg bg-foreground/70" />
              {/* Legs */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="w-4 h-12 bg-foreground/60 rounded-b animate-leg-left" />
                <div className="w-4 h-12 bg-foreground/60 rounded-b animate-leg-right" />
              </div>
            </div>
            {/* Shadow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/30 rounded-full blur-sm" />
          </div>
        </div>
      )}

      {/* Left door panel */}
      <div 
        className={`absolute top-0 left-0 w-1/2 h-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          isDoorOpen ? '-rotate-y-105' : 'rotate-y-0'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Door surface */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-muted border-r border-border/50">
          {/* Door panels */}
          <div className="absolute inset-4 border border-border/30 rounded-lg" />
          <div className="absolute inset-8 border border-border/20 rounded-lg" />
          
          {/* Door handle */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-8 bg-primary/60 rounded-full shadow-lg" />
        </div>
      </div>

      {/* Right door panel */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full origin-right transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          isDoorOpen ? 'rotate-y-105' : 'rotate-y-0'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Door surface */}
        <div className="absolute inset-0 bg-gradient-to-l from-secondary to-muted border-l border-border/50">
          {/* Door panels */}
          <div className="absolute inset-4 border border-border/30 rounded-lg" />
          <div className="absolute inset-8 border border-border/20 rounded-lg" />
          
          {/* Door handle */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-8 bg-primary/60 rounded-full shadow-lg" />
        </div>
      </div>

      {/* Overlay content on closed door */}
      {isDoorClosed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          {/* "FITTING ROOM" sign */}
          <div className="mb-8 px-6 py-2 bg-primary/20 border border-primary/40 rounded-lg">
            <span className="text-xs font-bold tracking-[0.3em] text-primary">FITTING ROOM</span>
          </div>
          
          {/* Occupied indicator */}
          <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center mb-6 animate-pulse glow-border">
            <User className="w-10 h-10 text-primary" />
          </div>
          
          {/* Loading message */}
          <div className="text-center px-8">
            <div className="h-6 overflow-hidden mb-4">
              <div 
                className="transition-transform duration-500 ease-out"
                style={{ transform: `translateY(-${messageIndex * 24}px)` }}
              >
                {loadingMessages.map((msg, i) => (
                  <p key={i} className="h-6 text-sm font-medium text-foreground flex items-center justify-center">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
            
            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
          
          {/* Sparkle decorations */}
          <div className="absolute top-1/4 left-1/4 animate-pulse">
            <Sparkles className="w-4 h-4 text-primary/40" />
          </div>
          <div className="absolute top-1/3 right-1/4 animate-pulse" style={{ animationDelay: '0.5s' }}>
            <Sparkles className="w-3 h-3 text-primary/30" />
          </div>
          <div className="absolute bottom-1/3 left-1/3 animate-pulse" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        </div>
      )}

      {/* Door frame */}
      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-0 left-0 right-0 h-2 bg-border/60" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-border/60" />
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-border/60" />
        <div className="absolute top-0 right-0 bottom-0 w-2 bg-border/60" />
      </div>
    </div>
  );
};

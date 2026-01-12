import { useState, useEffect } from 'react';
import pidyLogo from '@/assets/pidy-logo.png';

interface TrialRoomDoorProps {
  isOpening: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  onDoorOpened?: () => void;
}

const loadingMessages = [
  "Generating your best fit...",
  "Matching size chart to your body...",
  "Simulating drape and fit...",
  "Refining details...",
  "Preparing your try-on image...",
  "Almost ready...",
];

export const TrialRoomDoor = ({ isOpening, isLoading, children, onDoorOpened }: TrialRoomDoorProps) => {
  const [phase, setPhase] = useState<'idle' | 'doors-open' | 'walking' | 'doors-closing' | 'waiting' | 'reveal' | 'open'>('idle');
  const [messageIndex, setMessageIndex] = useState(0);
  const [apiReady, setApiReady] = useState(false);

  // Start sequence when opening begins
  useEffect(() => {
    if (isOpening && phase === 'idle') {
      setApiReady(false);
      setPhase('doors-open');
    }
  }, [isOpening, phase]);

  // Phase progression (split into step-based timers to be resilient in React 18 dev/StrictMode)
  useEffect(() => {
    if (!isOpening) return;

    if (phase === 'doors-open') {
      const t = setTimeout(() => setPhase('walking'), 600);
      return () => clearTimeout(t);
    }

    if (phase === 'walking') {
      const t = setTimeout(() => setPhase('doors-closing'), 1400);
      return () => clearTimeout(t);
    }

    if (phase === 'doors-closing') {
      const t = setTimeout(() => setPhase('waiting'), 600);
      return () => clearTimeout(t);
    }
  }, [isOpening, phase]);

  // Track when API is ready
  useEffect(() => {
    if (!isLoading && isOpening) {
      setApiReady(true);
    }
  }, [isLoading, isOpening]);

  // When loading completes AND we're in waiting phase, reveal
  useEffect(() => {
    if (apiReady && phase === 'waiting') {
      setPhase('reveal');
    }
  }, [apiReady, phase]);

  // Once in reveal phase, open doors after a short delay
  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => {
        setPhase('open');
        onDoorOpened?.();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [phase, onDoorOpened]);

  // Cycle messages
  useEffect(() => {
    if (phase === 'waiting') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Reset
  useEffect(() => {
    if (!isOpening) {
      setPhase('idle');
      setMessageIndex(0);
      setApiReady(false);
    }
  }, [isOpening]);

  const doorsOpen = phase === 'doors-open' || phase === 'walking' || phase === 'reveal' || phase === 'open';
  const showPerson = phase === 'walking';
  const showWaitingOverlay = phase === 'doors-closing' || phase === 'waiting';

  const doorStatusLabel = (() => {
    switch (phase) {
      case 'doors-open':
        return 'Doors opening';
      case 'walking':
        return 'Doors open';
      case 'doors-closing':
        return 'Doors closing';
      case 'waiting':
        return 'Doors closed';
      case 'reveal':
        return 'Doors opening';
      case 'open':
        return 'Doors open';
      default:
        return 'Idle';
    }
  })();

  const responseStatusLabel = isOpening ? (isLoading ? 'Waiting for response…' : 'Response received') : null;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted to-background">
      {isOpening && (
        <div className="absolute top-3 left-3 z-40 rounded-full border border-border bg-background/60 backdrop-blur-sm px-3 py-1.5 text-[11px] leading-none text-muted-foreground">
          <span className="font-medium text-foreground">{doorStatusLabel}</span>
          {responseStatusLabel ? <span className="ml-2 opacity-80">{responseStatusLabel}</span> : null}
        </div>
      )}

      {/* Room interior with spotlight */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,hsl(var(--primary)/0.2),transparent_70%)]" />
        <div className={`absolute inset-0 transition-opacity duration-500 ${phase === 'open' ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>

      {/* Walking person silhouette - elegant glowing version */}
      {showPerson && (
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-8 pointer-events-none">
          <div className="silhouette-walk">
            {/* Glowing silhouette */}
            <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
              {/* Head */}
              <circle cx="30" cy="12" r="10" fill="hsl(var(--primary))" opacity="0.9" />
              {/* Body */}
              <ellipse cx="30" cy="45" rx="14" ry="22" fill="hsl(var(--primary))" opacity="0.7" />
              {/* Left leg */}
              <ellipse cx="22" cy="82" rx="6" ry="18" fill="hsl(var(--primary))" opacity="0.6" className="animate-leg-swing-left" />
              {/* Right leg */}
              <ellipse cx="38" cy="82" rx="6" ry="18" fill="hsl(var(--primary))" opacity="0.6" className="animate-leg-swing-right" />
              {/* Glow effect */}
              <circle cx="30" cy="50" r="35" fill="url(#silhouetteGlow)" />
              <defs>
                <radialGradient id="silhouetteGlow">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
            {/* Shadow on floor */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-black/40 rounded-full blur-md" />
          </div>
        </div>
      )}

      {/* Left door */}
      <div 
        className={`absolute top-0 left-0 w-1/2 h-full origin-left transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          doorsOpen ? '-rotate-y-105' : 'rotate-y-0'
        }`}
        style={{ transformStyle: 'preserve-3d', transitionDuration: '600ms', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-muted border-r border-primary/20 shadow-2xl">
          <div className="absolute top-8 bottom-8 left-6 right-3 rounded-lg border border-primary/15 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2 h-14 bg-gradient-to-b from-primary to-primary/50 rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
        </div>
      </div>

      {/* Right door */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full origin-right transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          doorsOpen ? 'rotate-y-105' : 'rotate-y-0'
        }`}
        style={{ transformStyle: 'preserve-3d', transitionDuration: '600ms', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-secondary to-muted border-l border-primary/20 shadow-2xl">
          <div className="absolute top-8 bottom-8 right-6 left-3 rounded-lg border border-primary/15 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="absolute left-5 top-1/2 -translate-y-1/2 w-2 h-14 bg-gradient-to-b from-primary to-primary/50 rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
        </div>
      </div>

      {/* Waiting overlay on closed doors */}
      {showWaitingOverlay && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center animate-fade-in">
          {/* Trial room badge */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
            <div className="relative px-6 py-2 border border-primary/40 rounded-full bg-background/50 backdrop-blur-sm">
              <span className="text-xs font-bold tracking-[0.3em] text-primary">FITTING ROOM</span>
            </div>
          </div>
          
          {/* Animated rings */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-[ping_2s_ease-out_infinite]" />
            <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-[ping_2s_ease-out_infinite_0.3s]" />
            <div className="absolute inset-4 rounded-full border-2 border-primary/50 animate-[ping_2s_ease-out_infinite_0.6s]" />
            <div className="absolute inset-0 rounded-full bg-primary/10 flex items-center justify-center">
              <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain animate-pulse" />
            </div>
          </div>
          
          {/* Tagline messages */}
          <div className="text-center space-y-3 px-6">
            <div className="h-7 overflow-hidden">
              <div 
                className="transition-transform duration-700 ease-out"
                style={{ transform: `translateY(-${messageIndex * 28}px)` }}
              >
                {loadingMessages.map((msg, i) => (
                  <p key={i} className="h-7 text-base font-medium text-foreground flex items-center justify-center">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">This may take a moment...</p>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-8 flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Door frame */}
      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-border/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-border/50 to-transparent" />
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-r from-border/50 to-transparent" />
        <div className="absolute top-0 right-0 bottom-0 w-2 bg-gradient-to-l from-border/50 to-transparent" />
      </div>
    </div>
  );
};

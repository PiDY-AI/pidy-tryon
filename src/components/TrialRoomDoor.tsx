import { useState, useEffect } from 'react';
import pidyLogo from '@/assets/pidy_logo_white.png';

interface TrialRoomDoorProps {
  isOpening: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  onDoorOpened?: () => void;
}

const loadingMessages = [
  "Curating your silhouette...",
  "Analyzing proportions...",
  "Tailoring the perfect fit...",
  "Refining every detail...",
  "Preparing your look...",
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

  // Phase progression
  useEffect(() => {
    if (!isOpening) return;

    if (phase === 'doors-open') {
      const t = setTimeout(() => setPhase('walking'), 700);
      return () => clearTimeout(t);
    }

    if (phase === 'walking') {
      const t = setTimeout(() => setPhase('doors-closing'), 1500);
      return () => clearTimeout(t);
    }

    if (phase === 'doors-closing') {
      const t = setTimeout(() => setPhase('waiting'), 700);
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
      }, 900);

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

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-secondary/50 via-background to-background">

      {/* Luxury room interior with ambient lighting */}
      <div className="absolute inset-0">
        {/* Subtle top spotlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        {/* Side ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className={`absolute inset-0 transition-opacity duration-700 ${phase === 'open' ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>

      {/* Elegant walking silhouette */}
      {showPerson && (
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-12 pointer-events-none">
          <div className="silhouette-walk">
            <svg width="50" height="90" viewBox="0 0 60 100" className="drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]">
              {/* Head */}
              <circle cx="30" cy="12" r="9" fill="hsl(var(--primary))" opacity="0.85" />
              {/* Body - elegant shape */}
              <ellipse cx="30" cy="44" rx="12" ry="20" fill="hsl(var(--primary))" opacity="0.65" />
              {/* Left leg */}
              <ellipse cx="23" cy="80" rx="5" ry="16" fill="hsl(var(--primary))" opacity="0.55" className="animate-leg-swing-left" />
              {/* Right leg */}
              <ellipse cx="37" cy="80" rx="5" ry="16" fill="hsl(var(--primary))" opacity="0.55" className="animate-leg-swing-right" />
              {/* Outer glow */}
              <circle cx="30" cy="45" r="40" fill="url(#luxuryGlow)" />
              <defs>
                <radialGradient id="luxuryGlow">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/30 rounded-full blur-sm" />
          </div>
        </div>
      )}

      {/* Luxury single door with art deco styling */}
      <div 
        className={`absolute top-0 left-0 w-full h-full origin-left transition-transform z-10 ${
          doorsOpen ? '-rotate-y-105' : 'rotate-y-0'
        }`}
        style={{ 
          transformStyle: 'preserve-3d', 
          transitionDuration: '700ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          backfaceVisibility: 'hidden' 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-muted via-secondary to-muted border-r border-primary/30">
          {/* Gold corner accents */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-primary/50" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-primary/50" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-primary/50" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-primary/50" />
          
          {/* Inner panel */}
          <div className="absolute top-12 bottom-12 left-10 right-10 border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="absolute top-20 bottom-20 left-16 right-16 border border-primary/10" />
          
          {/* Elegant vertical door handle */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
            <div className="w-0.5 h-12 bg-gradient-to-b from-primary via-primary/80 to-primary/30" />
            <div className="w-4 h-4 rounded-full border border-primary/50 bg-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.4)]" />
            <div className="w-0.5 h-12 bg-gradient-to-t from-primary via-primary/80 to-primary/30" />
          </div>
        </div>
      </div>

      {/* Luxury waiting overlay */}
      {showWaitingOverlay && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center animate-fade-in bg-gradient-to-b from-secondary/80 to-background/90 backdrop-blur-sm">
          
          {/* Top decorative line */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-primary/40" />
            <div className="w-1.5 h-1.5 rotate-45 border border-primary/50" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          
          {/* Brand badge */}
          <div className="mb-10 relative">
            <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-primary/80">Private Suite</span>
          </div>
          
          {/* Elegant pulsing logo */}
          <div className="relative w-28 h-28 mb-10">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_ease-out_infinite]" />
            <div className="absolute inset-3 rounded-full border border-primary/30 animate-[ping_3s_ease-out_infinite_0.5s]" />
            <div className="absolute inset-6 rounded-full border border-primary/40" />
            <div className="absolute inset-6 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain animate-glow-subtle" />
            </div>
          </div>
          
          {/* Rotating messages */}
          <div className="text-center space-y-4 px-8">
            <div className="h-6 overflow-hidden">
              <div 
                className="transition-transform duration-700 ease-out"
                style={{ transform: `translateY(-${messageIndex * 24}px)` }}
              >
                {loadingMessages.map((msg, i) => (
                  <p key={i} className="h-6 text-sm font-display tracking-wide text-foreground flex items-center justify-center">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">Please wait</p>
          </div>
          
          {/* Minimal progress dots */}
          <div className="mt-10 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
          
          {/* Bottom decorative line */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary/30" />
            <div className="w-1 h-1 rotate-45 bg-primary/40" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-primary/30" />
          </div>
        </div>
      )}

      {/* Subtle frame edges */}
      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-primary/10 to-transparent" />
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-r from-primary/10 to-transparent" />
        <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-l from-primary/10 to-transparent" />
      </div>
    </div>
  );
};
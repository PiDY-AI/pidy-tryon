import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface TrialRoomDoorProps {
  isOpening: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  onDoorOpened?: () => void;
}

export const TrialRoomDoor = ({ isOpening, isLoading, children, onDoorOpened }: TrialRoomDoorProps) => {
  const [doorState, setDoorState] = useState<'closed' | 'opening' | 'open'>('closed');

  useEffect(() => {
    if (isOpening && doorState === 'closed') {
      setDoorState('opening');
      // Door takes 800ms to open
      const timer = setTimeout(() => {
        setDoorState('open');
        onDoorOpened?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpening, doorState, onDoorOpened]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      {/* Trial room interior (always visible behind door) */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted to-background">
        {/* Interior lighting effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        
        {/* Content inside the room */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${doorState === 'open' ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>

        {/* Loading state inside room */}
        {doorState !== 'closed' && isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              {/* Mirror frame */}
              <div className="relative w-48 h-64 mx-auto mb-4 rounded-t-full border-4 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
                {/* Scanning effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent animate-scan" />
                
                {/* Reflection shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Preparing your look...</p>
            </div>
          </div>
        )}
      </div>

      {/* Left door panel */}
      <div 
        className={`absolute top-0 left-0 w-1/2 h-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          doorState !== 'closed' ? '-rotate-y-105' : 'rotate-y-0'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Door surface */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-muted border-r border-border/50">
          {/* Door panel detail */}
          <div className="absolute inset-4 border border-border/30 rounded-lg" />
          <div className="absolute inset-8 border border-border/20 rounded-lg" />
          
          {/* Door handle */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-8 bg-primary/60 rounded-full shadow-lg" />
        </div>
        
        {/* Door edge (thickness) */}
        <div 
          className="absolute top-0 right-0 w-3 h-full bg-muted origin-left"
          style={{ transform: 'rotateY(90deg) translateX(-1.5px)' }}
        />
      </div>

      {/* Right door panel */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full origin-right transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          doorState !== 'closed' ? 'rotate-y-105' : 'rotate-y-0'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Door surface */}
        <div className="absolute inset-0 bg-gradient-to-l from-secondary to-muted border-l border-border/50">
          {/* Door panel detail */}
          <div className="absolute inset-4 border border-border/30 rounded-lg" />
          <div className="absolute inset-8 border border-border/20 rounded-lg" />
          
          {/* Door handle */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-8 bg-primary/60 rounded-full shadow-lg" />
          
          {/* "FITTING ROOM" text */}
          <div className="absolute top-6 left-0 right-0 text-center">
            <span className="text-xs font-semibold tracking-widest text-primary/60">FITTING</span>
            <br />
            <span className="text-xs font-semibold tracking-widest text-primary/60">ROOM</span>
          </div>
        </div>
        
        {/* Door edge (thickness) */}
        <div 
          className="absolute top-0 left-0 w-3 h-full bg-muted origin-right"
          style={{ transform: 'rotateY(-90deg) translateX(1.5px)' }}
        />
      </div>

      {/* Door frame overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-border/50" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-border/50" />
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-border/50" />
        <div className="absolute top-0 right-0 bottom-0 w-2 bg-border/50" />
      </div>
    </div>
  );
};

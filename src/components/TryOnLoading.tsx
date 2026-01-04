import { Sparkles } from 'lucide-react';

const loadingMessages = [
  "Analyzing your measurements...",
  "Generating virtual try-on...",
  "Crafting your perfect fit...",
  "AI magic in progress...",
];

export const TryOnLoading = () => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-scale-in">
      <div className="aspect-[3/4] bg-gradient-to-br from-secondary to-muted relative overflow-hidden flex items-center justify-center">
        {/* Animated background effects */}
        <div className="absolute inset-0">
          {/* Rotating gradient ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full border-2 border-primary/20 animate-[spin_8s_linear_infinite]" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-primary/30 animate-[spin_6s_linear_infinite_reverse]" />
            <div className="absolute w-32 h-32 rounded-full border-2 border-primary/40 animate-[spin_4s_linear_infinite]" />
          </div>
          
          {/* Pulsing glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.15),transparent_50%)] animate-pulse" />
          
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary/60 rounded-full animate-float"
              style={{
                left: `${20 + i * 12}%`,
                top: `${30 + (i % 3) * 15}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            />
          ))}
          
          {/* Scanning line effect */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-scan" />
        </div>
        
        {/* Center content */}
        <div className="relative z-10 text-center px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse glow-border">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Creating Your Look
          </h3>
          <div className="h-6 overflow-hidden">
            <div className="animate-text-slide">
              {loadingMessages.map((msg, i) => (
                <p key={i} className="text-sm text-muted-foreground h-6 flex items-center justify-center">
                  {msg}
                </p>
              ))}
            </div>
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom shimmer bar */}
      <div className="p-6 space-y-4">
        <div className="h-8 bg-secondary rounded-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
        </div>
        <div className="h-4 bg-secondary rounded-lg w-3/4 mx-auto overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
};

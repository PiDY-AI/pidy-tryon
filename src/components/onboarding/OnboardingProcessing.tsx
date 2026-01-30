import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, Sparkles } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';

interface OnboardingProcessingProps {
  onComplete: () => void;
}

const steps = [
  { label: 'Analyzing photos', duration: 2000 },
  { label: 'Calculating measurements', duration: 2500 },
  { label: 'Creating your profile', duration: 1500 },
  { label: 'Preparing fitting room', duration: 1000 },
];

export const OnboardingProcessing = ({ onComplete }: OnboardingProcessingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let totalElapsed = 0;
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

    const interval = setInterval(() => {
      totalElapsed += 100;
      const newProgress = Math.min((totalElapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Determine current step
      let elapsed = 0;
      for (let i = 0; i < steps.length; i++) {
        elapsed += steps[i].duration;
        if (totalElapsed < elapsed) {
          setCurrentStep(i);
          break;
        }
        if (i === steps.length - 1) {
          setCurrentStep(steps.length);
        }
      }

      if (totalElapsed >= totalDuration) {
        clearInterval(interval);
        // Small delay before completing
        setTimeout(onComplete, 500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  const isComplete = currentStep >= steps.length;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-6">
      {/* Animated logo */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-20" />
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-glow-subtle" />
        <div className="absolute inset-2 rounded-full bg-background border border-primary/30 flex items-center justify-center">
          <img 
            src={pidyLogo} 
            alt="PIDY" 
            className={`w-12 h-12 object-contain transition-transform duration-500 ${
              isComplete ? 'scale-110' : 'animate-pulse'
            }`} 
          />
        </div>
        {isComplete && (
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-scale-in">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center mb-8">
        <h2 className="font-display text-xl text-foreground tracking-wide mb-2">
          {isComplete ? "You're all set!" : 'Setting up your profile'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isComplete 
            ? 'Your private fitting room is ready'
            : 'This will only take a moment'
          }
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-6">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step indicators */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep || isComplete;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isDone ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary/20 border border-primary text-primary'
                    : 'bg-card border border-border text-muted-foreground'
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isActive ? (
                  <Sparkles className="w-3 h-3 animate-pulse" />
                ) : (
                  <span className="text-[10px]">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  isDone || isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Email notification note */}
      {isComplete && (
        <div className="mt-8 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center animate-fade-in">
          <p className="text-[11px] text-muted-foreground">
            Check your email for a link to view all your try-ons
          </p>
        </div>
      )}
    </div>
  );
};

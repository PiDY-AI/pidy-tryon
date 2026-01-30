import { Button } from '@/components/ui/button';
import { Camera, FileText, Ruler, CheckCircle2 } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';

interface OnboardingGuidelinesProps {
  onNext: () => void;
}

export const OnboardingGuidelines = ({ onNext }: OnboardingGuidelinesProps) => {
  const guidelines = [
    {
      icon: <Camera className="w-5 h-5" />,
      title: 'Have your headshot ready',
      description: 'We already have your face photo from your profile',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: 'Prepare an A4 sheet',
      description: 'Hold it in your photos for accurate body measurement',
    },
    {
      icon: <Ruler className="w-5 h-5" />,
      title: 'Wear fitted clothing',
      description: 'Helps us measure your body accurately',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <img src={pidyLogo} alt="PIDY" className="w-8 h-8 object-contain" />
        </div>
        <h2 className="font-display text-xl text-foreground tracking-wide mb-1">
          Welcome to PIDY
        </h2>
        <p className="text-xs uppercase tracking-luxury text-muted-foreground">
          Let's set up your virtual fitting
        </p>
      </div>

      {/* Guidelines list */}
      <div className="flex-1 space-y-4">
        {guidelines.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 rounded-lg bg-card/50 border border-border/50 animate-fade-in"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground mb-0.5">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* A4 calibration note */}
      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 text-primary mb-1">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Why A4 sheet?</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The standard A4 size (21 × 29.7 cm) helps our AI calculate your exact body measurements from photos.
        </p>
      </div>

      {/* Next button */}
      <Button 
        onClick={onNext}
        className="w-full mt-6 h-12 rounded-none btn-luxury"
        size="lg"
      >
        I'm Ready
      </Button>
    </div>
  );
};

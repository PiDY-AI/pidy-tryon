import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, RotateCcw, User } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';

interface OnboardingHeadshotProps {
  onNext: (headshot: File) => void;
}

export const OnboardingHeadshot = ({ onNext }: OnboardingHeadshotProps) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(file);
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleContinue = () => {
    if (photo) {
      onNext(photo);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <img src={pidyLogo} alt="PIDY" className="w-8 h-8 object-contain" />
        </div>
        <h2 className="font-display text-xl text-foreground tracking-wide mb-1">
          Step 1 of 3
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a clear headshot
        </p>
      </div>

      {/* Photo upload area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className={`relative w-48 h-48 rounded-full border-2 border-dashed transition-all duration-300 overflow-hidden ${
            preview 
              ? 'border-primary/50 bg-primary/5' 
              : 'border-border hover:border-primary/30 bg-card/30'
          }`}
        >
          {preview ? (
            <>
              <img 
                src={preview} 
                alt="Headshot" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5 hover:bg-white/30 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retake
              </button>
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Tap to upload</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* Tips */}
        <div className="mt-6 text-center max-w-xs">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Use a clear, front-facing photo with good lighting. This helps us create accurate try-on previews.
          </p>
        </div>
      </div>

      {/* Continue button */}
      <Button 
        onClick={handleContinue}
        disabled={!photo}
        className="w-full h-12 rounded-none btn-luxury"
        size="lg"
      >
        {photo ? 'Continue' : 'Upload headshot to continue'}
      </Button>
    </div>
  );
};

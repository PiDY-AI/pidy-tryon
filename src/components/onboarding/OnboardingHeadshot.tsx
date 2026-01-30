import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, RotateCcw, Upload, ImagePlus } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';

interface OnboardingHeadshotProps {
  onNext: (headshot: File) => void;
}

export const OnboardingHeadshot = ({ onNext }: OnboardingHeadshotProps) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

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

  const handleContinue = () => {
    if (photo) {
      onNext(photo);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-6 px-6">
        <p className="text-[10px] uppercase tracking-luxury text-primary mb-1">Step 1 of 3</p>
        <h2 className="font-display text-lg text-foreground">Add Headshot</h2>
      </div>

      {/* Photo area - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div 
          className={`relative w-40 h-40 rounded-full border-2 transition-all duration-300 overflow-hidden ${
            preview 
              ? 'border-primary bg-primary/5' 
              : 'border-dashed border-border bg-card/30'
          }`}
        >
          {preview ? (
            <>
              <img 
                src={preview} 
                alt="Headshot" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            </>
          ) : (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-card/50 transition-colors"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-10 h-10 text-primary/60 mb-2" />
              <span className="text-xs text-muted-foreground">Tap to capture</span>
            </div>
          )}
        </div>

        {/* Action buttons - minimal */}
        {!preview ? (
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            or upload from gallery
          </button>
        ) : (
          <button
            onClick={() => {
              setPhoto(null);
              setPreview(null);
            }}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Retake
          </button>
        )}

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Continue button */}
      <div className="flex-shrink-0 p-6">
        <Button 
          onClick={handleContinue}
          disabled={!photo}
          className="w-full h-12 rounded-none btn-luxury"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

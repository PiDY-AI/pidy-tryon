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
          Add a clear headshot
        </p>
      </div>

      {/* Photo display area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className={`relative w-44 h-44 rounded-full border-2 transition-all duration-300 overflow-hidden ${
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
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-primary/60" />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3 w-full max-w-xs">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 gap-2"
            onClick={() => uploadInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>

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

        {/* Change button when photo exists */}
        {preview && (
          <button
            onClick={() => {
              setPhoto(null);
              setPreview(null);
            }}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Remove & retake
          </button>
        )}

        {/* Tips */}
        <div className="mt-4 text-center max-w-xs">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Use a front-facing photo with good lighting for best results
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
        {photo ? 'Continue' : 'Add headshot to continue'}
      </Button>
    </div>
  );
};

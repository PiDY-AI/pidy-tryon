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
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <img src={pidyLogo} alt="PIDY" className="w-6 h-6 object-contain" />
        </div>
        <h2 className="font-display text-lg text-foreground tracking-wide mb-1">
          Step 1 of 3
        </h2>
        <p className="text-sm text-muted-foreground">
          Add a clear headshot
        </p>
      </div>

      {/* Guidelines at top */}
      <div className="mb-4 p-3 rounded-lg bg-card/50 border border-border/50">
        <p className="text-[10px] uppercase tracking-luxury text-primary mb-2">Prepare for next steps</p>
        <ul className="text-[11px] text-muted-foreground space-y-1">
          <li>• <strong className="text-foreground">Now:</strong> Clear front-facing headshot</li>
          <li>• <strong className="text-foreground">Next:</strong> 2 full body photos (front & back)</li>
          <li>• <strong className="text-foreground">Keep ready:</strong> An A4 sheet for body photos</li>
        </ul>
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

        {/* Tip */}
        <p className="mt-3 text-[11px] text-muted-foreground text-center max-w-xs">
          Use good lighting • No sunglasses
        </p>
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

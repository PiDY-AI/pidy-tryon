import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, User, RotateCcw } from 'lucide-react';

interface OnboardingPhotoCaptureProps {
  onNext: (photos: { front: File; back: File }) => void;
  onBack: () => void;
}

type PhotoType = 'front' | 'back';

export const OnboardingPhotoCapture = ({ onNext, onBack }: OnboardingPhotoCaptureProps) => {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: PhotoType, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'front') {
        setFrontPhoto(file);
        setFrontPreview(preview);
      } else {
        setBackPhoto(file);
        setBackPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (type: PhotoType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(type, file);
    }
  };

  const clearPhoto = (type: PhotoType) => {
    if (type === 'front') {
      setFrontPhoto(null);
      setFrontPreview(null);
      if (frontInputRef.current) frontInputRef.current.value = '';
    } else {
      setBackPhoto(null);
      setBackPreview(null);
      if (backInputRef.current) backInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    if (frontPhoto && backPhoto) {
      onNext({ front: frontPhoto, back: backPhoto });
    }
  };

  const isComplete = frontPhoto && backPhoto;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex-shrink-0 text-center px-6 pb-4">
        <h2 className="font-display text-lg text-foreground tracking-wide mb-1">
          Step 2 of 3
        </h2>
        <p className="text-xs text-muted-foreground">
          Upload front & back body photos with A4 sheet
        </p>
      </div>

      {/* Photo capture grid */}
      <div className="flex-1 px-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {/* Front photo */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-luxury text-muted-foreground text-center">
              Front View
            </p>
            <div 
              className={`relative aspect-[3/4] rounded-lg border-2 border-dashed transition-all duration-300 overflow-hidden ${
                frontPreview 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-border hover:border-primary/30 bg-card/30'
              }`}
            >
              {frontPreview ? (
                <>
                  <img 
                    src={frontPreview} 
                    alt="Front view" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                    <button
                      onClick={() => frontInputRef.current?.click()}
                      className="flex-1 h-7 rounded bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-white/30 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                </>
              ) : (
                <button
                  onClick={() => frontInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Tap to capture or upload</span>
                </button>
              )}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleInputChange('front')}
              />
            </div>
          </div>

          {/* Back photo */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-luxury text-muted-foreground text-center">
              Back View
            </p>
            <div 
              className={`relative aspect-[3/4] rounded-lg border-2 border-dashed transition-all duration-300 overflow-hidden ${
                backPreview 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-border hover:border-primary/30 bg-card/30'
              }`}
            >
              {backPreview ? (
                <>
                  <img 
                    src={backPreview} 
                    alt="Back view" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                    <button
                      onClick={() => backInputRef.current?.click()}
                      className="flex-1 h-7 rounded bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-white/30 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                </>
              ) : (
                <button
                  onClick={() => backInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary transform rotate-180" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Tap to capture or upload</span>
                </button>
              )}
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleInputChange('back')}
              />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 p-3 rounded-lg bg-card/50 border border-border/50">
          <p className="text-[10px] uppercase tracking-luxury text-primary mb-2">Photo tips</p>
          <ul className="text-[11px] text-muted-foreground space-y-1">
            <li>• Hold A4 sheet at chest level</li>
            <li>• Stand in good lighting</li>
            <li>• Full body visible from head to feet</li>
          </ul>
        </div>
      </div>

      {/* Continue button */}
      <div className="flex-shrink-0 p-6 pt-4">
        <Button 
          onClick={handleContinue}
          disabled={!isComplete}
          className="w-full h-12 rounded-none btn-luxury"
          size="lg"
        >
          {isComplete ? 'Continue' : 'Upload both photos'}
        </Button>
      </div>
    </div>
  );
};

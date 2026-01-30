import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, User, RotateCcw, Camera, Upload } from 'lucide-react';

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
  
  const frontCameraRef = useRef<HTMLInputElement>(null);
  const frontUploadRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);
  const backUploadRef = useRef<HTMLInputElement>(null);

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
    } else {
      setBackPhoto(null);
      setBackPreview(null);
    }
  };

  const handleContinue = () => {
    if (frontPhoto && backPhoto) {
      onNext({ front: frontPhoto, back: backPhoto });
    }
  };

  const isComplete = frontPhoto && backPhoto;

  const PhotoCard = ({ 
    type, 
    preview, 
    onClear,
    cameraRef,
    uploadRef,
  }: { 
    type: PhotoType; 
    preview: string | null;
    onClear: () => void;
    cameraRef: React.RefObject<HTMLInputElement>;
    uploadRef: React.RefObject<HTMLInputElement>;
  }) => (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-luxury text-muted-foreground text-center">
        {type === 'front' ? 'Front View' : 'Back View'}
      </p>
      <div 
        className={`relative aspect-[3/4] rounded-lg border-2 transition-all duration-300 overflow-hidden ${
          preview 
            ? 'border-primary bg-primary/5' 
            : 'border-dashed border-border bg-card/30'
        }`}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt={`${type} view`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
            <button
              onClick={onClear}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium flex items-center gap-1 hover:bg-black/70 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Remove
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
              <User className={`w-5 h-5 text-primary ${type === 'back' ? 'transform rotate-180' : ''}`} />
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-[9px] font-medium flex flex-col items-center gap-0.5 hover:bg-primary/20 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                Camera
              </button>
              <button
                onClick={() => uploadRef.current?.click()}
                className="flex-1 py-1.5 rounded bg-card border border-border text-muted-foreground text-[9px] font-medium flex flex-col items-center gap-0.5 hover:bg-secondary transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange(type)}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange(type)}
      />
    </div>
  );

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
          Add front & back body photos with A4 sheet
        </p>
      </div>

      {/* Photo capture grid */}
      <div className="flex-1 px-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <PhotoCard 
            type="front" 
            preview={frontPreview} 
            onClear={() => clearPhoto('front')}
            cameraRef={frontCameraRef}
            uploadRef={frontUploadRef}
          />
          <PhotoCard 
            type="back" 
            preview={backPreview} 
            onClear={() => clearPhoto('back')}
            cameraRef={backCameraRef}
            uploadRef={backUploadRef}
          />
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
          {isComplete ? 'Continue' : 'Add both photos'}
        </Button>
      </div>
    </div>
  );
};

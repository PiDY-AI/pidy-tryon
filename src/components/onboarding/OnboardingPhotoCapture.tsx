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
  const batchUploadRef = useRef<HTMLInputElement>(null);

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

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Take first two files - first as front, second as back
    if (files.length >= 1 && !frontPhoto) {
      handleFileSelect('front', files[0]);
    }
    if (files.length >= 2 && !backPhoto) {
      handleFileSelect('back', files[1]);
    } else if (files.length >= 1 && frontPhoto && !backPhoto) {
      handleFileSelect('back', files[0]);
    }
    
    // Reset input
    e.target.value = '';
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
    <div className="flex flex-col items-center">
      <div 
        className={`relative w-full aspect-[3/4] rounded-lg border-2 transition-all duration-300 overflow-hidden ${
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
          </>
        ) : (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-card/50 transition-colors"
            onClick={() => cameraRef.current?.click()}
          >
            <User className={`w-8 h-8 text-primary/60 mb-1 ${type === 'back' ? 'transform rotate-180' : ''}`} />
            <Camera className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">{type === 'front' ? 'Front' : 'Back'}</span>
          </div>
        )}
      </div>
      
      {/* Minimal action text */}
      {!preview ? (
        <button
          onClick={() => uploadRef.current?.click()}
          className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Upload className="w-3 h-3" />
          upload
        </button>
      ) : (
        <button
          onClick={onClear}
          className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          retake
        </button>
      )}
      
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
      <div className="flex-shrink-0 px-6 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-luxury text-primary mb-1">Step 2 of 3</p>
          <h2 className="font-display text-lg text-foreground">Body Photos</h2>
          <p className="text-[10px] text-muted-foreground mt-1">Hold A4 sheet at chest level</p>
        </div>
      </div>

      {/* Photo grid - centered */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
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
      </div>

      {/* Batch upload - subtle */}
      {(!frontPhoto || !backPhoto) && (
        <div className="flex-shrink-0 px-6 pb-2">
          <button
            onClick={() => batchUploadRef.current?.click()}
            className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors py-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload both at once
          </button>
          <input
            ref={batchUploadRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleBatchUpload}
          />
        </div>
      )}

      {/* Continue button */}
      <div className="flex-shrink-0 p-6 pt-2">
        <Button 
          onClick={handleContinue}
          disabled={!isComplete}
          className="w-full h-12 rounded-none btn-luxury"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

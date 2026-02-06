import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, ArrowLeft } from 'lucide-react';

interface OnboardingPhotoCaptureProps {
  onNext: (photos: { front: File; back: File }) => void;
  onBack: () => void;
}

type PhotoType = 'front' | 'side';

// Pose illustration SVG components
const FrontPoseIllustration = () => (
  <svg viewBox="0 0 100 140" fill="none" className="w-full h-full">
    {/* Head */}
    <circle cx="50" cy="20" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Body */}
    <line x1="50" y1="32" x2="50" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Arms spread out */}
    <line x1="50" y1="40" x2="30" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="40" x2="70" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Legs slightly apart */}
    <line x1="50" y1="70" x2="42" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="70" x2="58" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* A4 Paper indicator at chest */}
    <rect x="42" y="48" width="16" height="22" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" rx="1" />
    <text x="50" y="61" fontSize="7" fill="currentColor" textAnchor="middle" fontWeight="600">A4</text>
  </svg>
);

const SidePoseIllustration = () => (
  <svg viewBox="0 0 100 140" fill="none" className="w-full h-full">
    {/* Head (side view with nose) */}
    <circle cx="55" cy="20" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="67" y1="18" x2="72" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Body (side view - slightly curved forward) */}
    <path d="M 55 32 Q 58 50, 54 70" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* One arm visible from side */}
    <line x1="55" y1="42" x2="42" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Legs (side view - one in front) */}
    <line x1="54" y1="70" x2="48" y2="110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="54" y1="70" x2="51" y2="110" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
    {/* A4 Paper indicator at chest (side view - thin rectangle) */}
    <rect x="45" y="48" width="4" height="22" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" rx="0.5" />
  </svg>
);

export const OnboardingPhotoCapture = ({ onNext, onBack }: OnboardingPhotoCaptureProps) => {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);

  const frontCameraRef = useRef<HTMLInputElement>(null);
  const sideCameraRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: PhotoType, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'front') {
        setFrontPhoto(file);
        setFrontPreview(preview);
      } else {
        setSidePhoto(file);
        setSidePreview(preview);
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
      setSidePhoto(null);
      setSidePreview(null);
    }
  };

  const handleContinue = () => {
    if (frontPhoto && sidePhoto) {
      onNext({ front: frontPhoto, back: sidePhoto });
    }
  };

  const isComplete = frontPhoto && sidePhoto;

  const PhotoCard = ({
    type,
    preview,
    onClear,
    cameraRef,
    Illustration,
  }: {
    type: PhotoType;
    preview: string | null;
    onClear: () => void;
    cameraRef: React.RefObject<HTMLInputElement>;
    Illustration: React.ComponentType;
  }) => (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-full aspect-[3/4] rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
          preview
            ? 'border-primary bg-primary/5'
            : 'border-dashed border-primary/30 bg-card/30 cursor-pointer hover:border-primary/50 hover:bg-card/40'
        }`}
        onClick={() => !preview && cameraRef.current?.click()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={`${type} view`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Illustration at top */}
            <div className="w-20 h-28 text-primary/40 mb-2">
              <Illustration />
            </div>
            {/* Camera button */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] text-primary/70 font-medium">
              {type === 'front' ? 'Front View' : 'Side View'}
            </span>
          </div>
        )}
      </div>

      {/* Retake button when photo exists */}
      {preview && (
        <button
          onClick={onClear}
          className="mt-2 text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3 h-3" />
          retake
        </button>
      )}

      {/* Hidden camera input - only camera capture, no upload */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
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
          <p className="text-[9px] uppercase tracking-luxury text-primary mb-0.5">Step 2 of 3</p>
          <h2 className="font-display text-base text-foreground">Body Photos</h2>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Hold A4 paper at chest level</p>
        </div>
      </div>

      {/* Photo grid - centered */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <PhotoCard
            type="front"
            preview={frontPreview}
            onClear={() => clearPhoto('front')}
            cameraRef={frontCameraRef}
            Illustration={FrontPoseIllustration}
          />
          <PhotoCard
            type="side"
            preview={sidePreview}
            onClear={() => clearPhoto('side')}
            cameraRef={sideCameraRef}
            Illustration={SidePoseIllustration}
          />
        </div>
      </div>

      {/* Continue button */}
      <div className="flex-shrink-0 px-6 pb-6 pt-2">
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

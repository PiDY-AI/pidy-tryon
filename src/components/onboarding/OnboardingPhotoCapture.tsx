import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, ArrowLeft } from 'lucide-react';
import a4FrontDemo from '@/assets/A4_front_demo.jpg';
import a4SideDemo from '@/assets/A4_side_demo.jpg';
import bottleFrontDemo from '@/assets/bottle_front_demo.jpeg';
import bottleSideDemo from '@/assets/bottle_side_demo.jpeg';
import pidyTextLogo from '@/assets/pidy_full_text_white.png';
import { CameraCapture } from './CameraCapture';

interface OnboardingPhotoCaptureProps {
  onNext: (photos: { front: File; back: File }) => void;
  onBack: () => void;
}

type PhotoType = 'front' | 'side';
type ReferenceType = 'a4' | 'bottle';

export const OnboardingPhotoCapture = ({ onNext, onBack }: OnboardingPhotoCaptureProps) => {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [referenceType, setReferenceType] = useState<ReferenceType>('a4');
  const [activeCameraType, setActiveCameraType] = useState<PhotoType | null>(null);

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

  const clearPhoto = (type: PhotoType) => {
    if (type === 'front') {
      setFrontPhoto(null);
      setFrontPreview(null);
    } else {
      setSidePhoto(null);
      setSidePreview(null);
    }
  };

  const handleCameraCapture = (type: PhotoType, file: File) => {
    handleFileSelect(type, file);
    setActiveCameraType(null);
  };

  const openCamera = (type: PhotoType) => {
    setActiveCameraType(type);
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
    demoImage,
    onOpenCamera,
  }: {
    type: PhotoType;
    preview: string | null;
    onClear: () => void;
    demoImage: string;
    onOpenCamera: () => void;
  }) => (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-full aspect-[2/3] rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
          preview
            ? 'border-primary'
            : 'border-dashed border-border/50 cursor-pointer hover:border-primary/50'
        }`}
        onClick={() => !preview && onOpenCamera()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={`${type} view`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </>
        ) : (
          <>
            {/* Demo image as background - fill the container */}
            <img
              src={demoImage}
              alt={`${type} demo`}
              className="w-full h-full object-cover"
            />
            {/* Camera button positioned at bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="w-12 h-12 rounded-full bg-background/95 backdrop-blur-sm border-2 border-primary flex items-center justify-center shadow-xl">
                <Camera className="w-6 h-6 text-primary" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Retake button when photo exists */}
      {preview && (
        <button
          onClick={onClear}
          className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3 h-3" />
          retake
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-background">
      {/* PIDY Logo + Back button row */}
      <div className="flex-shrink-0 pt-3 px-4 flex items-center justify-between">
        <img src={pidyTextLogo} alt="PIDY" className="h-4 object-contain" />
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-2 pb-3">
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Step 2 of 3</p>
          <h2 className="font-display text-lg text-foreground mb-1">For <span className="text-primary">Precise</span> Body Measurement</h2>
        </div>

        {/* Reference type selector */}
        <div className="text-center mb-2">
          <p className="text-xs text-foreground mb-2">What do you have nearby?</p>
          <div className="inline-flex gap-2 bg-card/50 border border-border/60 rounded-full p-1.5 shadow-sm">
            <button
              onClick={() => setReferenceType('a4')}
              className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                referenceType === 'a4'
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                  : 'bg-card/30 text-muted-foreground/70 border-transparent hover:text-foreground hover:bg-card/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {referenceType === 'a4' && <Check className="w-3.5 h-3.5" />}
                A4 Sheet
              </span>
            </button>
            <button
              onClick={() => setReferenceType('bottle')}
              className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                referenceType === 'bottle'
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                  : 'bg-card/30 text-muted-foreground/70 border-transparent hover:text-foreground hover:bg-card/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {referenceType === 'bottle' && <Check className="w-3.5 h-3.5" />}
                1L Bisleri
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo grid - centered */}
      <div className="flex-1 flex items-center justify-center px-6 py-2">
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <PhotoCard
            type="front"
            preview={frontPreview}
            onClear={() => clearPhoto('front')}
            demoImage={referenceType === 'a4' ? a4FrontDemo : bottleFrontDemo}
            onOpenCamera={() => openCamera('front')}
          />
          <PhotoCard
            type="side"
            preview={sidePreview}
            onClear={() => clearPhoto('side')}
            demoImage={referenceType === 'a4' ? a4SideDemo : bottleSideDemo}
            onOpenCamera={() => openCamera('side')}
          />
        </div>
      </div>

      {/* Continue button */}
      <div className="flex-shrink-0 px-6 pb-6 pt-2">
        <div className="border border-border/40 rounded-lg p-3 bg-surface/30">
          <Button
            onClick={handleContinue}
            disabled={!isComplete}
            className="w-full"
            size="default"
          >
            CONTINUE
          </Button>
        </div>
      </div>

      {/* Camera capture modal */}
      {activeCameraType && (
        <CameraCapture
          photoType={activeCameraType}
          onCapture={(file) => handleCameraCapture(activeCameraType, file)}
          onClose={() => setActiveCameraType(null)}
        />
      )}
    </div>
  );
};

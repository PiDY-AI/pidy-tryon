import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, ArrowLeft } from 'lucide-react';
import a4FrontDemo from '@/assets/A4_front_demo.jpg';
import a4SideDemo from '@/assets/A4_side_demo.jpg';
import bottleFrontDemo from '@/assets/bottle_front_demo.jpeg';
import bottleSideDemo from '@/assets/bottle_side_demo.jpeg';

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
    demoImage,
  }: {
    type: PhotoType;
    preview: string | null;
    onClear: () => void;
    cameraRef: React.RefObject<HTMLInputElement>;
    demoImage: string;
  }) => (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-full aspect-[3/4] rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
          preview
            ? 'border-primary'
            : 'border-dashed border-border/50 cursor-pointer hover:border-primary/50'
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
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </>
        ) : (
          <>
            {/* Demo image as background */}
            <img
              src={demoImage}
              alt={`${type} demo`}
              className="w-full h-full object-cover"
            />
            {/* Camera button positioned at bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="w-14 h-14 rounded-full bg-background/95 backdrop-blur-sm border-2 border-primary flex items-center justify-center shadow-xl">
                <Camera className="w-7 h-7 text-primary" />
              </div>
            </div>
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20 pointer-events-none" />
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
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Step 2 of 3</p>
          <h2 className="font-display text-lg text-foreground mb-1">For <span className="text-primary">Precise</span> Body Measurement</h2>
        </div>

        {/* Reference type selector */}
        <div className="text-center mb-2">
          <p className="text-xs text-foreground mb-2">What do you have nearby?</p>
          <div className="inline-flex gap-2 bg-background border border-border/40 rounded-full p-1">
            <button
              onClick={() => setReferenceType('a4')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                referenceType === 'a4'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              A4 Sheet
            </button>
            <button
              onClick={() => setReferenceType('bottle')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                referenceType === 'bottle'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              1L Bisleri
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
            cameraRef={frontCameraRef}
            demoImage={referenceType === 'a4' ? a4FrontDemo : bottleFrontDemo}
          />
          <PhotoCard
            type="side"
            preview={sidePreview}
            onClear={() => clearPhoto('side')}
            cameraRef={sideCameraRef}
            demoImage={referenceType === 'a4' ? a4SideDemo : bottleSideDemo}
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
    </div>
  );
};

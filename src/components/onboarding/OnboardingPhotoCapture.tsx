import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, ArrowLeft, Upload, ChevronDown } from 'lucide-react';
import a4FrontDemo from '@/assets/A4_front_demo.jpg';
import a4SideDemo from '@/assets/A4_side_demo.jpg';
import bottleFrontDemo from '@/assets/bottle_front_demo.jpeg';
import bottleSideDemo from '@/assets/bottle_side_demo.jpeg';
import noteFrontDemo from '@/assets/note_front_demo.jpg';
import noteSideDemo from '@/assets/note_side_demo.jpg';
import pidyTextLogo from '@/assets/pidy_full_text_white.png';
import { CameraCapture } from './CameraCapture';

interface OnboardingPhotoCaptureProps {
  onNext: (photos: { front: File; back: File }) => void;
  onBack: () => void;
}

type PhotoType = 'front' | 'side';
type ReferenceType = 'a4' | 'bottle' | 'note_500' | 'note_200' | 'note_100';

const REFERENCE_OBJECTS: { key: ReferenceType; label: string; subtitle: string }[] = [
  { key: 'a4', label: 'A4 Sheet', subtitle: '29.7 x 21 cm' },
  { key: 'bottle', label: '1L Bisleri', subtitle: '28 cm tall' },
  { key: 'note_500', label: '₹500 Note', subtitle: '15.0 x 6.6 cm' },
  { key: 'note_200', label: '₹200 Note', subtitle: '14.6 x 6.6 cm' },
  { key: 'note_100', label: '₹100 Note', subtitle: '14.2 x 6.6 cm' },
];

const demoImages: Record<ReferenceType, { front: string; side: string }> = {
  a4: { front: a4FrontDemo, side: a4SideDemo },
  bottle: { front: bottleFrontDemo, side: bottleSideDemo },
  note_100: { front: noteFrontDemo, side: noteSideDemo },
  note_200: { front: noteFrontDemo, side: noteSideDemo },
  note_500: { front: noteFrontDemo, side: noteSideDemo },
};

export const OnboardingPhotoCapture = ({ onNext, onBack }: OnboardingPhotoCaptureProps) => {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [referenceType, setReferenceType] = useState<ReferenceType>('note_100');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeCameraType, setActiveCameraType] = useState<PhotoType | null>(null);
  const frontUploadRef = useRef<HTMLInputElement>(null);
  const sideUploadRef = useRef<HTMLInputElement>(null);

  const handleUploadChange = (type: PhotoType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(type, file);
    }
  };

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

  const handleReferenceChange = (key: ReferenceType) => {
    if (key !== referenceType) {
      setReferenceType(key);
      setFrontPhoto(null);
      setFrontPreview(null);
      setSidePhoto(null);
      setSidePreview(null);
    }
    setShowDropdown(false);
  };

  const isComplete = frontPhoto && sidePhoto;
  const selectedLabel = REFERENCE_OBJECTS.find(o => o.key === referenceType)?.label;

  const PhotoCard = ({
    type,
    preview,
    onClear,
    demoImage,
    onOpenCamera,
    onUpload,
  }: {
    type: PhotoType;
    preview: string | null;
    onClear: () => void;
    demoImage: string;
    onOpenCamera: () => void;
    onUpload: () => void;
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
            <img
              src={demoImage}
              alt={`${type} demo`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="w-12 h-12 rounded-full bg-background/95 backdrop-blur-sm border-2 border-primary flex items-center justify-center shadow-xl">
                <Camera className="w-6 h-6 text-primary" />
              </div>
            </div>
          </>
        )}
      </div>

      {preview ? (
        <button
          onClick={onClear}
          className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3 h-3" />
          retake
        </button>
      ) : (
        <button
          onClick={onUpload}
          className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <Upload className="w-3 h-3" />
          Upload
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
          <p className="text-xs text-muted-foreground">Place one of these next to you</p>
        </div>

        {/* Reference type dropdown */}
        <div className="relative flex justify-center mb-2" style={{ zIndex: 10 }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-[1.5px] border-primary bg-background text-primary font-semibold text-sm transition-all"
          >
            {selectedLabel}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 11 }}
                onClick={() => setShowDropdown(false)}
              />
              <div
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-48 bg-card border border-border rounded-xl overflow-hidden shadow-xl"
                style={{ zIndex: 12 }}
              >
                {REFERENCE_OBJECTS.map((obj) => {
                  const isSelected = referenceType === obj.key;
                  return (
                    <button
                      key={obj.key}
                      onClick={() => handleReferenceChange(obj.key)}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-left text-sm border-b border-border/50 last:border-0 transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                      }`}
                    >
                      <span className="flex-1">{obj.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Photo grid - scrollable */}
      <div className="flex-1 flex items-center justify-center px-6 py-2 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <PhotoCard
            type="front"
            preview={frontPreview}
            onClear={() => clearPhoto('front')}
            demoImage={demoImages[referenceType].front}
            onOpenCamera={() => openCamera('front')}
            onUpload={() => frontUploadRef.current?.click()}
          />
          <PhotoCard
            type="side"
            preview={sidePreview}
            onClear={() => clearPhoto('side')}
            demoImage={demoImages[referenceType].side}
            onOpenCamera={() => openCamera('side')}
            onUpload={() => sideUploadRef.current?.click()}
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

      {/* Hidden file inputs for upload */}
      <input
        ref={frontUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUploadChange('front', e)}
      />
      <input
        ref={sideUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUploadChange('side', e)}
      />

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

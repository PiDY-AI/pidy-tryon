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

const REFERENCE_OBJECTS: { key: ReferenceType; label: string }[] = [
  { key: 'a4', label: 'A4 Sheet' },
  { key: 'bottle', label: '1L Bisleri' },
  { key: 'note_500', label: '\u20B9500 Note' },
  { key: 'note_200', label: '\u20B9200 Note' },
  { key: 'note_100', label: '\u20B9100 Note' },
];

const demoImages: Record<ReferenceType, { front: string; side: string }> = {
  a4: { front: a4FrontDemo, side: a4SideDemo },
  bottle: { front: bottleFrontDemo, side: bottleSideDemo },
  note_100: { front: noteFrontDemo, side: noteSideDemo },
  note_200: { front: noteFrontDemo, side: noteSideDemo },
  note_500: { front: noteFrontDemo, side: noteSideDemo },
};

const TIPS = ['Good Lighting', 'Full Body Image', 'Summer Clothes'];

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
    if (file) handleFileSelect(type, file);
  };

  const handleFileSelect = (type: PhotoType, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'front') { setFrontPhoto(file); setFrontPreview(preview); }
      else { setSidePhoto(file); setSidePreview(preview); }
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = (type: PhotoType) => {
    if (type === 'front') { setFrontPhoto(null); setFrontPreview(null); }
    else { setSidePhoto(null); setSidePreview(null); }
  };

  const handleCameraCapture = (type: PhotoType, file: File) => {
    handleFileSelect(type, file);
    setActiveCameraType(null);
  };

  const handleContinue = () => {
    if (frontPhoto && sidePhoto) onNext({ front: frontPhoto, back: sidePhoto });
  };

  const handleReferenceChange = (key: ReferenceType) => {
    if (key !== referenceType) {
      setReferenceType(key);
      setFrontPhoto(null); setFrontPreview(null);
      setSidePhoto(null); setSidePreview(null);
    }
    setShowDropdown(false);
  };

  const isComplete = frontPhoto && sidePhoto;
  const selectedLabel = REFERENCE_OBJECTS.find(o => o.key === referenceType)?.label;

  const PhotoCard = ({ type, preview, demoImage, onOpenCamera, onUpload, onClear }: {
    type: PhotoType; preview: string | null; demoImage: string;
    onOpenCamera: () => void; onUpload: () => void; onClear: () => void;
  }) => (
    <div className="flex-1 flex flex-col items-center">
      <div
        className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-border bg-background cursor-pointer"
        onClick={() => preview ? onClear() : onOpenCamera()}
      >
        {preview ? (
          <img src={preview} alt={`${type} view`} className="w-full h-full object-cover" />
        ) : (
          <>
            <img src={demoImage} alt={`${type} demo`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-3">
              <div className="w-10 h-10 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
            </div>
          </>
        )}
      </div>
      <button
        onClick={onUpload}
        className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <Upload className="w-3 h-3" />
        Upload
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Logo + Back */}
      <div className="flex-shrink-0 pt-2 px-4 flex items-center justify-between">
        <img src={pidyTextLogo} alt="PIDY" className="h-4 object-contain" />
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-2 pb-2">
        {/* Header */}
        <div className="text-center mb-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Step 2 of 3</p>
          <h2 className="font-display text-sm text-foreground mb-0.5">For <span className="text-primary">Precise</span> Body Measurement</h2>
          <p className="text-[10px] text-muted-foreground">Place one of these next to you</p>
        </div>

        {/* Dropdown */}
        <div className="relative flex justify-center mb-3" style={{ zIndex: 10 }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-[1.5px] border-primary bg-background text-primary font-bold text-[13px]"
          >
            {selectedLabel}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0" style={{ zIndex: 11 }} onClick={() => setShowDropdown(false)} />
              <div className="absolute top-full mt-1 left-[10%] right-[10%] bg-card border border-border rounded-xl overflow-hidden shadow-xl" style={{ zIndex: 12 }}>
                {REFERENCE_OBJECTS.map((obj) => {
                  const isSelected = referenceType === obj.key;
                  return (
                    <button
                      key={obj.key}
                      onClick={() => handleReferenceChange(obj.key)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] border-b border-border/50 last:border-0 transition-colors ${
                        isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
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

        {/* Motivation + Tips */}
        <div className="text-center mb-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">
            A bit of effort — but just once. Then try clothes on any brand, <span className="text-primary font-bold">instantly</span>!
          </p>
          <div className="flex justify-center flex-wrap gap-1">
            {TIPS.map((tip) => (
              <span key={tip} className="text-[9px] font-semibold text-primary border border-primary rounded-full px-2 py-0.5">
                {tip}
              </span>
            ))}
          </div>
        </div>

        {/* Photo cards */}
        <div className="flex gap-2.5 mb-2">
          <PhotoCard
            type="front"
            preview={frontPreview}
            demoImage={demoImages[referenceType].front}
            onOpenCamera={() => setActiveCameraType('front')}
            onUpload={() => frontUploadRef.current?.click()}
            onClear={() => clearPhoto('front')}
          />
          <PhotoCard
            type="side"
            preview={sidePreview}
            demoImage={demoImages[referenceType].side}
            onOpenCamera={() => setActiveCameraType('side')}
            onUpload={() => sideUploadRef.current?.click()}
            onClear={() => clearPhoto('side')}
          />
        </div>
      </div>

      {/* Continue button - pinned */}
      <div className="flex-shrink-0 px-5 pb-4 pt-1">
        <Button onClick={handleContinue} disabled={!isComplete} className="w-full" size="default">
          Continue
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input ref={frontUploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadChange('front', e)} />
      <input ref={sideUploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadChange('side', e)} />

      {/* Camera modal */}
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

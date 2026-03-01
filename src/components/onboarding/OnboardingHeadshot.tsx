import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollPicker } from '@/components/ui/scroll-picker';
import { Camera, Check, RotateCcw, Upload } from 'lucide-react';
import pidyTextLogo from '@/assets/pidy_full_text_white.png';

interface OnboardingHeadshotProps {
  onNext: (data: {
    headshot: File;
    height: number;
    weight: number;
    age?: number;
  }) => void;
}

export const OnboardingHeadshot = ({ onNext }: OnboardingHeadshotProps) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Store height in cm internally, but display in feet/inches
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weight, setWeight] = useState<number | undefined>(70);
  const [age, setAge] = useState<number | string | undefined>(21);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Convert cm to feet and inches for display
  const heightDisplay = useMemo(() => {
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }, [heightCm]);

  // Convert slider value (100-250 cm range) to cm
  const handleHeightChange = (sliderValue: number) => {
    setHeightCm(sliderValue);
  };

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
    if (photo && heightCm && weight) {
      onNext({
        headshot: photo,
        height: heightCm, // Send height in cm to backend
        weight: weight as number,
        age: age !== '-' ? (age as number) : undefined,
      });
    }
  };

  const isComplete = photo && heightCm && weight;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background">
      {/* PIDY Logo */}
      <div className="flex-shrink-0 pt-2 px-4">
        <img src={pidyTextLogo} alt="PIDY" className="h-4 object-contain" />
      </div>

      {/* Header */}
      <div className="flex-shrink-0 text-center pt-1 px-6">
        <p className="text-[9px] uppercase tracking-luxury text-primary mb-0.5">Step 1 of 3</p>
        <h2 className="font-display text-sm text-foreground">Take a Selfie</h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-2 flex flex-col overflow-y-auto min-h-0">
        {/* Photo area */}
        <div className="flex flex-col items-center mb-2">
          <div
            className={`relative w-24 h-24 rounded-full border-2 transition-all duration-200 overflow-hidden ${
              preview
                ? 'border-primary bg-primary/5'
                : 'border-dashed border-primary/40 bg-card/30 cursor-pointer hover:border-primary/60 hover:bg-card/40 hover:scale-105'
            }`}
            onClick={() => !preview && cameraInputRef.current?.click()}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Headshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <Camera className="w-6 h-6 text-primary" />
                <span className="text-[9px] text-primary/80 font-medium">Tap to capture</span>
              </div>
            )}
          </div>

          {/* Photo actions */}
          {preview ? (
            <button
              onClick={() => {
                setPhoto(null);
                setPreview(null);
              }}
              className="mt-1 text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              retake
            </button>
          ) : (
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="mt-1.5 text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Upload className="w-2.5 h-2.5" />
              Upload
            </button>
          )}

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
        </div>

        {/* Measurements */}
        <div className="space-y-2.5 flex-1">
          {/* Height */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Height</span>
              <span className="text-sm font-medium text-foreground">{heightDisplay}</span>
            </div>
            <input
              type="range"
              min="100"
              max="250"
              value={heightCm}
              onChange={(e) => handleHeightChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-card/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between px-0.5">
              <span className="text-[8px] text-muted-foreground/60">4'0"</span>
              <span className="text-[8px] text-muted-foreground/60">5'6"</span>
              <span className="text-[8px] text-muted-foreground/60">7'0"</span>
              <span className="text-[8px] text-muted-foreground/60">8'2"</span>
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</span>
              <span className="text-sm font-medium text-foreground">{weight} <span className="text-[9px] text-muted-foreground">kg</span></span>
            </div>
            <input
              type="range"
              min="30"
              max="200"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value))}
              className="w-full h-1.5 bg-card/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          {/* Age */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Age</span>
              <span className="text-sm font-medium text-foreground">
                {age === '-' ? <span className="text-xs text-muted-foreground">Skip</span> : <>{age} <span className="text-[9px] text-muted-foreground">yrs</span></>}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="88"
              value={age === '-' ? 0 : (age as number) - 13}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setAge(val === 0 ? '-' : val + 13);
              }}
              className="w-full h-1.5 bg-card/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div className="flex-shrink-0 px-6 pb-4 pt-1">
        <Button
          onClick={handleContinue}
          disabled={!isComplete}
          className="w-full"
          size="default"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

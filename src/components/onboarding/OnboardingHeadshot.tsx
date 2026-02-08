import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollPicker } from '@/components/ui/scroll-picker';
import { Camera, Check, RotateCcw, Upload } from 'lucide-react';

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
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-3 px-6">
        <p className="text-[9px] uppercase tracking-luxury text-primary mb-0.5">Step 1 of 3</p>
        <h2 className="font-display text-sm text-foreground">Take a Selfie</h2>
      </div>

      {/* Content - compact */}
      <div className="flex-1 px-6 py-3 flex flex-col">
        {/* Photo area - PROMINENT and centered */}
        <div className="flex flex-col items-center mb-4">
          <div
            className={`relative w-32 h-32 rounded-full border-2 transition-all duration-200 overflow-hidden ${
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
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <Camera className="w-10 h-10 text-primary" />
                <span className="text-[10px] text-primary/80 font-medium">Tap to capture</span>
              </div>
            )}
          </div>

          {/* Photo actions - minimal */}
          {preview && (
            <button
              onClick={() => {
                setPhoto(null);
                setPreview(null);
              }}
              className="mt-2 text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              retake
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

        {/* Divider with "Then add your details" text */}
        {preview && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-border/30"></div>
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Then add details</span>
            <div className="flex-1 h-px bg-border/30"></div>
          </div>
        )}

        {/* Measurements - Visual representation */}
        <div className="py-2 space-y-3 flex-1">
          {/* Height - with ruler visual - displays in feet/inches */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-card/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Height</span>
              </div>
              <span className="text-base font-medium text-foreground">{heightDisplay}</span>
            </div>
            {/* Slider with markers */}
            <div className="relative">
              <input
                type="range"
                min="100"
                max="250"
                value={heightCm}
                onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                className="w-full h-2 bg-card/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
              {/* Height markers */}
              <div className="flex justify-between px-0.5 mt-1.5">
                <span className="text-[9px] text-muted-foreground font-medium">4'0"</span>
                <span className="text-[9px] text-muted-foreground font-medium">5'0"</span>
                <span className="text-[9px] text-muted-foreground font-medium">6'0"</span>
                <span className="text-[9px] text-muted-foreground font-medium">7'0"</span>
                <span className="text-[9px] text-muted-foreground font-medium">8'2"</span>
              </div>
            </div>
          </div>

          {/* Weight - with scale visual */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-card/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</span>
              </div>
              <span className="text-base font-medium text-foreground">{weight} <span className="text-[10px] text-muted-foreground">kg</span></span>
            </div>
            <input
              type="range"
              min="30"
              max="200"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value))}
              className="w-full h-2 bg-card/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          {/* Age - with calendar visual */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-card/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Age</span>
              </div>
              <span className="text-base font-medium text-foreground">
                {age === '-' ? <span className="text-xs text-muted-foreground">Skip</span> : <>{age} <span className="text-[10px] text-muted-foreground">yrs</span></>}
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
              className="w-full h-2 bg-card/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>
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
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

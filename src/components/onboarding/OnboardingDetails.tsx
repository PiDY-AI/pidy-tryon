import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { ScrollPicker } from '@/components/ui/scroll-picker';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import pidyTextLogo from '@/assets/pidy_full_text_white.png';

export type Gender = 'male' | 'female' | 'other';

interface OnboardingDetailsProps {
  onSubmit: (details: {
    name: string;
    height: number;
    weight: number;
    age?: number;
    email: string;
    gender?: Gender;
  }) => void;
  onBack: () => void;
  prefilledHeight?: number;
  prefilledWeight?: number;
  prefilledAge?: number;
}

export const OnboardingDetails = ({
  onSubmit,
  onBack,
  prefilledHeight,
  prefilledWeight,
  prefilledAge,
}: OnboardingDetailsProps) => {
  const [name, setName] = useState('');
  // Store height internally in cm, but display in feet/inches
  const [heightCm, setHeightCm] = useState<number | undefined>(prefilledHeight || 170);
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(7);
  const [weight, setWeight] = useState<number | undefined>(prefilledWeight || 70);
  const [age, setAge] = useState<number | undefined>(prefilledAge || 15);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Convert cm to feet/inches on mount if prefilled
  useMemo(() => {
    if (prefilledHeight) {
      const totalInches = prefilledHeight / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setHeightFeet(feet);
      setHeightInches(inches);
    }
  }, [prefilledHeight]);

  // Generate value ranges
  const feetValues = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => 4 + i), // 4-8 feet
    []
  );

  const inchesValues = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => i), // 0-11 inches
    []
  );

  const weightValues = useMemo(() =>
    Array.from({ length: 171 }, (_, i) => 30 + i), // 30-200 kg
    []
  );

  const ageValues = useMemo(() =>
    ['-', ...Array.from({ length: 88 }, (_, i) => 13 + i)], // Optional + 13-100
    []
  );

  // Update heightCm whenever feet or inches change
  const updateHeightCm = (feet: number, inches: number) => {
    const totalInches = feet * 12 + inches;
    const cm = Math.round(totalInches * 2.54);
    setHeightCm(cm);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!heightCm || heightCm < 100 || heightCm > 250) {
      newErrors.height = 'Select height';
    }
    if (!weight || weight < 30 || weight > 200) {
      newErrors.weight = 'Select weight';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        name: name.trim(),
        height: heightCm!, // Send height in cm to backend
        weight: weight!, // Already in kg
        age: typeof age === 'number' ? age : undefined,
        email,
        gender,
      });
    }
  };
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background">
      {/* PIDY Logo + Back button row */}
      <div className="flex-shrink-0 pt-3 px-4 flex items-center justify-between">
        <img src={pidyTextLogo} alt="PIDY" className="h-4 object-contain" />
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition-colors text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header - compact */}
      <div className="flex-shrink-0 px-6 pt-1 pb-2">
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-luxury text-primary mb-0.5">Step 3 of 3</p>
          <h2 className="font-display text-base text-foreground">Your Details</h2>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 overflow-y-auto">
        {/* Name input - compact */}
        <div className="space-y-1 mb-3">
          <Label
            htmlFor="name"
            className="text-[9px] uppercase tracking-wider text-muted-foreground/70"
          >
            Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="Enter your name"
            className={cn(
              "h-10 bg-transparent border-0 border-b border-border/50 rounded-none px-0 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:border-primary/50 transition-colors",
              errors.name && 'border-destructive/50'
            )}
          />
          {errors.name && (
            <p className="text-[9px] text-destructive/80">{errors.name}</p>
          )}
        </div>

        {/* Email input - compact */}
        <div className="space-y-1 mb-3">
          <Label
            htmlFor="email"
            className="text-[9px] uppercase tracking-wider text-muted-foreground/70"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="your@email.com"
            className={cn(
              "h-10 bg-transparent border-0 border-b border-border/50 rounded-none px-0 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:border-primary/50 transition-colors",
              errors.email && 'border-destructive/50'
            )}
          />
          {errors.email && (
            <p className="text-[9px] text-destructive/80">{errors.email}</p>
          )}
        </div>

        {/* Measurement scroll pickers - only show if not prefilled */}
        {!prefilledHeight && !prefilledWeight && (
          <div className="py-3 border-y border-border/20 mb-3">
            <div className="flex justify-center gap-6">
              {/* Height: Feet */}
              <ScrollPicker
                label="Feet"
                values={feetValues}
                value={heightFeet}
                onChange={(v) => {
                  const feet = v as number;
                  setHeightFeet(feet);
                  updateHeightCm(feet, heightInches);
                  if (errors.height) setErrors((prev) => ({ ...prev, height: '' }));
                }}
                unit="ft"
              />
              {/* Height: Inches */}
              <ScrollPicker
                label="Inches"
                values={inchesValues}
                value={heightInches}
                onChange={(v) => {
                  const inches = v as number;
                  setHeightInches(inches);
                  updateHeightCm(heightFeet, inches);
                  if (errors.height) setErrors((prev) => ({ ...prev, height: '' }));
                }}
                unit="in"
              />
              {/* Weight: kg */}
              <ScrollPicker
                label="Weight"
                values={weightValues}
                value={weight}
                onChange={(v) => {
                  setWeight(v as number);
                  if (errors.weight) setErrors((prev) => ({ ...prev, weight: '' }));
                }}
                unit="kg"
              />
              {/* Age */}
              <ScrollPicker
                label="Age"
                values={ageValues}
                value={age ?? '-'}
                onChange={(v) => setAge(v === '-' ? undefined : v as number)}
                unit="yrs"
              />
            </div>
            {(errors.height || errors.weight) && (
              <p className="text-[9px] text-destructive/80 text-center mt-2">
                {errors.height || errors.weight}
              </p>
            )}
          </div>
        )}

        {/* Gender - modern segmented control */}
        <div className="mb-3">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-2">
            Gender <span className="text-[8px] normal-case tracking-normal opacity-60">(optional)</span>
          </Label>
          <div className="flex gap-2 p-1 bg-card/30 rounded-lg border border-border/20">
            {(['male', 'female', 'other'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(gender === g ? undefined : g)}
                className={cn(
                  "flex-1 py-2 px-3 text-[10px] font-medium uppercase tracking-wide rounded-md transition-all duration-200",
                  gender === g
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                {g === 'male' && '♂'}
                {g === 'female' && '♀'}
                {g === 'other' && '⚥'}
                <span className="ml-1">{g.charAt(0).toUpperCase() + g.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex-shrink-0 pt-4 pb-6 mt-auto">
          <div className="border border-border/40 rounded-lg p-3 bg-surface/30">
            <Button
              type="submit"
              className="w-full"
              size="default"
            >
              Submit
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

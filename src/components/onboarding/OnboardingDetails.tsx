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
  const [height, setHeight] = useState<number | undefined>(prefilledHeight || 170);
  const [weight, setWeight] = useState<number | undefined>(prefilledWeight || 70);
  const [age, setAge] = useState<number | undefined>(prefilledAge || 15);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate value ranges
  const heightValues = useMemo(() => 
    Array.from({ length: 151 }, (_, i) => 100 + i), // 100-250 cm
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!height || height < 100 || height > 250) {
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
        height: height!,
        weight: weight!,
        age: typeof age === 'number' ? age : undefined,
        email,
        gender,
      });
    }
  };
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-secondary/30 to-background">
      {/* Header - compact */}
      <div className="flex-shrink-0 px-6 pt-3 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition-colors text-xs mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
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
            <div className="flex justify-center gap-8">
              <ScrollPicker
                label="Height"
                values={heightValues}
                value={height}
                onChange={(v) => {
                  setHeight(v as number);
                  if (errors.height) setErrors((prev) => ({ ...prev, height: '' }));
                }}
                unit="cm"
              />
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
          <Button
            type="submit"
            className="w-full h-11 rounded-none btn-luxury text-[11px]"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
};

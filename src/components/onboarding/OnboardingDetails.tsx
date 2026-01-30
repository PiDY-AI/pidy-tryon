import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, User } from 'lucide-react';
import { ScrollPicker } from '@/components/ui/scroll-picker';
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
}

export const OnboardingDetails = ({ onSubmit, onBack }: OnboardingDetailsProps) => {
  const [name, setName] = useState('');
  const [height, setHeight] = useState<number | undefined>(170);
  const [weight, setWeight] = useState<number | undefined>(70);
  const [age, setAge] = useState<number | undefined>(undefined);
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
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex-shrink-0 text-center px-6 pb-4">
        <h2 className="font-display text-lg text-foreground tracking-wide mb-1">
          Step 3 of 3
        </h2>
        <p className="text-xs text-muted-foreground">
          Enter your details
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 overflow-y-auto">
        <div className="space-y-4">
          {/* Name input */}
          <div className="space-y-1.5">
            <Label 
              htmlFor="name" 
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <span className="text-primary"><User className="w-4 h-4" /></span>
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              placeholder="John Doe"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-[10px] text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Measurement scroll pickers */}
          <div className="flex justify-center gap-6 py-4">
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
            <p className="text-[10px] text-destructive text-center">
              {errors.height || errors.weight}
            </p>
          )}

          {/* Gender selector */}
          <div className="space-y-1.5 pt-2">
            <Label 
              htmlFor="gender" 
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              Gender
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select value={gender} onValueChange={(value) => setGender(value as Gender)}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email input */}
          <div className="space-y-1.5 pt-2">
            <Label 
              htmlFor="email" 
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <span className="text-primary"><Mail className="w-4 h-4" /></span>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              placeholder="your@email.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-[10px] text-destructive">{errors.email}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              We'll send you a link to access your try-ons
            </p>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex-shrink-0 pt-6 pb-6 mt-auto">
          <Button 
            type="submit"
            className="w-full h-12 rounded-none btn-luxury"
            size="lg"
          >
            Create My Profile
          </Button>
        </div>
      </form>
    </div>
  );
};

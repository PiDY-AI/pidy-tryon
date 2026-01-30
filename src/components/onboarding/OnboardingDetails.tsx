import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Ruler, Scale, Calendar, Mail, User } from 'lucide-react';
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
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    const ageNum = age ? parseInt(age) : undefined;

    if (!height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      newErrors.height = 'Height must be 100-250 cm';
    }
    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
      newErrors.weight = 'Weight must be 30-200 kg';
    }
    if (age && (isNaN(ageNum!) || ageNum! < 13 || ageNum! > 120)) {
      newErrors.age = 'Age must be 13-120';
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
        height: parseFloat(height),
        weight: parseFloat(weight),
        age: age ? parseInt(age) : undefined,
        email,
        gender,
      });
    }
  };

  const inputFields = [
    {
      key: 'height',
      label: 'Height',
      icon: <Ruler className="w-4 h-4" />,
      unit: 'cm',
      value: height,
      onChange: setHeight,
      placeholder: '170',
      required: true,
    },
    {
      key: 'weight',
      label: 'Weight',
      icon: <Scale className="w-4 h-4" />,
      unit: 'kg',
      value: weight,
      onChange: setWeight,
      placeholder: '70',
      required: true,
    },
    {
      key: 'age',
      label: 'Age',
      icon: <Calendar className="w-4 h-4" />,
      unit: 'years',
      value: age,
      onChange: setAge,
      placeholder: 'Optional',
      required: false,
    },
  ];

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

          {/* Measurement inputs */}
          <div className="grid grid-cols-3 gap-3">
            {inputFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label 
                  htmlFor={field.key} 
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                >
                  <span className="text-primary">{field.icon}</span>
                  {field.label}
                  {!field.required && (
                    <span className="text-muted-foreground font-normal">(opt)</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id={field.key}
                    type="number"
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      if (errors[field.key]) {
                        setErrors((prev) => ({ ...prev, [field.key]: '' }));
                      }
                    }}
                    placeholder={field.placeholder}
                    className={`pr-8 text-sm ${errors[field.key] ? 'border-destructive' : ''}`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {field.unit}
                  </span>
                </div>
                {errors[field.key] && (
                  <p className="text-[10px] text-destructive">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>

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

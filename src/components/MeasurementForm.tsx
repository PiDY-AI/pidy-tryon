import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Measurements } from '@/types/measurements';
import { Ruler, Scale, User } from 'lucide-react';

interface MeasurementFormProps {
  initialValues?: Measurements | null;
  onSubmit: (measurements: Measurements) => void;
}

export const MeasurementForm = ({ initialValues, onSubmit }: MeasurementFormProps) => {
  const [formData, setFormData] = useState<Measurements>({
    height: initialValues?.height || 170,
    weight: initialValues?.weight || 70,
    chest: initialValues?.chest || 95,
    waist: initialValues?.waist || 80,
    hips: initialValues?.hips || 100,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Measurements, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Measurements, string>> = {};
    
    if (formData.height < 100 || formData.height > 250) {
      newErrors.height = 'Height must be between 100-250 cm';
    }
    if (formData.weight < 30 || formData.weight > 200) {
      newErrors.weight = 'Weight must be between 30-200 kg';
    }
    if (formData.chest < 50 || formData.chest > 180) {
      newErrors.chest = 'Chest must be between 50-180 cm';
    }
    if (formData.waist < 40 || formData.waist > 150) {
      newErrors.waist = 'Waist must be between 40-150 cm';
    }
    if (formData.hips < 50 || formData.hips > 180) {
      newErrors.hips = 'Hips must be between 50-180 cm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof Measurements, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const inputFields: { key: keyof Measurements; label: string; icon: React.ReactNode; unit: string }[] = [
    { key: 'height', label: 'Height', icon: <Ruler className="w-4 h-4" />, unit: 'cm' },
    { key: 'weight', label: 'Weight', icon: <Scale className="w-4 h-4" />, unit: 'kg' },
    { key: 'chest', label: 'Chest', icon: <User className="w-4 h-4" />, unit: 'cm' },
    { key: 'waist', label: 'Waist', icon: <User className="w-4 h-4" />, unit: 'cm' },
    { key: 'hips', label: 'Hips', icon: <User className="w-4 h-4" />, unit: 'cm' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4">
        {inputFields.map(({ key, label, icon, unit }, index) => (
          <div 
            key={key} 
            className="space-y-2 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Label htmlFor={key} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-primary">{icon}</span>
              {label}
            </Label>
            <div className="relative">
              <Input
                id={key}
                type="number"
                value={formData[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className={errors[key] ? 'border-destructive focus-visible:ring-destructive/50' : ''}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {unit}
              </span>
            </div>
            {errors[key] && (
              <p className="text-xs text-destructive">{errors[key]}</p>
            )}
          </div>
        ))}
      </div>
      <Button type="submit" className="w-full" size="lg">
        Save Measurements
      </Button>
    </form>
  );
};

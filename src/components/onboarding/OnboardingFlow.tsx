import { useState } from 'react';
import { OnboardingGuidelines } from './OnboardingGuidelines';
import { OnboardingPhotoCapture } from './OnboardingPhotoCapture';
import { OnboardingDetails } from './OnboardingDetails';
import { OnboardingProcessing } from './OnboardingProcessing';

type OnboardingStep = 'guidelines' | 'photos' | 'details' | 'processing';

interface OnboardingData {
  photos?: { front: File; back: File };
  details?: {
    height: number;
    weight: number;
    age?: number;
    email: string;
  };
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('guidelines');
  const [data, setData] = useState<OnboardingData>({});

  const handlePhotosComplete = (photos: { front: File; back: File }) => {
    setData((prev) => ({ ...prev, photos }));
    setStep('details');
  };

  const handleDetailsSubmit = (details: {
    height: number;
    weight: number;
    age?: number;
    email: string;
  }) => {
    setData((prev) => ({ ...prev, details }));
    setStep('processing');
  };

  const handleProcessingComplete = () => {
    onComplete(data);
  };

  return (
    <div className="h-full">
      {step === 'guidelines' && (
        <OnboardingGuidelines onNext={() => setStep('photos')} />
      )}
      {step === 'photos' && (
        <OnboardingPhotoCapture
          onNext={handlePhotosComplete}
          onBack={() => setStep('guidelines')}
        />
      )}
      {step === 'details' && (
        <OnboardingDetails
          onSubmit={handleDetailsSubmit}
          onBack={() => setStep('photos')}
        />
      )}
      {step === 'processing' && (
        <OnboardingProcessing onComplete={handleProcessingComplete} />
      )}
    </div>
  );
};

export type { OnboardingData };

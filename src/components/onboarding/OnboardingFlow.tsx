import { useState } from 'react';
import { OnboardingHeadshot } from './OnboardingHeadshot';
import { OnboardingPhotoCapture } from './OnboardingPhotoCapture';
import { OnboardingDetails } from './OnboardingDetails';
import { OnboardingProcessing } from './OnboardingProcessing';

type OnboardingStep = 'headshot' | 'photos' | 'details' | 'processing';

interface OnboardingData {
  headshot?: File;
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
  const [step, setStep] = useState<OnboardingStep>('headshot');
  const [data, setData] = useState<OnboardingData>({});

  const handleHeadshotComplete = (headshot: File) => {
    setData((prev) => ({ ...prev, headshot }));
    setStep('photos');
  };

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
      {step === 'headshot' && (
        <OnboardingHeadshot onNext={handleHeadshotComplete} />
      )}
      {step === 'photos' && (
        <OnboardingPhotoCapture
          onNext={handlePhotosComplete}
          onBack={() => setStep('headshot')}
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

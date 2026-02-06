import { useState } from 'react';
import { OnboardingHeadshot } from './OnboardingHeadshot';
import { OnboardingPhotoCapture } from './OnboardingPhotoCapture';
import { OnboardingDetails, Gender } from './OnboardingDetails';
import { OnboardingProcessing } from './OnboardingProcessing';
import type { WidgetScanResult } from './OnboardingProcessing';

type OnboardingStep = 'headshot' | 'photos' | 'details' | 'processing';

export interface OnboardingData {
  headshot?: File;
  photos?: { front: File; back: File };
  details?: {
    name: string;
    height: number;
    weight: number;
    age?: number;
    email: string;
    gender?: Gender;
  };
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData, result?: WidgetScanResult) => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('headshot');
  const [data, setData] = useState<OnboardingData>({});

  const handleHeadshotComplete = (headshotData: {
    headshot: File;
    height: number;
    weight: number;
    age?: number;
  }) => {
    setData((prev) => ({
      ...prev,
      headshot: headshotData.headshot,
      details: {
        ...prev.details,
        height: headshotData.height,
        weight: headshotData.weight,
        age: headshotData.age,
        name: prev.details?.name || '',
        email: prev.details?.email || '',
        gender: prev.details?.gender,
      },
    }));
    setStep('photos');
  };

  const handlePhotosComplete = (photos: { front: File; back: File }) => {
    setData((prev) => ({ ...prev, photos }));
    setStep('details');
  };

  const handleDetailsSubmit = (details: {
    name: string;
    height: number;
    weight: number;
    age?: number;
    email: string;
    gender?: Gender;
  }) => {
    setData((prev) => ({
      ...prev,
      details: {
        ...details,
        // Keep measurements from step 1, but allow override if changed in step 3
        height: prev.details?.height || details.height,
        weight: prev.details?.weight || details.weight,
        age: prev.details?.age !== undefined ? prev.details.age : details.age,
      },
    }));
    setStep('processing');
  };

  const handleProcessingComplete = (result?: WidgetScanResult) => {
    onComplete(data, result);
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
          prefilledHeight={data.details?.height}
          prefilledWeight={data.details?.weight}
          prefilledAge={data.details?.age}
        />
      )}
      {step === 'processing' && (
        <OnboardingProcessing onComplete={handleProcessingComplete} data={data} />
      )}
    </div>
  );
};

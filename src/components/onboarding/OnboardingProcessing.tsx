import { useEffect, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import pidyLogo from '@/assets/pidy-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from './OnboardingFlow';

interface OnboardingProcessingProps {
  onComplete: (result?: WidgetScanResult) => void;
  data: OnboardingData;
}

export interface WidgetScanResult {
  success: boolean;
  user_id?: string;
  scan_id?: string;
  is_new_user?: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  measurements?: Array<{
    name: string;
    value: number | null;
    range: number | null;
    confidence: number | null;
    unit: string;
    notes: string;
  }>;
  body_type?: string;
  overall_confidence?: number;
  pre_analysis_summary?: string;
  post_analysis_notes?: string;
  analyzed_at?: string;
  error?: {
    code: string;
    message: string;
    step: string;
  };
}

const SUPABASE_URL = "https://owipkfsjnmydsjhbfjqu.supabase.co";

const steps = [
  { label: 'Uploading photos', duration: 3000 },
  { label: 'Analyzing body scan', duration: 8000 },
  { label: 'Calculating measurements', duration: 4000 },
  { label: 'Creating your profile', duration: 2000 },
];

export const OnboardingProcessing = ({ onComplete, data }: OnboardingProcessingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiComplete, setApiComplete] = useState(false);
  const [result, setResult] = useState<WidgetScanResult | null>(null);

  const uploadImage = useCallback(async (file: File, submissionId: string, type: string): Promise<string> => {
    const path = `${submissionId}/${type}.jpg`;
    
    const { error } = await supabase.storage
      .from('widget-uploads')
      // NOTE: Keep upsert=false so we only need INSERT permission on storage.objects.
      // (Upsert may require UPDATE and can trigger RLS failures in public/anon flows.)
      .upload(path, file, { contentType: 'image/jpeg', upsert: false });

    if (error) throw new Error(`Failed to upload ${type}: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from('widget-uploads')
      .getPublicUrl(path);

    return urlData.publicUrl;
  }, []);

  const processOnboarding = useCallback(async () => {
    if (!data.headshot || !data.photos || !data.details) {
      setError('Missing required data');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Generate unique submission ID
      const submissionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('Starting image upload to widget-uploads bucket...');
      
      // Step 1: Upload all 3 images
      let frontUrl: string, backUrl: string, headshotUrl: string;
      try {
        [frontUrl, backUrl, headshotUrl] = await Promise.all([
          uploadImage(data.photos.front, submissionId, 'front'),
          uploadImage(data.photos.back, submissionId, 'back'),
          uploadImage(data.headshot, submissionId, 'headshot'),
        ]);
        console.log('Images uploaded successfully:', { frontUrl, backUrl, headshotUrl });
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
        throw new Error(`Image upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}. Make sure the "widget-uploads" bucket exists and is public.`);
      }

      setCurrentStep(1);

      // Step 2: Call widget-scan API
      console.log('Calling widget-scan API...');
      const response = await fetch(`${SUPABASE_URL}/functions/v1/widget-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.details.name,
          email: data.details.email,
          images: [frontUrl, headshotUrl, backUrl], // front, "side" (headshot), back
          height: data.details.height,
          height_unit: 'cm',
          weight: data.details.weight,
          weight_unit: 'kg',
          age: data.details.age,
          gender: data.details.gender,
          model: 'sonnet',
        }),
      });

      console.log('API response status:', response.status);
      const scanResult: WidgetScanResult = await response.json();
      console.log('[OnboardingProcessing] widget-scan response:', {
        success: scanResult.success,
        user_id: scanResult.user_id,
        scan_id: scanResult.scan_id,
        is_new_user: scanResult.is_new_user,
        token_received: !!scanResult.access_token && !!scanResult.refresh_token,
        expires_in: scanResult.expires_in,
        token_type: scanResult.token_type,
      });

      if (!scanResult.success) {
        throw new Error(scanResult.error?.message || `API error: ${scanResult.error?.code || 'Unknown'}`);
      }

      // Set the Supabase session if tokens are returned
      if (scanResult.access_token && scanResult.refresh_token) {
        console.log('[OnboardingProcessing] Setting session from widget-scan tokens...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: scanResult.access_token,
          refresh_token: scanResult.refresh_token,
        });
        if (sessionError) {
          console.error('Failed to set session:', sessionError);
          // Don't throw - user can still use magic link
        } else {
          console.log('[OnboardingProcessing] Session set successfully');
        }
      } else {
        console.log('[OnboardingProcessing] No tokens returned from widget-scan');
      }

      setResult(scanResult);
      setApiComplete(true);
      setCurrentStep(3);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [data, uploadImage]);

  // Start processing on mount
  useEffect(() => {
    processOnboarding();
  }, [processOnboarding]);

  // Progress animation
  useEffect(() => {
    if (error) return;

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      
      // If API is complete, fast-forward to end
      if (apiComplete) {
        setProgress(100);
        setCurrentStep(steps.length);
        clearInterval(interval);
        setTimeout(() => onComplete(result || undefined), 500);
        return;
      }

      // Otherwise animate based on time
      const targetProgress = Math.min((elapsed / totalDuration) * 90, 90); // Cap at 90% until API completes
      setProgress(targetProgress);

      // Update step based on elapsed time
      let stepElapsed = 0;
      for (let i = 0; i < steps.length - 1; i++) {
        stepElapsed += steps[i].duration;
        if (elapsed < stepElapsed) {
          setCurrentStep(i);
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [apiComplete, error, onComplete, result]);

  const isComplete = currentStep >= steps.length && apiComplete;

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="font-display text-xl text-foreground tracking-wide mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          {error}
        </p>
        <Button onClick={processOnboarding} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-6">
      {/* Animated logo */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-20" />
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-glow-subtle" />
        <div className="absolute inset-2 rounded-full bg-background border border-primary/30 flex items-center justify-center">
          <img 
            src={pidyLogo} 
            alt="PIDY" 
            className={`w-12 h-12 object-contain transition-transform duration-500 ${
              isComplete ? 'scale-110' : 'animate-pulse'
            }`} 
          />
        </div>
        {isComplete && (
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-scale-in">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center mb-8">
        <h2 className="font-display text-xl text-foreground tracking-wide mb-2">
          {isComplete ? "You're all set!" : 'Analyzing your body scan'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isComplete 
            ? 'Your private fitting room is ready'
            : 'This may take a moment...'
          }
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-6">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step indicators */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep && !isComplete;
          const isDone = index < currentStep || isComplete;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isDone ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary/20 border border-primary text-primary'
                    : 'bg-card border border-border text-muted-foreground'
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isActive ? (
                  <Sparkles className="w-3 h-3 animate-pulse" />
                ) : (
                  <span className="text-[10px]">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  isDone || isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Results summary */}
      {isComplete && result && (
        <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20 text-center animate-fade-in w-full max-w-xs">
          {result.body_type && (
            <p className="text-sm text-foreground mb-1">
              Body type: <span className="font-medium capitalize">{result.body_type}</span>
            </p>
          )}
          {result.overall_confidence !== undefined && (
            <p className="text-xs text-muted-foreground">
              Confidence: {Math.round(result.overall_confidence * 100)}%
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            Check your email for a link to access your measurements
          </p>
        </div>
      )}
    </div>
  );
};

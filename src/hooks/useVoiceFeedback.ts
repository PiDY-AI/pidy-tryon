import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubmitOptions {
  productId?: string;
  tryOnCount: number;
  widgetMode: 'embed' | 'standalone';
  accessTokenOverride?: string;
}

interface UseVoiceFeedbackReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  submitFeedback: (options: SubmitOptions) => Promise<void>;
  isRecording: boolean;
  recordingDuration: number;
  isSubmitting: boolean;
  isComplete: boolean;
  error: string | null;
  transcript: string | null;
  reset: () => void;
}

const MAX_DURATION = 60;

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

export const useVoiceFeedback = (): UseVoiceFeedbackReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      audioBlobRef.current = null;
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        audioBlobRef.current = blob;
      };

      recorder.start(1000); // Collect chunks every second
      setIsRecording(true);

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            // Auto-stop at max duration
            recorder.stop();
            stream.getTracks().forEach((t) => t.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to access microphone';
      if (message.includes('NotAllowed') || message.includes('Permission')) {
        setError('Microphone access denied. Please allow microphone permission.');
      } else {
        setError(message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    chunksRef.current = [];
    audioBlobRef.current = null;
    setRecordingDuration(0);
  }, [stopRecording]);

  const submitFeedback = useCallback(
    async (options: SubmitOptions) => {
      const blob = audioBlobRef.current;
      if (!blob || blob.size === 0) {
        setError('No audio recorded');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        // Get auth token
        let accessToken = options.accessTokenOverride;
        if (!accessToken) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          accessToken = session?.access_token;
        }

        if (!accessToken) {
          throw new Error('Not authenticated. Please sign in.');
        }

        // Convert blob to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Strip "data:audio/...;base64," prefix
            const base64Data = dataUrl.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Send to edge function
        const functionsUrl = `${
          (supabase as any).functionsUrl ||
          'https://owipkfsjnmydsjhbfjqu.supabase.co/functions/v1'
        }`;

        const response = await fetch(`${functionsUrl}/voice-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            audio: base64,
            mimeType: mimeTypeRef.current,
            durationSeconds: recordingDuration,
            productId: options.productId,
            tryOnCount: options.tryOnCount,
            widgetMode: options.widgetMode,
          }),
        });

        const data = await response.json();

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.error?.message || 'Failed to submit voice feedback'
          );
        }

        setTranscript(data.transcript || null);
        setIsComplete(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to submit feedback';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [recordingDuration]
  );

  const reset = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
    setIsSubmitting(false);
    setIsComplete(false);
    setError(null);
    setTranscript(null);
    chunksRef.current = [];
    audioBlobRef.current = null;
  }, []);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    submitFeedback,
    isRecording,
    recordingDuration,
    isSubmitting,
    isComplete,
    error,
    transcript,
    reset,
  };
};

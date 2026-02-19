import { useEffect } from 'react';
import { Mic, Square, Loader2, Check, X } from 'lucide-react';
import { useVoiceFeedback } from '@/hooks/useVoiceFeedback';

interface VoiceFeedbackPromptProps {
  productId?: string;
  tryOnCount: number;
  widgetMode: 'embed' | 'standalone';
  accessTokenOverride?: string;
  onComplete?: () => void;
  onDismiss?: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceFeedbackPrompt({
  productId,
  tryOnCount,
  widgetMode,
  accessTokenOverride,
  onComplete,
  onDismiss,
}: VoiceFeedbackPromptProps) {
  const {
    startRecording,
    stopRecording,
    cancelRecording,
    submitFeedback,
    isRecording,
    recordingDuration,
    isSubmitting,
    isComplete,
    error,
    reset,
  } = useVoiceFeedback();

  // Auto-submit after recording stops (when we have duration > 0 and not recording)
  const handleStop = () => {
    stopRecording();
    // Small delay to let MediaRecorder finalize the blob
    setTimeout(() => {
      submitFeedback({ productId, tryOnCount, widgetMode, accessTokenOverride });
    }, 300);
  };

  // Auto-dismiss after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  const handleDismiss = () => {
    cancelRecording();
    reset();
    onDismiss?.();
  };

  // Complete state
  if (isComplete) {
    return (
      <div className="mb-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-foreground">Thanks for your feedback!</p>
        </div>
      </div>
    );
  }

  // Submitting state
  if (isSubmitting) {
    return (
      <div className="mb-3 p-3 rounded-lg border border-border/40 bg-secondary/20">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          <p className="text-xs text-muted-foreground">Transcribing...</p>
        </div>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="mb-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
              <Mic className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-foreground">Recording...</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {formatDuration(recordingDuration)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors flex items-center gap-1.5"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prompt state (initial)
  return (
    <div className="mb-3 p-3 rounded-lg border border-primary/20 bg-background/95 backdrop-blur-sm shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-foreground">How does it look?</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={startRecording}
            className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Mic className="w-3 h-3" />
            Record
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-red-500">{error}</p>
          <button
            onClick={() => {
              reset();
              startRecording();
            }}
            className="text-[10px] text-primary underline"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

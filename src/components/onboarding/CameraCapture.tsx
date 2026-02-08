import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Check, Timer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  photoType: 'front' | 'side';
}

type TimerOption = 3 | 5 | 10;

export const CameraCapture = ({ onCapture, onClose, photoType }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedTimer, setSelectedTimer] = useState<TimerOption>(3);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('user');

  const timerOptions: TimerOption[] = [3, 5, 10];

  // Initialize camera
  const initCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsLoading(true);
      setError(null);

      // Request camera with specified facing mode and attempt 1x zoom
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try to set zoom to 1x if supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();

      if (capabilities && 'zoom' in capabilities) {
        const minZoom = (capabilities as any).zoom?.min || 1;

        try {
          await track.applyConstraints({
            advanced: [{ zoom: minZoom } as any]
          });
          console.log('[Camera] Zoom set to minimum:', minZoom);
        } catch (zoomError) {
          console.log('[Camera] Could not set zoom:', zoomError);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('[Camera] Error accessing camera:', err);
      setError('Could not access camera. Please ensure camera permissions are granted.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initCamera(facingMode);

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const flipCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    await initCamera(newFacingMode);
  }, [facingMode, initCamera]);

  // Handle countdown
  useEffect(() => {
    if (countdown === null || countdown < 0) return;

    if (countdown === 0) {
      capturePhoto();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const startCountdown = useCallback(() => {
    setIsCountingDown(true);
    setCountdown(selectedTimer);
  }, [selectedTimer]);

  const cancelCountdown = useCallback(() => {
    setIsCountingDown(false);
    setCountdown(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    setIsCountingDown(false);
    setCountdown(null);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const retakePhoto = useCallback(async () => {
    setCapturedImage(null);
    await initCamera(facingMode);
  }, [facingMode, initCamera]);

  const confirmPhoto = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    // Convert data URL to File
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${photoType}-photo.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  }, [capturedImage, photoType, onCapture]);

  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="text-white text-sm font-medium uppercase tracking-wider">
          {photoType === 'front' ? 'Front View' : 'Side View'}
        </div>
        <div className="w-10" />
      </div>

      {/* Camera view / Captured image */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center">
              <Camera className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/80 text-sm">{error}</p>
              <Button
                onClick={handleClose}
                variant="outline"
                className="mt-4 border-white/30 text-white hover:bg-white/10"
              >
                Go Back
              </Button>
            </div>
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}


            {/* Countdown overlay */}
            {isCountingDown && countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="text-center">
                  <div className="text-9xl font-bold text-white animate-pulse">
                    {countdown}
                  </div>
                  <button
                    onClick={cancelCountdown}
                    className="mt-8 px-6 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/70 to-transparent">
        {capturedImage ? (
          /* Review controls */
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={retakePhoto}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Retake</span>
            </button>
            <button
              onClick={confirmPhoto}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-white text-xs">Use Photo</span>
            </button>
          </div>
        ) : !isCountingDown ? (
          /* Capture controls */
          <div className="space-y-4">
            {/* Timer selection */}
            <div className="flex items-center justify-center gap-3">
              <Timer className="w-4 h-4 text-white/60" />
              {timerOptions.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTimer(time)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedTimer === time
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {time}s
                </button>
              ))}
            </div>

            {/* Capture button with flip camera */}
            <div className="flex justify-center items-center gap-6">
              <div className="w-14 h-14" />
              <button
                onClick={startCountdown}
                disabled={isLoading}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full bg-white" />
              </button>
              <button
                onClick={flipCamera}
                disabled={isLoading}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center disabled:opacity-50"
              >
                <RefreshCw className="w-6 h-6 text-white" />
              </button>
            </div>

            <p className="text-center text-white/60 text-xs">
              Tap to start {selectedTimer}s timer
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

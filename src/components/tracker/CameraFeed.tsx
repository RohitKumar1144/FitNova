import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, CameraOff, Loader2, Pause, SwitchCamera } from 'lucide-react'
import {
  initializePoseDetector,
  detectPoseForVideo,
  type NormalizedLandmark,
} from '../../lib/mediapipe/poseDetector'
import PoseOverlay from './PoseOverlay'

interface CameraFeedProps {
  onLandmarksDetected?: (landmarks: NormalizedLandmark[], timestampMs: number) => void
  onTrackingChange?: (isTracking: boolean) => void
  showOverlay?: boolean
  isPaused?: boolean
  className?: string
}

export default function CameraFeed({
  onLandmarksDetected,
  onTrackingChange,
  showOverlay = true,
  isPaused = false,
  className = '',
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  })
  const [currentLandmarks, setCurrentLandmarks] = useState<NormalizedLandmark[] | null>(null)

  const [isModelLoading, setIsModelLoading] = useState(true)
  const [isCameraStarting, setIsCameraStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cleanly stop any active media tracks
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // 1. Initialize camera stream with facingMode support and graceful fallback
  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      setIsCameraStarting(true)
      setError(null)
      stopCurrentStream()

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.')
        }

        let mediaStream: MediaStream
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { ideal: mode },
            },
            audio: false,
          })
        } catch (modeErr) {
          // Graceful fallback: If rear camera is unavailable, fallback to front camera
          if (mode === 'environment') {
            console.warn('Rear camera not available, falling back to front camera:', modeErr)
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
              },
              audio: false,
            })
            setFacingMode('user')
          } else {
            throw modeErr
          }
        }

        streamRef.current = mediaStream
        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(() => {})
        }
      } catch (err: unknown) {
        console.error('Camera initialization error:', err)
        const errMsg =
          err instanceof Error
            ? err.message
            : 'Unable to access camera. Please check camera permissions.'
        setError(errMsg)
      } finally {
        setIsCameraStarting(false)
        setIsSwitchingCamera(false)
      }
    },
    [stopCurrentStream],
  )

  useEffect(() => {
    startCamera('user')

    return () => {
      stopCurrentStream()
    }
  }, [startCamera, stopCurrentStream])

  // Toggle front/rear camera
  const toggleFacingMode = useCallback(() => {
    if (isSwitchingCamera || isCameraStarting) return
    setIsSwitchingCamera(true)
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }, [facingMode, isSwitchingCamera, isCameraStarting, startCamera])

  // 2. Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let isMounted = true

    async function setupDetector() {
      setIsModelLoading(true)
      try {
        await initializePoseDetector()
      } catch (err) {
        console.error('Pose detector load failure:', err)
        if (isMounted) {
          setError('Failed to initialize pose detection engine.')
        }
      } finally {
        if (isMounted) {
          setIsModelLoading(false)
        }
      }
    }

    setupDetector()

    return () => {
      isMounted = false
    }
  }, [])

  // 3. Real-time frame detection loop
  const diagCountRef = useRef(0)
  const processFrame = useCallback(() => {
    const video = videoRef.current
    if (video && video.readyState >= 2) {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setDimensions((prev) =>
          prev.width === video.videoWidth && prev.height === video.videoHeight
            ? prev
            : { width: video.videoWidth, height: video.videoHeight }
        )
      }

      const now = performance.now()
      const result = detectPoseForVideo(video, now)

      // Throttled diagnostic logging (roughly once per second at 60fps)
      diagCountRef.current += 1
      if (diagCountRef.current % 60 === 0) {
        const hasLandmarks = result && result.landmarks && result.landmarks.length > 0
        if (hasLandmarks) {
          const lm = result!.landmarks[0]
          console.log(
            `[FitNova] Pose detected | landmarks: ${lm.length} | ` +
            `L_hip vis: ${lm[23]?.visibility?.toFixed(2)} | ` +
            `L_knee vis: ${lm[25]?.visibility?.toFixed(2)} | ` +
            `L_ankle vis: ${lm[27]?.visibility?.toFixed(2)}`
          )
        } else {
          console.log(
            `[FitNova] No pose detected | video ready: ${video.readyState >= 2} | ` +
            `result: ${result ? 'empty' : 'null'}`
          )
        }
      }

      if (result && result.landmarks && result.landmarks.length > 0) {
        const detected = result.landmarks[0]
        setCurrentLandmarks(detected)
        if (onTrackingChange) {
          onTrackingChange(true)
        }
        if (!isPaused && onLandmarksDetected) {
          onLandmarksDetected(detected, now)
        }
      } else {
        setCurrentLandmarks(null)
        if (onTrackingChange) {
          onTrackingChange(false)
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(processFrame)
  }, [onLandmarksDetected, onTrackingChange, isPaused])

  useEffect(() => {
    if (!isModelLoading && !isCameraStarting && stream) {
      animationFrameIdRef.current = requestAnimationFrame(processFrame)
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [isModelLoading, isCameraStarting, stream, processFrame])

  // Update canvas overlay dimensions when video metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current
      if (videoWidth && videoHeight) {
        setDimensions({ width: videoWidth, height: videoHeight })
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center ${className}`}
      style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
    >
      {/* Active Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={handleLoadedMetadata}
        onPlay={handleLoadedMetadata}
        className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
      />

      {/* Canvas Overlay for Pose Landmarks & Skeleton */}
      {showOverlay && (
        <div className="absolute inset-0 pointer-events-none">
          <PoseOverlay
            landmarks={currentLandmarks}
            videoWidth={dimensions.width}
            videoHeight={dimensions.height}
            isMirrored={facingMode === 'user'}
          />
        </div>
      )}

      {/* Loading Overlay */}
      {(isCameraStarting || isModelLoading) && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-sm font-semibold text-white">
            {isCameraStarting ? 'Requesting camera access...' : 'Initializing MediaPipe AI model...'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Running secure on-device vision in your browser.
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <CameraOff className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Camera Feed Unavailable</h4>
          <p className="text-xs text-rose-300 max-w-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Camera className="w-3.5 h-3.5" />
            Retry Camera Access
          </button>
        </div>
      )}

      {/* Paused Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20 pointer-events-none">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 flex items-center gap-2 text-amber-400 shadow-2xl">
            <Pause className="w-5 h-5 fill-amber-400/20" />
            <span className="text-xs font-bold uppercase tracking-wider">Workout Paused</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 font-medium">Rep counting is paused. Resume when ready.</p>
        </div>
      )}

      {/* Tracking Indicator Badge */}
      {!isCameraStarting && !isModelLoading && !error && (
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 z-10 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPaused
                  ? 'bg-amber-400'
                  : currentLandmarks
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isPaused ? 'bg-amber-500' : currentLandmarks ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            {isPaused
              ? 'PAUSED'
              : currentLandmarks
              ? 'POSE DETECTED'
              : 'SEARCHING FOR POSE'}
          </span>
        </div>
      )}

      {/* Camera Flip Button (Front / Rear) */}
      {!isCameraStarting && !isModelLoading && !error && (
        <button
          type="button"
          onClick={toggleFacingMode}
          disabled={isSwitchingCamera}
          aria-label={`Switch to ${facingMode === 'user' ? 'rear' : 'front'} camera`}
          className="absolute top-3 right-3 bg-slate-950/85 hover:bg-slate-900 border border-slate-800 active:scale-95 transition-all duration-150 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 z-10 shadow-lg text-slate-200 hover:text-white cursor-pointer disabled:opacity-50"
          title={`Switch to ${facingMode === 'user' ? 'rear' : 'front'} camera`}
        >
          <SwitchCamera className={`w-4 h-4 text-cyan-400 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold select-none">
            {facingMode === 'user' ? 'Rear Cam' : 'Front Cam'}
          </span>
        </button>
      )}
    </div>
  )
}
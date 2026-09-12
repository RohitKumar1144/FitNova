import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import {
  initializePoseDetector,
  detectPoseForVideo,
  type NormalizedLandmark,
} from '../../lib/mediapipe/poseDetector'
import PoseOverlay from './PoseOverlay'

interface CameraFeedProps {
  onLandmarksDetected?: (landmarks: NormalizedLandmark[], timestampMs: number) => void
  showOverlay?: boolean
  className?: string
}

export default function CameraFeed({
  onLandmarksDetected,
  showOverlay = true,
  className = '',
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  })
  const [currentLandmarks, setCurrentLandmarks] = useState<NormalizedLandmark[] | null>(null)

  const [isModelLoading, setIsModelLoading] = useState(true)
  const [isCameraStarting, setIsCameraStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Initialize camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function startCamera() {
      setIsCameraStarting(true)
      setError(null)

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.')
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        })

        activeStream = mediaStream
        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
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
      }
    }

    startCamera()

    return () => {
      // Clean up media tracks when unmounting
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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
        if (onLandmarksDetected) {
          onLandmarksDetected(detected, now)
        }
      } else {
        setCurrentLandmarks(null)
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(processFrame)
  }, [onLandmarksDetected])

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
        className="w-full h-full object-cover transform -scale-x-100"
      />

      {/* Canvas Overlay for Pose Landmarks & Skeleton */}
      {showOverlay && (
        <div className="absolute inset-0 transform -scale-x-100 pointer-events-none">
          <PoseOverlay
            landmarks={currentLandmarks}
            width={dimensions.width}
            height={dimensions.height}
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

      {/* Tracking Indicator Badge */}
      {!isCameraStarting && !isModelLoading && !error && (
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2 z-10">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                currentLandmarks ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                currentLandmarks ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-mono font-medium text-slate-300">
            {currentLandmarks ? 'Pose Detected (33 pts)' : 'Searching for Pose...'}
          </span>
        </div>
      )}
    </div>
  )
}
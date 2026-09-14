import { useEffect, useRef, useState } from 'react'
import type { NormalizedLandmark } from '../../lib/mediapipe/poseDetector'
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '../../lib/mediapipe/landmarks'

interface PoseOverlayProps {
  landmarks: NormalizedLandmark[] | null
  videoWidth?: number
  videoHeight?: number
  isMirrored?: boolean
  showSkeleton?: boolean
  showKeypoints?: boolean
  className?: string
  width?: number
  height?: number
}

const MAJOR_JOINTS = new Set<number>([
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST,
  POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
])

const SECONDARY_JOINTS = new Set<number>([
  POSE_LANDMARKS.NOSE,
  POSE_LANDMARKS.LEFT_EAR,
  POSE_LANDMARKS.RIGHT_EAR,
  POSE_LANDMARKS.LEFT_HEEL,
  POSE_LANDMARKS.RIGHT_HEEL,
  POSE_LANDMARKS.LEFT_FOOT_INDEX,
  POSE_LANDMARKS.RIGHT_FOOT_INDEX,
])

export default function PoseOverlay({
  landmarks,
  videoWidth,
  videoHeight,
  isMirrored = false,
  showSkeleton = true,
  showKeypoints = true,
  className = '',
  width,
  height,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  // ResizeObserver to track the actual canvas/video display rectangle dynamically
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setDisplaySize((prev) => {
          if (
            Math.abs(prev.width - rect.width) < 0.5 &&
            Math.abs(prev.height - rect.height) < 0.5
          ) {
            return prev
          }
          return { width: rect.width, height: rect.height }
        })
      }
    }

    updateSize()

    const ro = new ResizeObserver(() => {
      updateSize()
    })

    ro.observe(canvas)
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement)
    }

    return () => {
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Actual CSS display size of the canvas / video container
    const displayWidth = canvas.clientWidth || displaySize.width
    const displayHeight = canvas.clientHeight || displaySize.height

    if (displayWidth <= 0 || displayHeight <= 0) return

    // Handle devicePixelRatio for crisp rendering on Retina/HiDPI screens
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const targetBufferWidth = Math.round(displayWidth * dpr)
    const targetBufferHeight = Math.round(displayHeight * dpr)

    if (canvas.width !== targetBufferWidth || canvas.height !== targetBufferHeight) {
      canvas.width = targetBufferWidth
      canvas.height = targetBufferHeight
    }

    // Set transform so all drawing coordinates map directly to CSS display pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    if (!landmarks || landmarks.length === 0) {
      return
    }

    // Determine intrinsic camera/video dimensions
    const vWidth = videoWidth || width || 640
    const vHeight = videoHeight || height || 480

    // Compute exact CSS object-cover scaling and crop offsets
    const scale = Math.max(displayWidth / vWidth, displayHeight / vHeight)
    const renderedWidth = vWidth * scale
    const renderedHeight = vHeight * scale
    const offsetX = (displayWidth - renderedWidth) / 2
    const offsetY = (displayHeight - renderedHeight) / 2

    // Project normalized landmark [0, 1] into actual display coordinates
    const toScreenX = (normX: number) => {
      return isMirrored
        ? offsetX + (1 - normX) * renderedWidth
        : offsetX + normX * renderedWidth
    }

    const toScreenY = (normY: number) => {
      return offsetY + normY * renderedHeight
    }

    const minVisibility = 0.35

    // 1. Draw skeletal connections
    if (showSkeleton) {
      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const start = landmarks[startIdx]
        const end = landmarks[endIdx]

        if (!start || !end) continue

        if (
          (start.visibility !== undefined && start.visibility < minVisibility) ||
          (end.visibility !== undefined && end.visibility < minVisibility)
        ) {
          continue
        }

        const x1 = toScreenX(start.x)
        const y1 = toScreenY(start.y)
        const x2 = toScreenX(end.x)
        const y2 = toScreenY(end.y)

        // Delicate rendering for facial connections; solid bold for body
        const isFaceConnection =
          startIdx <= POSE_LANDMARKS.MOUTH_RIGHT && endIdx <= POSE_LANDMARKS.MOUTH_RIGHT

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)

        if (isFaceConnection) {
          ctx.lineWidth = 1.5
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)' // Emerald-400 subtle
        } else {
          ctx.lineWidth = 3
          ctx.strokeStyle = '#34d399' // Emerald-400 solid
        }

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      }
    }

    // 2. Draw keypoint circles
    if (showKeypoints) {
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i]
        if (!lm) continue

        if (lm.visibility !== undefined && lm.visibility < minVisibility) {
          continue
        }

        const x = toScreenX(lm.x)
        const y = toScreenY(lm.y)

        let radius = 2
        let fill = '#38bdf8'
        let strokeWidth = 1

        if (MAJOR_JOINTS.has(i)) {
          radius = 4.5
          fill = '#38bdf8' // Sky-400
          strokeWidth = 1.5
        } else if (SECONDARY_JOINTS.has(i)) {
          radius = 3
          fill = '#7dd3fc' // Sky-300
          strokeWidth = 1
        } else if (i >= POSE_LANDMARKS.LEFT_PINKY && i <= POSE_LANDMARKS.RIGHT_THUMB) {
          radius = 2.5
          fill = '#38bdf8'
          strokeWidth = 1
        }

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.lineWidth = strokeWidth
        ctx.strokeStyle = '#020617' // Slate-950
        ctx.stroke()
      }
    }
  }, [
    landmarks,
    videoWidth,
    videoHeight,
    isMirrored,
    showSkeleton,
    showKeypoints,
    displaySize,
    width,
    height,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  )
}
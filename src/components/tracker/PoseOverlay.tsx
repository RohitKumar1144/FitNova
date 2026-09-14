import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import type { NormalizedLandmark } from '../../lib/mediapipe/poseDetector'
import {
  POSE_LANDMARKS,
  FITNESS_POSE_CONNECTIONS,
} from '../../lib/mediapipe/landmarks'

export interface PoseOverlayHandle {
  renderFrame: (landmarks: NormalizedLandmark[] | null) => void
  clear: () => void
}

export interface PoseOverlayProps {
  landmarks?: NormalizedLandmark[] | null
  videoWidth?: number
  videoHeight?: number
  isMirrored?: boolean
  showSkeleton?: boolean
  showKeypoints?: boolean
  className?: string
  width?: number
  height?: number
}

// Configurable velocity-adaptive visual coordinate smoothing constants
export const VISUAL_SMOOTHING_STATIC_ALPHA = 0.50  // Stronger smoothing for stationary/micro-jitter
export const VISUAL_SMOOTHING_MEDIUM_ALPHA = 0.75  // Balanced smoothing for moderate movement
export const VISUAL_SMOOTHING_FAST_ALPHA = 0.95    // Light smoothing / instant tracking for rapid movement

// Movement velocity thresholds in normalized coordinate distance per frame
export const VELOCITY_THRESHOLD_STATIC = 0.008
export const VELOCITY_THRESHOLD_FAST = 0.032

const MAJOR_JOINTS = new Set<number>([
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
])

interface SmoothedPoint {
  x: number
  y: number
  lastSeen: number
}

const PoseOverlay = forwardRef<PoseOverlayHandle, PoseOverlayProps>(function PoseOverlay(
  {
    landmarks,
    videoWidth,
    videoHeight,
    isMirrored = false,
    showSkeleton = true,
    showKeypoints = true,
    className = '',
    width,
    height,
  }: PoseOverlayProps,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const displaySizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
  const smoothedPointsRef = useRef<Map<number, SmoothedPoint>>(new Map())

  // Keep latest props in refs to avoid recreating the imperative draw callback
  const propsRef = useRef({
    videoWidth,
    videoHeight,
    isMirrored,
    showSkeleton,
    showKeypoints,
    width,
    height,
  })

  useEffect(() => {
    propsRef.current = {
      videoWidth,
      videoHeight,
      isMirrored,
      showSkeleton,
      showKeypoints,
      width,
      height,
    }
  })

  // Clear canvas buffer and visual smoothing history
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    smoothedPointsRef.current.clear()
  }, [])

  // Synchronous, high-performance canvas draw routine
  const drawFrame = useCallback((rawLandmarks: NormalizedLandmark[] | null) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const displayWidth = canvas.clientWidth || displaySizeRef.current.width
    const displayHeight = canvas.clientHeight || displaySizeRef.current.height
    if (displayWidth <= 0 || displayHeight <= 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const targetBufferWidth = Math.round(displayWidth * dpr)
    const targetBufferHeight = Math.round(displayHeight * dpr)

    // Resize canvas buffer only when physical dimensions change
    if (canvas.width !== targetBufferWidth || canvas.height !== targetBufferHeight) {
      canvas.width = targetBufferWidth
      canvas.height = targetBufferHeight
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    if (!rawLandmarks || rawLandmarks.length === 0) {
      smoothedPointsRef.current.clear()
      return
    }

    const {
      videoWidth: vW,
      videoHeight: vH,
      isMirrored: mirrored,
      showSkeleton: drawSkeleton,
      showKeypoints: drawPoints,
      width: fallbackW,
      height: fallbackH,
    } = propsRef.current

    const vWidth = vW || fallbackW || 640
    const vHeight = vH || fallbackH || 480

    // Compute exact CSS object-cover scaling and crop offsets
    const scale = Math.max(displayWidth / vWidth, displayHeight / vHeight)
    const renderedWidth = vWidth * scale
    const renderedHeight = vHeight * scale
    const offsetX = (displayWidth - renderedWidth) / 2
    const offsetY = (displayHeight - renderedHeight) / 2

    const now = performance.now()
    const minVisibility = 0.35

    // Velocity-adaptive coordinate smoother map for visualization
    const activePoints = new Map<number, { x: number; y: number; visibility: number }>()

    for (let i = 0; i < rawLandmarks.length; i++) {
      const lm = rawLandmarks[i]
      if (!lm) continue

      const vis = lm.visibility !== undefined ? lm.visibility : 1
      if (vis < minVisibility) {
        // Discard stale landmark tracking if invisible
        const existing = smoothedPointsRef.current.get(i)
        if (existing && now - existing.lastSeen > 120) {
          smoothedPointsRef.current.delete(i)
        }
        continue
      }

      // Compute velocity-adaptive smoothing
      const prev = smoothedPointsRef.current.get(i)
      let sx = lm.x
      let sy = lm.y

      if (prev && now - prev.lastSeen < 250) {
        const deltaDist = Math.hypot(lm.x - prev.x, lm.y - prev.y)
        let alpha: number
        if (deltaDist <= VELOCITY_THRESHOLD_STATIC) {
          alpha = VISUAL_SMOOTHING_STATIC_ALPHA
        } else if (deltaDist >= VELOCITY_THRESHOLD_FAST) {
          alpha = VISUAL_SMOOTHING_FAST_ALPHA
        } else {
          const t = (deltaDist - VELOCITY_THRESHOLD_STATIC) / (VELOCITY_THRESHOLD_FAST - VELOCITY_THRESHOLD_STATIC)
          alpha = VISUAL_SMOOTHING_STATIC_ALPHA + t * (VISUAL_SMOOTHING_FAST_ALPHA - VISUAL_SMOOTHING_STATIC_ALPHA)
        }
        sx = prev.x + alpha * (lm.x - prev.x)
        sy = prev.y + alpha * (lm.y - prev.y)
      }

      smoothedPointsRef.current.set(i, { x: sx, y: sy, lastSeen: now })

      // Project into screen coordinates
      const screenX = mirrored
        ? offsetX + (1 - sx) * renderedWidth
        : offsetX + sx * renderedWidth
      const screenY = offsetY + sy * renderedHeight

      activePoints.set(i, { x: screenX, y: screenY, visibility: vis })
    }

    // 1. Draw Clean Fitness Skeleton Lines
    if (drawSkeleton) {
      ctx.beginPath()

      // Primary fitness body connections
      for (const [startIdx, endIdx] of FITNESS_POSE_CONNECTIONS) {
        const p1 = activePoints.get(startIdx)
        const p2 = activePoints.get(endIdx)
        if (!p1 || !p2) continue

        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
      }

      // Clean head indicator connection: Nose to midpoint between shoulders
      const nose = activePoints.get(POSE_LANDMARKS.NOSE)
      const lShoulder = activePoints.get(POSE_LANDMARKS.LEFT_SHOULDER)
      const rShoulder = activePoints.get(POSE_LANDMARKS.RIGHT_SHOULDER)
      if (nose && lShoulder && rShoulder) {
        const neckX = (lShoulder.x + rShoulder.x) / 2
        const neckY = (lShoulder.y + rShoulder.y) / 2
        ctx.moveTo(nose.x, nose.y)
        ctx.lineTo(neckX, neckY)
      }

      ctx.lineWidth = 3
      ctx.strokeStyle = '#34d399' // Emerald-400
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    }

    // 2. Draw Clean Fitness Keypoints (No facial or finger clutter)
    if (drawPoints) {
      // Draw head / nose
      const nose = activePoints.get(POSE_LANDMARKS.NOSE)
      if (nose) {
        ctx.beginPath()
        ctx.arc(nose.x, nose.y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = '#38bdf8' // Sky-400
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#020617' // Slate-950
        ctx.stroke()
      }

      // Draw major body joints (shoulders, elbows, hips, knees, ankles)
      for (const jointIdx of MAJOR_JOINTS) {
        const pt = activePoints.get(jointIdx)
        if (!pt) continue

        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4.5, 0, 2 * Math.PI)
        ctx.fillStyle = '#38bdf8' // Sky-400
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#020617' // Slate-950
        ctx.stroke()
      }

      // Draw wrists as clean endpoint dots (no hand/finger spiderwebs)
      const lWrist = activePoints.get(POSE_LANDMARKS.LEFT_WRIST)
      if (lWrist) {
        ctx.beginPath()
        ctx.arc(lWrist.x, lWrist.y, 3.5, 0, 2 * Math.PI)
        ctx.fillStyle = '#34d399' // Emerald-400
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = '#020617'
        ctx.stroke()
      }

      const rWrist = activePoints.get(POSE_LANDMARKS.RIGHT_WRIST)
      if (rWrist) {
        ctx.beginPath()
        ctx.arc(rWrist.x, rWrist.y, 3.5, 0, 2 * Math.PI)
        ctx.fillStyle = '#34d399' // Emerald-400
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = '#020617'
        ctx.stroke()
      }

      // Draw feet index endpoints
      const lFoot = activePoints.get(POSE_LANDMARKS.LEFT_FOOT_INDEX)
      if (lFoot) {
        ctx.beginPath()
        ctx.arc(lFoot.x, lFoot.y, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#38bdf8'
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = '#020617'
        ctx.stroke()
      }

      const rFoot = activePoints.get(POSE_LANDMARKS.RIGHT_FOOT_INDEX)
      if (rFoot) {
        ctx.beginPath()
        ctx.arc(rFoot.x, rFoot.y, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#38bdf8'
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = '#020617'
        ctx.stroke()
      }
    }
  }, [])

  // Expose imperative drawing handle
  useImperativeHandle(ref, () => ({
    renderFrame: drawFrame,
    clear: clearCanvas,
  }), [drawFrame, clearCanvas])

  // ResizeObserver dynamically measures canvas layout without triggering component re-renders
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        displaySizeRef.current = { width: rect.width, height: rect.height }
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
        const targetBufferWidth = Math.round(rect.width * dpr)
        const targetBufferHeight = Math.round(rect.height * dpr)
        if (canvas.width !== targetBufferWidth || canvas.height !== targetBufferHeight) {
          canvas.width = targetBufferWidth
          canvas.height = targetBufferHeight
        }
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

  // Fallback support if landmarks prop is passed directly
  useEffect(() => {
    if (landmarks !== undefined) {
      drawFrame(landmarks)
    }
  }, [landmarks, drawFrame])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  )
})

export default PoseOverlay
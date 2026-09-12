import { useEffect, useRef } from 'react'
import type { NormalizedLandmark } from '../../lib/mediapipe/poseDetector'
import { POSE_CONNECTIONS } from '../../lib/mediapipe/landmarks'

interface PoseOverlayProps {
  landmarks: NormalizedLandmark[] | null
  width: number
  height: number
  showSkeleton?: boolean
  showKeypoints?: boolean
  className?: string
}

export default function PoseOverlay({
  landmarks,
  width,
  height,
  showSkeleton = true,
  showKeypoints = true,
  className = '',
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear previous canvas frame
    ctx.clearRect(0, 0, width, height)

    if (!landmarks || landmarks.length === 0) {
      return
    }

    // 1. Draw skeletal connections
    if (showSkeleton) {
      ctx.lineWidth = 3
      ctx.strokeStyle = '#34d399' // Emerald-400

      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const start = landmarks[startIdx]
        const end = landmarks[endIdx]

        if (!start || !end) continue

        // Check visibility/confidence if available
        const minVisibility = 0.3
        if (
          (start.visibility !== undefined && start.visibility < minVisibility) ||
          (end.visibility !== undefined && end.visibility < minVisibility)
        ) {
          continue
        }

        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.stroke()
      }
    }

    // 2. Draw keypoint circles
    if (showKeypoints) {
      for (const lm of landmarks) {
        if (lm.visibility !== undefined && lm.visibility < 0.3) {
          continue
        }

        const x = lm.x * width
        const y = lm.y * height

        ctx.beginPath()
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI)
        ctx.fillStyle = '#38bdf8' // Sky-400
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#020617' // Slate-950
        ctx.stroke()
      }
    }
  }, [landmarks, width, height, showSkeleton, showKeypoints])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  )
}
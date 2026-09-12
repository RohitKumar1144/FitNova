import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

export type { PoseLandmarkerResult, NormalizedLandmark }

let poseLandmarkerInstance: PoseLandmarker | null = null
let isInitializing = false
let lastTimestampMs = -1

export interface PoseDetectorConfig {
  wasmLoaderPath?: string
  modelAssetPath?: string
  minPoseDetectionConfidence?: number
  minPosePresenceConfidence?: number
  minTrackingConfidence?: number
  runningMode?: 'VIDEO' | 'IMAGE'
}

/**
 * Initializes the MediaPipe PoseLandmarker.
 * Uses Google's official WASM asset loader and pre-trained float16 pose landmarker model.
 */
export async function initializePoseDetector(config?: PoseDetectorConfig): Promise<PoseLandmarker> {
  if (poseLandmarkerInstance) {
    return poseLandmarkerInstance
  }

  if (isInitializing) {
    // Wait for the in-progress initialization
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (poseLandmarkerInstance) return poseLandmarkerInstance
  }

  isInitializing = true

  try {
    const wasmPath =
      config?.wasmLoaderPath ||
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

    const modelPath =
      config?.modelAssetPath ||
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

    const vision = await FilesetResolver.forVisionTasks(wasmPath)

    poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: 'GPU',
      },
      runningMode: config?.runningMode || 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: config?.minPoseDetectionConfidence ?? 0.5,
      minPosePresenceConfidence: config?.minPosePresenceConfidence ?? 0.5,
      minTrackingConfidence: config?.minTrackingConfidence ?? 0.5,
    })

    console.log('[FitNova] PoseLandmarker initialized successfully (GPU delegate)')
    return poseLandmarkerInstance
  } catch (error) {
    console.error('Failed to initialize PoseLandmarker with GPU delegate, retrying with CPU:', error)
    // Fallback to CPU delegate if WebGL/GPU is unavailable
    try {
      const wasmPath =
        config?.wasmLoaderPath ||
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

      const modelPath =
        config?.modelAssetPath ||
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

      const vision = await FilesetResolver.forVisionTasks(wasmPath)

      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'CPU',
        },
        runningMode: config?.runningMode || 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: config?.minPoseDetectionConfidence ?? 0.5,
        minPosePresenceConfidence: config?.minPosePresenceConfidence ?? 0.5,
        minTrackingConfidence: config?.minTrackingConfidence ?? 0.5,
      })

      console.log('[FitNova] PoseLandmarker initialized successfully (CPU fallback)')
      return poseLandmarkerInstance
    } catch (cpuError) {
      console.error('Failed to initialize PoseLandmarker with CPU delegate:', cpuError)
      throw cpuError
    }
  } finally {
    isInitializing = false
  }
}

/**
 * Detects pose landmarks in a given video frame.
 * @param video HTMLVideoElement with active camera stream
 * @param timestampMs Monotonically increasing timestamp in milliseconds
 */
export function detectPoseForVideo(
  video: HTMLVideoElement,
  timestampMs: number
): PoseLandmarkerResult | null {
  if (!poseLandmarkerInstance) {
    return null
  }

  if (video.readyState < 2) {
    // Video has not loaded enough data to be sampled yet
    return null
  }

  // MediaPipe requires strictly increasing timestamps.
  // On Windows, performance.now() can return the same value on consecutive rAF calls.
  if (timestampMs <= lastTimestampMs) {
    return null
  }
  lastTimestampMs = timestampMs

  try {
    return poseLandmarkerInstance.detectForVideo(video, timestampMs)
  } catch (err) {
    console.error('Error during detectForVideo:', err)
    return null
  }
}

/**
 * Releases the PoseLandmarker instance.
 */
export function disposePoseDetector(): void {
  if (poseLandmarkerInstance) {
    poseLandmarkerInstance.close()
    poseLandmarkerInstance = null
  }
  lastTimestampMs = -1
}
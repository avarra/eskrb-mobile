package com.margelo.nitro.posedetector

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.accurate.AccuratePoseDetectorOptions
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ML Kit accurate pose detection on VisionCamera v5 frames.
 *
 * CameraX analysis buffers are never physically mirrored, and ML Kit on Android reports positions in
 * the rotated (upright) image's pixel space, so positions pass straight through. `isMirrored` is a display hint that
 * JS applies when drawing over a mirrored front-camera preview.
 */
@DoNotStrip
@Keep
class HybridPoseDetector : HybridPoseDetectorSpec() {
  private val detector =
    PoseDetection.getClient(
      AccuratePoseDetectorOptions.Builder()
        .setDetectorMode(AccuratePoseDetectorOptions.STREAM_MODE)
        .build(),
    )
  private val isDisposed = AtomicBoolean(false)

  override fun detect(frame: HybridFrameSpec): Pose? {
    val nativeFrame =
      frame as? NativeFrame
        ?: throw IllegalArgumentException("PoseDetector: expected a VisionCamera native frame.")
    val imageProxy = nativeFrame.image
    val mediaImage =
      imageProxy.image
        ?: throw UnsupportedOperationException("PoseDetector: frame has no media image (use pixelFormat 'yuv').")

    val rotation = imageProxy.imageInfo.rotationDegrees
    val input = InputImage.fromMediaImage(mediaImage, rotation)
    val pose = Tasks.await(detector.process(input))
    val all = pose.allPoseLandmarks
    if (all.isEmpty()) return null

    val quarterTurn = rotation == 90 || rotation == 270
    val width = (if (quarterTurn) imageProxy.height else imageProxy.width).toDouble()
    val height = (if (quarterTurn) imageProxy.width else imageProxy.height).toDouble()

    // allPoseLandmarks is ordered by PoseLandmark type (0..32), but index explicitly to be safe.
    val landmarks =
      Array(LANDMARK_COUNT) { type ->
        val lm = pose.getPoseLandmark(type)
        if (lm == null) {
          PoseLandmark(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
        } else {
          val u = lm.position3D.x.toDouble()
          val v = lm.position3D.y.toDouble()
          val (fx, fy) = uprightToBuffer(u, v, rotation, imageProxy.width.toDouble(), imageProxy.height.toDouble())
          PoseLandmark(
            x = u,
            y = v,
            z = lm.position3D.z.toDouble(),
            likelihood = lm.inFrameLikelihood.toDouble(),
            frameX = fx,
            frameY = fy,
          )
        }
      }
    return Pose(landmarks = landmarks, width = width, height = height)
  }

  override fun dispose() {
    if (isDisposed.compareAndSet(false, true)) {
      runCatching { detector.close() }
    }
    super.dispose()
  }

  private companion object {
    const val LANDMARK_COUNT = 33

    /**
     * Inverse of CameraX's rotation (`rotationDegrees` = clockwise turn that makes the buffer
     * upright): maps an upright point back into the raw buffer of size [w] x [h].
     */
    fun uprightToBuffer(u: Double, v: Double, rotation: Int, w: Double, h: Double): Pair<Double, Double> =
      when (rotation) {
        90 -> Pair(v, h - u)
        180 -> Pair(w - u, h - v)
        270 -> Pair(w - v, u)
        else -> Pair(u, v)
      }
  }
}

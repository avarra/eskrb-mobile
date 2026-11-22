import AVFoundation
import MLKitPoseDetectionAccurate
import MLKitPoseDetectionCommon
import MLKitVision
import NitroModules
import UIKit
import VisionCamera

/// ML Kit accurate pose detection on VisionCamera v5 frames.
///
/// ML Kit on iOS reports landmark positions in the raw (sensor-oriented) buffer's pixel space, even
/// when `VisionImage.orientation` is set. We map them into the upright, un-mirrored image's pixel
/// space so JS never has to know about buffer orientation.
final class HybridPoseDetector: HybridPoseDetectorSpec {
  private let detector: PoseDetector

  override init() {
    let options = AccuratePoseDetectorOptions()
    options.detectorMode = .stream
    detector = PoseDetector.poseDetector(options: options)
    super.init()
  }

  func detect(frame: any HybridFrameSpec) throws -> Pose? {
    guard let nativeFrame = frame as? NativeFrame, let sampleBuffer = nativeFrame.sampleBuffer else {
      throw RuntimeError.error(withMessage: "PoseDetector: frame has no sample buffer (use pixelFormat 'yuv' or 'native').")
    }
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return nil }
    let rawWidth = Double(CVPixelBufferGetWidth(pixelBuffer))
    let rawHeight = Double(CVPixelBufferGetHeight(pixelBuffer))

    let orientation = frame.orientation
    let isMirrored = frame.isMirrored

    let image = VisionImage(buffer: sampleBuffer)
    image.orientation = Self.uiOrientation(orientation, mirrored: isMirrored)

    let poses = try detector.results(in: image)
    guard let pose = poses.first else { return nil }

    let quarterTurn = orientation == .left || orientation == .right
    let uprightWidth = quarterTurn ? rawHeight : rawWidth
    let uprightHeight = quarterTurn ? rawWidth : rawHeight

    let landmarks = Self.landmarkOrder.map { type -> PoseLandmark in
      let lm = pose.landmark(ofType: type)
      let (ux, uy) = Self.toUpright(
        x: Double(lm.position.x) / rawWidth,
        y: Double(lm.position.y) / rawHeight,
        orientation: orientation,
        mirrored: isMirrored
      )
      return PoseLandmark(
        x: ux * uprightWidth,
        y: uy * uprightHeight,
        z: Double(lm.position.z),
        likelihood: Double(lm.inFrameLikelihood),
        frameX: Double(lm.position.x),
        frameY: Double(lm.position.y)
      )
    }
    return Pose(landmarks: landmarks, width: uprightWidth, height: uprightHeight)
  }

  // MARK: - Orientation

  /// VisionCamera's orientation says how the buffer content is rotated; UIImage orientation says how to
  /// rotate it for display, so left/right swap. A mirrored quarter turn reverses the rotation sense, so
  /// mirrored frames keep the direction (front camera in portrait → `.leftMirrored`, as in Google's ML Kit
  /// sample). Swapping those too fed ML Kit an upside-down person.
  private static func uiOrientation(_ o: CameraOrientation, mirrored: Bool) -> UIImage.Orientation {
    switch o {
    case .up: return mirrored ? .upMirrored : .up
    case .down: return mirrored ? .downMirrored : .down
    case .left: return mirrored ? .leftMirrored : .right
    case .right: return mirrored ? .rightMirrored : .left
    }
  }

  /// Normalized raw-buffer point → normalized upright, un-mirrored point.
  private static func toUpright(x: Double, y: Double, orientation: CameraOrientation, mirrored: Bool)
    -> (Double, Double)
  {
    // Rotate first, then un-mirror in upright space. Un-mirroring the raw buffer before a quarter turn
    // differs by exactly 180° and drew front-camera skeletons upside down and side-swapped. (The earlier
    // upside-down overlay came from VisionCamera's frame→camera→view conversion rotating twice.)
    var (ux, uy): (Double, Double)
    switch orientation {
    case .up: (ux, uy) = (x, y)
    case .down: (ux, uy) = (1 - x, 1 - y)
    // Content rotated left (CCW) → rotate clockwise to make it upright.
    case .left: (ux, uy) = (1 - y, x)
    // Content rotated right (CW) → rotate counter-clockwise.
    case .right: (ux, uy) = (y, 1 - x)
    }
    if mirrored { ux = 1 - ux }
    return (ux, uy)
  }

  /// ML Kit's canonical 33-landmark order (matches Android's PoseLandmark int constants).
  private static let landmarkOrder: [PoseLandmarkType] = [
    .nose, .leftEyeInner, .leftEye, .leftEyeOuter, .rightEyeInner, .rightEye, .rightEyeOuter,
    .leftEar, .rightEar, .mouthLeft, .mouthRight,
    .leftShoulder, .rightShoulder, .leftElbow, .rightElbow, .leftWrist, .rightWrist,
    .leftPinkyFinger, .rightPinkyFinger, .leftIndexFinger, .rightIndexFinger, .leftThumb, .rightThumb,
    .leftHip, .rightHip, .leftKnee, .rightKnee, .leftAnkle, .rightAnkle,
    .leftHeel, .rightHeel, .leftToe, .rightToe,
  ]
}

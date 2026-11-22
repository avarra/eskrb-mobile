import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  usePinchGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  type CameraRef,
  type FlashMode,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';

import { FocusIndicator, type FocusPoint } from '@/components/camera/focus-indicator';
import { GridOverlay } from '@/components/camera/grid-overlay';
import { PhotoReview } from '@/components/camera/photo-review';
import { RoundControl } from '@/components/camera/round-control';
import { type TimerSeconds, TopControls } from '@/components/camera/top-controls';
import { ZoomPills } from '@/components/camera/zoom-pills';
import { Icon } from '@/components/icon';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { useCountdown } from '@/hooks/use-countdown';
import { neutralZoom, zoomStops } from '@/lib/camera-zoom';
import { pendingPhoto } from '@/lib/pending-photo';
import { colors } from '@/theme/tokens';

/**
 * Wound photo with VisionCamera v5: flash, torch, self-timer, grid, lens buttons,
 * pinch zoom, tap to focus, long-press focus/exposure lock, vertical drag for exposure, flip, and a
 * review step. The file goes back through `pendingPhoto` to whichever screen opened the camera.
 */
export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();

  const [position, setPosition] = useState<'back' | 'front'>('back');
  // Multi-lens virtual device: gives the 0.5× lens and lets iOS switch to it automatically for close-ups (macro).
  const backDevice = useCameraDevice('back', { physicalDevices: ['ultra-wide-angle', 'wide-angle', 'telephoto'] });
  const frontDevice = useCameraDevice('front');
  const device = position === 'front' ? (frontDevice ?? backDevice) : backDevice;

  const cameraRef = useRef<CameraRef>(null);
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });

  const [flash, setFlash] = useState<FlashMode>('auto');
  const [torch, setTorch] = useState(false);
  const [timer, setTimer] = useState<TimerSeconds>(0);
  const [grid, setGrid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
  const [locked, setLocked] = useState(false);
  const countdown = useCountdown();

  // Device-derived limits, with safe fallbacks so the gesture hooks can run before a device exists.
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1;
  const neutral = device ? neutralZoom(device) : 1;
  const stops = device ? zoomStops(device) : [];
  const minExposure = device?.minExposureBias ?? 0;
  const maxExposure = device?.maxExposureBias ?? 0;
  const canExpose = !!device?.supportsExposureBias && maxExposure > minExposure;
  const canFocus = !!device?.supportsFocusMetering;

  const zoom = useSharedValue(neutral);
  const exposure = useSharedValue(0);
  // Last zoom the user chose (pinch end / lens pill); null = this lens's 1×.
  const [zoomPicked, setZoomPicked] = useState<number | null>(null);
  const zoomShown = zoomPicked ?? neutral;

  // The device resolves after the first render and changes on flip: start each lens at its 1×, not raw 1 (= 0.5× on iPhones).
  const deviceId = device?.id;
  useEffect(() => {
    zoom.set(neutral);
    exposure.set(0);
  }, [deviceId, neutral, zoom, exposure]);

  const focusAt = (x: number, y: number, lock: boolean) => {
    if (!canFocus) return;
    exposure.set(0);
    setLocked(lock);
    setFocusPoint((p) => ({ x, y, id: (p?.id ?? 0) + 1 }));
    if (lock) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    cameraRef.current
      ?.focusTo({ x, y }, lock ? { adaptiveness: 'locked', autoResetAfter: null } : undefined)
      .catch(() => {});
  };

  // New lens → back to its 1×, neutral exposure, no focus point, torch off.
  const flip = () => {
    Haptics.selectionAsync();
    setZoomPicked(null);
    setFocusPoint(null);
    setLocked(false);
    setTorch(false);
    setPosition((p) => (p === 'back' ? 'front' : 'back'));
  };

  // Show the focus square (and its exposure sun) when exposure is dragged without a prior tap.
  const revealExposure = () => {
    setFocusPoint((p) => (p ? { ...p, id: p.id + 1 } : { x: window.width / 2, y: window.height / 2, id: 1 }));
  };

  const pinchStart = useSharedValue(neutral);
  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      pinchStart.set(zoom.get());
    },
    onUpdate: (e) => {
      'worklet';
      zoom.set(Math.min(Math.max(pinchStart.get() * e.scale, minZoom), maxZoom));
    },
    onFinalize: () => {
      'worklet';
      scheduleOnRN(setZoomPicked, zoom.get());
    },
  });

  const exposureStart = useSharedValue(0);
  const exposurePan = usePanGesture({
    enabled: canExpose,
    maxPointers: 1,
    activeOffsetY: [-12, 12],
    failOffsetX: [-30, 30],
    onActivate: () => {
      'worklet';
      exposureStart.set(exposure.get());
      scheduleOnRN(revealExposure);
    },
    onUpdate: (e) => {
      'worklet';
      // Drag up = brighter. A 300pt drag spans the whole range.
      const next = exposureStart.get() - (e.translationY * (maxExposure - minExposure)) / 300;
      exposure.set(Math.min(Math.max(next, minExposure), maxExposure));
    },
  });

  const tap = useTapGesture({ runOnJS: true, onActivate: (e) => focusAt(e.x, e.y, false) });
  const longPress = useLongPressGesture({ runOnJS: true, minDuration: 600, onActivate: (e) => focusAt(e.x, e.y, true) });
  const doubleTap = useTapGesture({ runOnJS: true, numberOfTaps: 2, onActivate: flip });
  const gesture = useCompetingGestures(pinch, exposurePan, useExclusiveGestures(longPress, doubleTap, tap));

  if (!hasPermission || !device) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={sl.camera.close} style={styles.closeRow}>
          <Icon name="close" />
          <Text variant="topBar">{sl.common.close}</Text>
        </Pressable>
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          <Text variant="quote">{device ? sl.camera.noPermission : sl.camera.noDevice}</Text>
          {device && <PillButton variant="solid" label={sl.camera.allow} onPress={() => requestPermission()} />}
        </View>
      </Screen>
    );
  }

  const capture = async () => {
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const flashMode: FlashMode = device.hasFlash && !torch ? flash : 'off';
      const { filePath } = await photoOutput.capturePhotoToFile({ flashMode }, {});
      setReview(filePath.startsWith('file://') ? filePath : `file://${filePath}`);
    } finally {
      setBusy(false);
    }
  };

  const onShutter = () => {
    if (countdown.remaining !== null) countdown.cancel();
    else if (timer > 0) countdown.start(timer, capture);
    else capture();
  };

  const selectZoom = (z: number) => {
    Haptics.selectionAsync();
    zoom.set(withTiming(z, { duration: 250 }));
    setZoomPicked(z);
  };

  const counting = countdown.remaining !== null;

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} accessible accessibilityHint={sl.camera.focusHint}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isFocused && !review}
            outputs={[photoOutput]}
            zoom={zoom}
            exposure={exposure}
            torchMode={torch && device.hasTorch ? 'on' : 'off'}
            enableSmoothAutoFocus={device.supportsSmoothAutoFocus ? true : undefined}
            orientationSource="device"
          />
          {grid && <GridOverlay />}
          <FocusIndicator
            point={focusPoint}
            locked={locked}
            exposure={exposure}
            minExposure={minExposure}
            maxExposure={maxExposure}
            showExposure={canExpose}
          />
        </View>
      </GestureDetector>

      {counting && (
        <View style={styles.countdown} pointerEvents="none">
          <Text variant="painNumber" maxFontSizeMultiplier={1} accessibilityLiveRegion="assertive">
            {countdown.remaining}
          </Text>
        </View>
      )}

      <RoundControl icon="close" label={sl.camera.close} onPress={() => router.back()} style={{ ...styles.close, top: insets.top + 8 }} />

      <View style={[styles.side, { top: insets.top + 8 }]}>
        <TopControls
          flash={flash}
          onFlash={(f) => {
            setFlash(f);
            if (f !== 'off') setTorch(false);
          }}
          showFlash={device.hasFlash}
          torch={torch}
          onTorch={(t) => {
            setTorch(t);
            if (t) setFlash('off');
          }}
          showTorch={device.hasTorch}
          timer={timer}
          onTimer={setTimer}
          grid={grid}
          onGrid={setGrid}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <ZoomPills stops={stops} zoom={zoomShown} neutral={neutral} onSelect={selectZoom} />
        <View style={styles.shutterRow}>
          <View style={styles.sideSlot} />
          <Pressable
            onPress={onShutter}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={counting ? sl.camera.timerCancel : sl.camera.shutter}
            style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.ground} />
            ) : counting ? (
              <Icon name="stop" color={colors.ground} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <View style={styles.sideSlot}>
            {frontDevice && backDevice && <RoundControl icon="flip" label={sl.camera.flip} onPress={flip} />}
          </View>
        </View>
      </View>

      {review && (
        <PhotoReview
          uri={review}
          onRetake={() => setReview(null)}
          onUse={() => {
            pendingPhoto.set(review);
            router.back();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  closeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  close: { position: 'absolute', left: 24 },
  side: { position: 'absolute', right: 24 },
  countdown: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 20 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 40 },
  sideSlot: { width: 56, height: 56 },
  shutter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 0px 6px rgba(255,255,255,0.35)',
  },
  shutterInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.ground },
});

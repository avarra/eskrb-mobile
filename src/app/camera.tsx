import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { Icon } from '@/components/icon';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { pendingPhoto } from '@/lib/pending-photo';
import { colors } from '@/theme/tokens';

/** Wound photo with VisionCamera v5. The file goes to the note screen, which copies it into documents. */
export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });
  const isFocused = useIsFocused();
  const [busy, setBusy] = useState(false);

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

  const shoot = async () => {
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { filePath } = await photoOutput.capturePhotoToFile({}, {});
      pendingPhoto.set(filePath.startsWith('file://') ? filePath : `file://${filePath}`);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isFocused} outputs={[photoOutput]} />
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={sl.camera.close}
        style={[styles.close, { top: insets.top + 8 }]}
      >
        <Icon name="close" color={colors.ink} />
      </Pressable>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={shoot}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={sl.camera.shutter}
          style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          {busy ? <ActivityIndicator color={colors.ground} /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  closeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  close: {
    position: 'absolute',
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
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

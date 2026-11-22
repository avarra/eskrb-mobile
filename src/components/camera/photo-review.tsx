import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { sl } from '@/copy/sl';

type Props = { uri: string; onRetake: () => void; onUse: () => void };

/** Full-screen look at the shot before it goes to the team: retake or use. */
export function PhotoReview({ uri, onRetake, onUse }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={sl.camera.reviewLabel} />
      <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
        <PillButton variant="solid" icon="check" label={sl.camera.use} onPress={onUse} />
        <PillButton icon="retake" label={sl.camera.retake} onPress={onRetake} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  actions: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 12 },
});

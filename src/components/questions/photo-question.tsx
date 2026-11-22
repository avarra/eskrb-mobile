import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { usePhotoPicker } from '@/lib/photo-picker';
import { colors, radius, shadow } from '@/theme/tokens';

/** A protocol question answered with one photo. The value is the local file URI until the check-in is sent. */
export function PhotoQuestion({ value, onChange, onClear, label }: {
  value: string | undefined;
  onChange: (uri: string) => void;
  onClear: () => void;
  label: string;
}) {
  const pick = usePhotoPicker({
    limit: 1,
    onPicked: ([uri]) => uri && onChange(uri),
    onRemove: value ? onClear : undefined,
  });

  return (
    <Pressable
      onPress={pick}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}. ${sl.note.photoA11y}. ${sl.checkin.photoChange}` : `${label}. ${sl.checkin.photoAdd}`}
      style={({ pressed }) => [styles.tile, value ? styles.filled : styles.empty, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      {value ? (
        <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.inner}>
          <Icon name="cam" size={56} color={colors.ink} />
          <Text variant="body" color={colors.ink}>
            {sl.checkin.photoAdd}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { aspectRatio: 1, width: '100%', maxHeight: 360, alignSelf: 'center', borderRadius: radius.card, overflow: 'hidden' },
  empty: { backgroundColor: colors.tonal, boxShadow: shadow.tonal, alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: colors.sheetFill, boxShadow: shadow.object },
  inner: { alignItems: 'center', gap: 12 },
});

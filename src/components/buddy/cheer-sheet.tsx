import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import type { Cheer } from '@/data/api';
import { colors, font } from '@/theme/tokens';

import { BottomSheet } from './bottom-sheet';
import { SheetButton } from './sheet-buttons';

type Props = {
  visible: boolean;
  buddyName: string;
  cheers: Cheer[];
  /** The cheer being sent (pressed state). */
  sendingId: string | null;
  error: string | null;
  onPick: (c: Cheer) => void;
  /** "Napišite svoje sporočilo": close and focus the composer. Hidden when writing isn't possible. */
  onWrite?: () => void;
  onClose: () => void;
};

/** "Pošljite pozdrav": what the sender taps (bold) and, in »…«, exactly what the buddy receives. */
export function CheerSheet({ visible, buddyName, cheers, sendingId, error, onPick, onWrite, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text variant="title" color={colors.sheetInk} accessibilityRole="header" style={styles.h2}>
          {sl.buddy.sheet.title}
        </Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={sl.common.close} style={styles.x} hitSlop={6}>
          <Icon name="close" color={colors.sheetInk} />
        </Pressable>
      </View>
      <Text variant="meta" color={colors.sheetInk2} style={{ marginTop: 4 }}>
        {sl.buddy.sheet.receives(buddyName)}
      </Text>
      <ScrollView style={{ flexGrow: 0 }} bounces={false}>
        {cheers.map((c) => {
          const sending = sendingId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onPick(c)}
              disabled={!!sendingId}
              accessibilityRole="button"
              accessibilityLabel={sl.buddy.sheet.optionA11y(c.label, c.text)}
              accessibilityState={{ busy: sending, disabled: !!sendingId }}
              style={({ pressed }) => [styles.opt, (pressed || sending) && styles.optPress]}
            >
              {({ pressed }) => (
                <>
                  <Text variant="entryTitle" color={pressed || sending ? colors.ink : colors.ground} style={styles.label}>
                    {c.label}
                  </Text>
                  <Text variant="meta" color={pressed || sending ? colors.ink : colors.sheetInk2} style={{ marginTop: 2 }}>
                    {sl.buddy.sheet.quote(c.text)}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {error && (
        <Text variant="body" color={colors.urgent} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {onWrite && <SheetButton variant="outline" icon="kbd" label={sl.buddy.sheet.own} onPress={onWrite} style={{ marginTop: 16 }} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h2: { fontSize: 28, lineHeight: 34, flex: 1 },
  x: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.sheetFill, alignItems: 'center', justifyContent: 'center' },
  opt: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.sheetFill, marginTop: 10 },
  optPress: { backgroundColor: colors.ground, transform: [{ scale: 0.97 }] },
  label: { fontFamily: font.semibold, lineHeight: 27 },
});

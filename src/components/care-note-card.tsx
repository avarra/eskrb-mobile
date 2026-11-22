import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import type { CareNote } from '@/data/api';
import { whenLine } from '@/domain/format';
import { colors, radius } from '@/theme/tokens';

/** One care-team note (medication instructions or advice) on a white card. */
export function CareNoteCard({ note: n }: { note: CareNote }) {
  const kind = n.kind === 'medication' ? sl.instructions.medication : sl.instructions.advice;
  return (
    <View style={styles.card}>
      <Text variant="meta" color={colors.sheetInk2}>
        {`${kind} · ${sl.instructions.updated(whenLine(n.updatedAt).toLowerCase())}`}
      </Text>
      {n.title && (
        <Text variant="entryTitle" color={colors.sheetInk} style={{ marginTop: 6 }}>
          {n.title}
        </Text>
      )}
      <Text variant="body" color={colors.sheetInk} style={{ marginTop: 6 }}>
        {n.body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.sheet, borderRadius: radius.card, paddingVertical: 20, paddingHorizontal: 22 },
});

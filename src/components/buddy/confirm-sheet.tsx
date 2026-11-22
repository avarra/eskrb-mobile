import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors } from '@/theme/tokens';

import { BottomSheet } from './bottom-sheet';
import { SheetButton } from './sheet-buttons';

type Props = {
  visible: boolean;
  title: string;
  /** The message being reported, shown as a quote. */
  quote?: string;
  body: string;
  action: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** A question with one solid action and "Prekliči" (report a message, leave the pair). */
export function ConfirmSheet({ visible, title, quote, body, action, busy, error, onConfirm, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="title" color={colors.sheetInk} accessibilityRole="header" style={styles.h2}>
        {title}
      </Text>
      {quote ? (
        <View style={styles.quote}>
          <Text variant="body" color={colors.sheetInk}>
            {quote}
          </Text>
        </View>
      ) : null}
      <Text variant={quote ? 'meta' : 'body'} color={colors.sheetInk2} style={{ marginTop: quote ? 0 : 10 }}>
        {body}
      </Text>
      {error ? (
        <Text variant="body" color={colors.urgent} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <SheetButton variant="solid" label={action} onPress={onConfirm} busy={busy} style={{ marginTop: 16 }} />
      <SheetButton variant="ghost" label={sl.common.cancel} onPress={onClose} style={{ marginTop: 6 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 28, lineHeight: 34 },
  quote: { backgroundColor: colors.sheetFill, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 20, marginTop: 14, marginBottom: 6 },
});

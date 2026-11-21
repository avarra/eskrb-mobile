import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { usePostMessage } from '@/data/queries';
import { colors, font, size } from '@/theme/tokens';

/** "Odgovorite ekipi" + round send button, on a white sheet. */
export function ReplyBox({ episodeId, onSent }: { episodeId: string; onSent?: () => void }) {
  const [body, setBody] = useState('');
  const post = usePostMessage();
  const canSend = body.trim().length > 0 && !post.isPending;
  const send = () => {
    if (!canSend) return;
    post.mutate(
      { episodeId, body },
      {
        onSuccess: () => {
          setBody('');
          onSent?.();
        },
      },
    );
  };
  return (
    <View>
    <View style={styles.row}>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={sl.reply.toTeam}
        placeholderTextColor={colors.sheetInk2}
        accessibilityLabel={sl.reply.toTeam}
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="send"
        onSubmitEditing={send}
        selectionColor={colors.ground}
        style={styles.input}
      />
      <Pressable
        onPress={send}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={sl.reply.sendA11y}
        accessibilityState={{ disabled: !canSend, busy: post.isPending }}
        style={({ pressed }) => [styles.go, !canSend && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Icon name="send" color={colors.ink} />
      </Pressable>
    </View>
    {post.isError && (
      <Text variant="meta" color={colors.urgent} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
        {sl.reply.error}
      </Text>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 12 },
  input: {
    flex: 1,
    minHeight: size.reply,
    maxHeight: 160,
    borderRadius: size.reply / 2,
    backgroundColor: colors.sheetFill,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    fontFamily: font.regular,
    fontSize: 20,
    lineHeight: 26,
    color: colors.sheetInk,
  },
  go: {
    width: size.reply,
    height: size.reply,
    borderRadius: size.reply / 2,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

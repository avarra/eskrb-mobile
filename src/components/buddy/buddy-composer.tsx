import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { BUDDY_TEXT_MAX } from '@/data/api';
import { ApiError } from '@/data/http';
import { useSendBuddyText } from '@/data/queries';
import { buddyErrorKey, dative, validateBuddyText } from '@/domain/buddy';
import { useDictation } from '@/lib/dictation';
import { colors, font, size } from '@/theme/tokens';

import { SheetButton } from './sheet-buttons';

export type ComposerHandle = { focus: () => void; prefill: (text: string) => void };

type Props = {
  buddyName: string;
  /** Opens the cheer sheet. */
  onGreet: () => void;
  /** Nudge state: only "Pozdrav" and "Napiši" until the patient chooses to write. */
  collapsed?: boolean;
  ref?: Ref<ComposerHandle>;
};

/**
 * The 64 px field with the microphone inside it, then "Pozdrav" (tonal) and "Pošlji" (solid). Dictation is the note
 * screen's (Soniox, device fallback): only the confirmed text is sent, as `source: 'dictated'` if any of it was spoken.
 */
export function BuddyComposer({ buddyName, onGreet, collapsed, ref }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(!collapsed);
  const input = useRef<TextInputInstance>(null);
  const [dictated, setDictated] = useState(false);
  const dictation = useDictation(text, setText);
  const send = useSendBuddyText();

  const listening = dictation.state === 'listening';
  const micVisible = dictation.state === 'idle' || listening;

  useImperativeHandle(ref, () => ({
    focus: () => {
      setOpen(true);
      setTimeout(() => input.current?.focus(), 50);
    },
    prefill: (t: string) => {
      setOpen(true);
      setText((cur) => cur || t);
    },
  }));

  const check = validateBuddyText(text);
  const canSend = check === 'ok' && !listening && !send.isPending;
  const length = text.trim().length;

  const submit = () => {
    if (!canSend) return;
    const source = dictated ? 'dictated' : 'typed';
    send.mutate(
      { text, source },
      {
        onSuccess: () => {
          setText('');
          setDictated(false);
        },
      },
    );
  };

  const errorKey = send.error ? buddyErrorKey(send.error instanceof ApiError ? send.error.status : undefined, send.error instanceof ApiError ? send.error.detail : undefined) : null;
  const message =
    check === 'link' ? sl.buddy.errors.link : check === 'tooLong' ? sl.buddy.errors.tooLong : errorKey ? sl.buddy.errors[errorKey] : dictation.error ? sl.note.dictationError : null;
  const hint = listening ? `${sl.buddy.composer.listening} ${sl.buddy.composer.tapToStop}` : dictated && length ? sl.buddy.composer.dictated : null;
  const showMeta = listening || length > 0;

  if (!open) {
    return (
      <View style={[styles.btns, { paddingTop: 4 }]}>
        <SheetButton variant="tonal" icon="wave" label={sl.buddy.composer.greet} onPress={onGreet} style={styles.flex} />
        <SheetButton
          variant="tonal"
          icon="kbd"
          label={sl.buddy.composer.write}
          onPress={() => {
            setOpen(true);
            setTimeout(() => input.current?.focus(), 50);
          }}
          style={styles.flex}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showMeta && (
        <View style={styles.meta}>
          <Text variant="meta" color={colors.sheetInk2} style={{ flex: 1, fontSize: 16, lineHeight: 21 }}>
            {hint ?? ''}
          </Text>
          <Text
            variant="meta"
            color={length > BUDDY_TEXT_MAX ? colors.urgent : colors.sheetInk2}
            style={{ fontSize: 16, lineHeight: 21 }}
            accessibilityLabel={sl.buddy.composer.counterA11y(length, BUDDY_TEXT_MAX)}
          >
            {sl.buddy.composer.counter(length, BUDDY_TEXT_MAX)}
          </Text>
        </View>
      )}
      <View style={[styles.field, listening && styles.fieldListening]}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          placeholder={sl.buddy.composer.placeholder(dative(buddyName))}
          placeholderTextColor={colors.sheetInk2}
          accessibilityLabel={sl.buddy.composer.fieldA11y}
          multiline
          maxLength={BUDDY_TEXT_MAX + 50}
          selectionColor={colors.ground}
          style={styles.input}
        />
        {micVisible && (
          <Pressable
            onPress={() => {
              if (listening) return dictation.stop();
              setDictated(true);
              void dictation.start();
            }}
            accessibilityRole="button"
            accessibilityLabel={listening ? sl.buddy.composer.stopA11y : sl.buddy.composer.dictateA11y}
            style={({ pressed }) => [styles.mic, listening && styles.micOn, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            {listening ? <Icon name="stop" color={colors.ink} /> : <Icon name="mic" color={colors.ground} />}
          </Pressable>
        )}
      </View>
      {message && (
        <Text variant="meta" color={colors.urgent} accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
      <View style={styles.btns}>
        <SheetButton variant="tonal" icon="wave" label={sl.buddy.composer.greet} onPress={onGreet} style={styles.flex} />
        <SheetButton variant="solid" label={sl.buddy.composer.send} onPress={submit} disabled={!canSend} busy={send.isPending} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: -4 },
  field: {
    minHeight: size.reply,
    borderRadius: size.reply / 2,
    backgroundColor: colors.sheetFill,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 22,
    paddingRight: 8,
    paddingVertical: 8,
  },
  fieldListening: { backgroundColor: colors.sheet, boxShadow: `inset 0px 0px 0px 3px ${colors.today}, 0px 0px 0px 1.5px ${colors.hairline}` },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 150,
    paddingTop: 11,
    paddingBottom: 9,
    fontFamily: font.regular,
    fontSize: 20,
    lineHeight: 26,
    color: colors.sheetInk,
  },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    boxShadow: '0px 4px 10px -6px rgba(12,33,69,0.4)',
  },
  micOn: { backgroundColor: colors.ground },
  btns: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});

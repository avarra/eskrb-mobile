import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputInstance } from 'react-native';

import { sl } from '@/copy/sl';
import { colors, font, radius } from '@/theme/tokens';

/** The server accepts at most 2000 characters for a text answer. */
const MAX = 2000;

/** A free-text protocol question (e.g. "anything else?"), styled like the note card. Blank text counts as unanswered. */
export function TextQuestion({ value, onChange, onClear, label }: {
  value: string | undefined;
  onChange: (text: string) => void;
  onClear: () => void;
  label: string;
}) {
  const input = useRef<TextInputInstance>(null);
  const [text, setText] = useState(value ?? '');
  const [focused, setFocused] = useState(false);

  const change = (t: string) => {
    setText(t);
    // The server rejects blank text; an empty field is an unanswered (skippable) question.
    if (t.trim()) onChange(t);
    else onClear();
  };

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={[styles.card, focused && styles.cardFocused]}>
      <TextInput
        ref={input}
        value={text}
        onChangeText={change}
        multiline
        maxLength={MAX}
        placeholder={sl.checkin.textPlaceholder}
        placeholderTextColor={colors.sheetInk2}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        selectionColor={colors.ground}
        cursorColor={colors.ground}
        style={styles.input}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 180, backgroundColor: colors.sheet, borderRadius: radius.card, paddingVertical: 22, paddingHorizontal: 24 },
  cardFocused: { boxShadow: `inset 0px 0px 0px 3px ${colors.today}` },
  input: { fontFamily: font.regular, fontSize: 22, lineHeight: 30, color: colors.sheetInk, minHeight: 120, textAlignVertical: 'top', padding: 0 },
});

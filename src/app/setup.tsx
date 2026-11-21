import { router } from 'expo-router';
import { useState } from 'react';
import { DataScanner } from 'react-native-data-scanner';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { useSignIn } from '@/data/queries';
import { colors, font, radius, size } from '@/theme/tokens';

/** Sign-in: the ward hands the patient an access code, typed or pasted here, or scanned as a QR code. */
export default function Setup() {
  const signIn = useSignIn();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [scanError, setScanError] = useState(false);
  const canSubmit = code.trim().length > 0 && !signIn.isPending;

  const submit = () => {
    if (!canSubmit) return;
    signIn.mutate(code, { onSuccess: () => router.replace('/') });
  };

  // The platform's own one-shot scanner (VisionKit on iOS, Google code scanner on Android); the QR holds the token.
  const scan = async () => {
    setScanError(false);
    signIn.reset();
    let value: string;
    try {
      value = (await DataScanner.scanBarcode({ targetFormats: ['qr'] })).value;
    } catch (e) {
      // Closing the scanner rejects too; only say something when scanning can't work here.
      if (!/cancel/i.test(String(e))) setScanError(true);
      return;
    }
    signIn.mutate(value, { onSuccess: () => router.replace('/') });
  };

  const error = signIn.error
    ? (sl.setup.errors[signIn.error.message] ?? sl.setup.errors.network)
    : scanError
      ? sl.setup.scanUnavailable
      : null;

  return (
    <Screen>
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text variant="question" accessibilityRole="header" style={{ marginTop: 28 }}>
          {sl.setup.title}
        </Text>
        <Text variant="body" color={colors.ink2} style={{ marginTop: 8 }}>
          {sl.setup.hint}
        </Text>

        <Text variant="bodyStrong" style={{ marginTop: 32 }} nativeID="codeLabel">
          {sl.setup.codeLabel}
        </Text>
        <TextInput
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setScanError(false);
            if (signIn.isError) signIn.reset();
          }}
          placeholder={sl.setup.codePlaceholder}
          placeholderTextColor={colors.sheetInk2}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          secureTextEntry
          returnKeyType="go"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={submit}
          accessibilityLabel={sl.setup.codeLabel}
          accessibilityLabelledBy="codeLabel"
          style={[styles.input, focused && styles.inputFocused]}
        />
        {error && (
          <Text variant="body" color={colors.today} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <PillButton label={sl.setup.scan} variant="tonal" onPress={scan} disabled={signIn.isPending} style={{ marginTop: 28 }} />

        <View style={{ flexGrow: 1, minHeight: 32 }} />
        <PillButton
          variant="solid"
          label={sl.setup.signIn}
          accessibilityLabel={sl.setup.signInA11y}
          onPress={submit}
          disabled={!canSubmit}
          busy={signIn.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 10,
    minHeight: size.pill,
    borderRadius: radius.pill,
    backgroundColor: colors.sheet,
    paddingHorizontal: 24,
    fontFamily: font.regular,
    fontSize: 21,
    color: colors.sheetInk,
  },
  inputFocused: { boxShadow: `inset 0px 0px 0px 3px ${colors.today}` },
});

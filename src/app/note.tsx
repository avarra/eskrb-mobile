import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { Icon } from '@/components/icon';
import { Orb, Rings } from '@/components/orb';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import { useEpisode, usePostLog } from '@/data/queries';
import { useDictation } from '@/lib/dictation';
import { pendingPhoto, usePendingPhoto } from '@/lib/pending-photo';
import { colors, font, radius, size } from '@/theme/tokens';

/** Quick log: one editable text field, on-device dictation, an optional wound photo. Text only; no audio. */
export default function Note() {
  const { data: me } = useEpisode();
  const post = usePostLog();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const dictation = useDictation(text, setText);
  const listening = dictation.state === 'listening';
  const micVisible = dictation.state === 'idle' || listening;

  // The photo lives in a tiny store so the camera modal can hand it back; cleared when the note closes.
  const photo = usePendingPhoto();
  const setPhoto = pendingPhoto.set;
  useEffect(() => () => pendingPhoto.set(null), []);

  const pickPhoto = () => {
    Alert.alert(sl.note.photoSource, undefined, [
      { text: sl.note.takePhoto, onPress: () => router.push('/camera') },
      {
        text: sl.note.fromGallery,
        onPress: async () => {
          // iOS cannot present the picker while the alert is still animating away.
          await new Promise((resolve) => setTimeout(resolve, 450));
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false });
          if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
        },
      },
      ...(photo ? [{ text: sl.note.removePhoto, style: 'destructive' as const, onPress: () => setPhoto(null) }] : []),
      { text: sl.common.cancel, style: 'cancel' as const },
    ]);
  };

  const toggleMic = () => {
    if (listening) {
      dictation.stop();
    } else {
      input.current?.blur();
      dictation.start();
    }
  };

  const trimmed = text.trim();
  const canSend = !!me && (trimmed.length > 0 || !!photo) && !listening;
  const send = () => {
    if (!me || !canSend) return;
    post.mutate(
      {
        episodeId: me.episode.id,
        input: { text: trimmed || null, source: trimmed ? (dictation.usedDictation ? 'dictated' : 'typed') : null, photoUri: photo },
      },
      {
        onSuccess: (r) => {
          const reason = r.flags.find((f) => f.severity === 'urgent')?.ruleId ?? '';
          router.replace({ pathname: '/result', params: { action: r.patientAction, kind: 'log', reason } });
        },
      },
    );
  };

  const fieldLabel = listening ? sl.note.listening : dictation.usedDictation ? sl.note.dictated : null;
  const errorText = dictation.error === 'denied' ? sl.note.micDenied : dictation.error === 'failed' ? sl.note.dictationError : null;

  return (
    <Screen>
      <TopBar kind="close" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => input.current?.focus()}
            accessible={false}
            style={[styles.card, (focused || listening) && styles.cardFocused]}
          >
            {fieldLabel && (
              <Text variant="meta" color={colors.sheetInk2} accessibilityLiveRegion="polite" style={{ marginBottom: 10 }}>
                {fieldLabel}
              </Text>
            )}
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              multiline
              editable={!listening}
              placeholder={sl.note.placeholder}
              placeholderTextColor={colors.sheetInk2}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              accessibilityLabel={sl.note.fieldA11y}
              selectionColor={colors.ground}
              cursorColor={colors.ground}
              style={styles.input}
            />
            {photo && (
              <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={`${sl.note.photoA11y}. ${sl.note.changePhoto}`}>
                <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
              </Pressable>
            )}
          </Pressable>
          {errorText && (
            <Text variant="body" color={colors.today} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
              {errorText}
            </Text>
          )}

          <View style={{ flexGrow: 1, minHeight: 24 }} />
          {micVisible && (
            <Rings size={300}>
              <Orb
                diameter={size.recordOrb}
                onPress={toggleMic}
                accessibilityLabel={listening ? sl.note.stopA11y : sl.note.dictateA11y}
              >
                <Icon name={listening ? 'stop' : 'mic'} size={56} color={colors.ground} />
                <Text variant="body" color={colors.sheetInk2} maxFontSizeMultiplier={1.2} style={{ fontFamily: font.regular }}>
                  {listening ? sl.note.stop : sl.note.dictate}
                </Text>
              </Orb>
            </Rings>
          )}
          <View style={{ flexGrow: 1, minHeight: 24 }} />
        </ScrollView>
        {post.isError && (
          <Text variant="body" color={colors.today} style={{ marginBottom: 12 }}>
            {sl.note.error}
          </Text>
        )}
        <View style={{ gap: 12, marginTop: 8 }}>
          <PillButton label={photo ? sl.note.changePhoto : sl.note.addPhoto} icon="cam" onPress={pickPhoto} />
          <PillButton variant="solid" label={sl.common.send} onPress={send} disabled={!canSend} busy={post.isPending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    minHeight: 200,
    backgroundColor: colors.sheet,
    borderRadius: radius.card,
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  cardFocused: { boxShadow: `inset 0px 0px 0px 3px ${colors.today}` },
  input: {
    fontFamily: font.regular,
    fontSize: 24,
    lineHeight: 34,
    color: colors.sheetInk,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 0,
  },
  photo: { marginTop: 16, width: 96, height: 96, borderRadius: radius.thumb },
});

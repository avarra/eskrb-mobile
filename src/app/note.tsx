import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { Icon } from '@/components/icon';
import { Orb, Rings } from '@/components/orb';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import { MAX_LOG_PHOTOS } from '@/data/api';
import { errorDetail } from '@/data/http';
import { useEpisode, usePostLog } from '@/data/queries';
import { useDictation } from '@/lib/dictation';
import { usePhotoPicker } from '@/lib/photo-picker';
import { colors, font, radius, size } from '@/theme/tokens';

/** Quick log: one editable text field, live dictation (Soniox, else on-device), up to five wound photos. Only text is saved or sent to us. */
export default function Note() {
  const { data: me } = useEpisode();
  const post = usePostLog();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const dictation = useDictation(text, setText);
  const listening = dictation.state === 'listening';
  const micVisible = dictation.state === 'idle' || listening;

  const [photos, setPhotos] = useState<string[]>([]);
  const room = MAX_LOG_PHOTOS - photos.length;
  const pickPhoto = usePhotoPicker({
    limit: room,
    onPicked: (uris) => setPhotos((p) => [...p, ...uris].slice(0, MAX_LOG_PHOTOS)),
  });
  const removePhoto = (uri: string) =>
    Alert.alert(sl.note.removePhotoConfirm, undefined, [
      { text: sl.note.removePhoto, style: 'destructive', onPress: () => setPhotos((p) => p.filter((x) => x !== uri)) },
      { text: sl.common.cancel, style: 'cancel' },
    ]);

  const toggleMic = () => {
    if (listening) {
      dictation.stop();
    } else {
      input.current?.blur();
      dictation.start();
    }
  };

  const trimmed = text.trim();
  const canSend = !!me && (trimmed.length > 0 || photos.length > 0) && !listening;
  const send = () => {
    if (!me || !canSend) return;
    post.mutate(
      {
        episodeId: me.episode.id,
        input: { text: trimmed || null, source: trimmed ? (dictation.usedDictation ? 'dictated' : 'typed') : null, photoUris: photos },
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
  const errorText =
    dictation.error === 'denied'
      ? sl.note.micDenied
      : dictation.error === 'offline'
        ? sl.note.dictationOffline
        : dictation.error === 'failed'
          ? sl.note.dictationError
          : null;

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
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} keyboardShouldPersistTaps="handled">
                {photos.map((uri, i) => (
                  <Pressable
                    key={uri}
                    onPress={() => removePhoto(uri)}
                    accessibilityRole="button"
                    accessibilityLabel={`${sl.note.photoA11y} ${i + 1}. ${sl.note.removePhoto}`}
                  >
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>
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
            {errorDetail(post.error, sl.note.error)}
          </Text>
        )}
        <View style={{ gap: 12, marginTop: 8 }}>
          <PillButton
            label={photos.length ? sl.note.photoCount(photos.length, MAX_LOG_PHOTOS) : sl.note.addPhoto}
            icon="cam"
            onPress={pickPhoto}
            disabled={room <= 0}
          />
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
  strip: { gap: 10, marginTop: 16 },
  photo: { width: 96, height: 96, borderRadius: radius.thumb },
});

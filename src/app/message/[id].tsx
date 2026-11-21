import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ReplyBox } from '@/components/reply-box';
import { Reviewed } from '@/components/reviewed';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { STAFF } from '@/config';
import { sl } from '@/copy/sl';
import type { TimelineItem } from '@/data/api';
import { useEpisode, useMarkMessageRead, useTimeline } from '@/data/queries';
import { decimal, relativeWhen, whenLine } from '@/domain/format';
import { colors, radius } from '@/theme/tokens';

/** One staff message, the item it refers to, and a reply box. */
export default function MessageView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useEpisode();
  const { data: timeline } = useTimeline(me?.episode.id);
  const markRead = useMarkMessageRead();

  const msg = timeline?.items.find((i): i is Extract<TimelineItem, { kind: 'message' }> => i.kind === 'message' && i.message.id === id)?.message;
  const ref = msg?.refId
    ? timeline?.items.find((i) => (i.kind === 'checkin' && i.checkIn.id === msg.refId) || (i.kind === 'log' && i.log.id === msg.refId))
    : undefined;

  const unread = !!msg && !msg.readAt;
  const { mutate: mark } = markRead;
  useEffect(() => {
    if (unread && id) mark(id);
  }, [unread, id, mark]);

  const when = msg ? relativeWhen(msg.createdAt) : null;

  return (
    <Screen padBottom={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.header}>
          <Avatar initials={STAFF.initials} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="title" style={{ fontSize: 28, lineHeight: 32 }} accessibilityRole="header">
              {msg?.fromName ?? STAFF.name}
            </Text>
            {when && (
              <Text variant="meta" color={colors.ink2}>
                {sl.message.ward(STAFF.ward, sl.common.at(when.day, when.time))}
              </Text>
            )}
          </View>
        </View>
        <Sheet>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="letter" color={colors.sheetInk} style={{ marginTop: 14 }}>
              {msg?.body ?? ''}
            </Text>
            {ref && (
              <View style={styles.ref} accessible accessibilityLabel={sl.message.refersTo}>
                {ref.kind === 'log' && ref.log.mediaUrl ? (
                  <Image source={{ uri: ref.log.mediaUrl }} style={styles.thumb} contentFit="cover" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" color={colors.sheetInk}>
                    {ref.kind === 'checkin' ? sl.notes.checkIn : ref.kind === 'log' && ref.log.type === 'photo' ? sl.notes.photo : sl.notes.log}
                  </Text>
                  <Text variant="meta" color={colors.sheetInk2}>
                    {ref.kind === 'checkin'
                      ? [whenLine(ref.checkIn.createdAt), typeof ref.checkIn.answers.temperature === 'number' ? `${decimal(ref.checkIn.answers.temperature)} °C` : null]
                          .filter(Boolean)
                          .join(' · ')
                      : ref.kind === 'log'
                        ? whenLine(ref.log.createdAt)
                        : ''}
                  </Text>
                  {((ref.kind === 'checkin' && ref.checkIn.reviewedAt) || (ref.kind === 'log' && ref.log.reviewedAt)) && <Reviewed />}
                </View>
              </View>
            )}
          </ScrollView>
          {me && <ReplyBox episodeId={me.episode.id} onSent={() => router.replace('/notes')} />}
        </Sheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, marginBottom: 24 },
  ref: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.hairline,
    marginTop: 24,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.thumb },
});

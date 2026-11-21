import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Reviewed } from '@/components/reviewed';
import { Text } from '@/components/text';
import { STAFF } from '@/config';
import { sl } from '@/copy/sl';
import type { CheckIn, Log, Message, TimelineItem } from '@/data/api';
import { decimal, relativeWhen, whenLine } from '@/domain/format';
import { colors, radius } from '@/theme/tokens';

export function TimelineEntry({ item, first }: { item: TimelineItem; first?: boolean }) {
  return (
    <View style={[styles.ev, first && { paddingTop: 10 }]}>
      {item.kind === 'message' && <MessageEntry m={item.message} />}
      {item.kind === 'checkin' && <CheckInEntry c={item.checkIn} />}
      {item.kind === 'log' && <LogEntry l={item.log} />}
    </View>
  );
}

function MessageEntry({ m }: { m: Message }) {
  const staff = m.fromUserId === STAFF.id;
  const { day, time } = relativeWhen(m.createdAt);
  return (
    <View>
      <View style={styles.row}>
        {staff ? <Avatar initials={STAFF.initials} size={32} /> : null}
        <Text variant="meta" color={colors.sheetInk2} style={{ flex: 1 }}>
          {`${staff ? m.fromName : sl.notes.you} · ${day} ${time}`}
        </Text>
      </View>
      <Text variant="body" color={colors.sheetInk} style={{ fontSize: 21, lineHeight: 29, marginTop: 8 }}>
        {m.body}
      </Text>
    </View>
  );
}

function CheckInEntry({ c }: { c: CheckIn }) {
  const pain = typeof c.answers.pain === 'number' ? c.answers.pain : null;
  const temp = typeof c.answers.temperature === 'number' ? c.answers.temperature : null;
  const meta = [whenLine(c.createdAt), temp !== null ? `${decimal(temp)} °C` : null].filter(Boolean).join(' · ');
  return (
    <View>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Text variant="entryTitle" color={colors.sheetInk}>
          {sl.notes.checkIn}
        </Text>
        {pain !== null && (
          <View style={styles.chip}>
            <Text variant="meta" color={colors.heatChipInk} style={styles.chipText}>
              {sl.notes.painChip(pain)}
            </Text>
          </View>
        )}
      </View>
      <Text variant="meta" color={colors.sheetInk2}>
        {meta}
      </Text>
      {c.reviewedAt && <Reviewed />}
    </View>
  );
}

function LogEntry({ l }: { l: Log }) {
  return (
    <View style={styles.row}>
      {l.mediaUrl && <Image source={{ uri: l.mediaUrl }} style={styles.thumb} contentFit="cover" accessibilityLabel={sl.notes.photo} />}
      <View style={{ flex: 1 }}>
        <Text variant="entryTitle" color={colors.sheetInk}>
          {l.type === 'photo' ? sl.notes.photo : sl.notes.log}
        </Text>
        {l.text ? (
          <Text variant="meta" color={colors.sheetInk2}>
            {`»${l.text}«`}
          </Text>
        ) : null}
        <Text variant="meta" color={colors.sheetInk2}>
          {whenLine(l.createdAt)}
        </Text>
        {l.reviewedAt && <Reviewed />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ev: { paddingVertical: 18, borderBottomWidth: 1.5, borderBottomColor: colors.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { backgroundColor: colors.heatChipBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 3 },
  chipText: { fontSize: 16, lineHeight: 22, fontFamily: 'Lexend_600SemiBold' },
  thumb: { width: 64, height: 64, borderRadius: radius.thumb, alignSelf: 'flex-start', marginTop: 4 },
});

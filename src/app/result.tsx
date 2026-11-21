import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { DayRing } from '@/components/day-ring';
import { Icon } from '@/components/icon';
import { Orb, Rings } from '@/components/orb';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { EMERGENCY_NUMBER, WARD_PHONE } from '@/config';
import { sl } from '@/copy/sl';
import { patientAction } from '@/data/api';
import { useEpisode } from '@/data/queries';
import { colors, font, size, space } from '@/theme/tokens';

/** Driven only by `patientAction`. */
export default function Result() {
  const params = useLocalSearchParams<{ action?: string; kind?: string; reason?: string }>();
  const parsed = patientAction.safeParse(params.action);
  const action = parsed.success ? parsed.data : 'none';
  const kind = params.kind === 'log' ? 'log' : 'checkin';

  switch (action) {
    case 'call_112':
      return <Urgent reason={params.reason ?? ''} />;
    case 'contact_team':
      return <TeamNotified />;
    case 'none':
      return <Thanks kind={kind} />;
  }
}

function goHome() {
  router.dismissTo('/');
}

function Thanks({ kind }: { kind: 'checkin' | 'log' }) {
  const { data: me } = useEpisode();
  const { width } = useWindowDimensions();
  const ring = Math.min(260, width - space.side * 2);
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        {me && (
          <DayRing day={me.dayNumber} total={me.protocol.durationDays} todayDone={me.todayCheckInDone} size={ring} celebrate={kind === 'checkin'}>
            <Icon name="check" size={72} color={colors.ink} strokeWidth={2.2} />
          </DayRing>
        )}
        <Text variant="urgentTitle" accessibilityRole="header" style={{ marginTop: 32 }}>
          {sl.result.thanksTitle}
        </Text>
        <Text variant="quote" color={colors.ink2} style={{ marginTop: 12 }}>
          {kind === 'checkin' ? sl.result.thanksBody : sl.result.noteThanksBody}
        </Text>
        <View style={{ flexGrow: 1, minHeight: 24 }} />
      </ScrollView>
      <View style={{ gap: 12 }}>
        <PillButton label={sl.result.seeNotes} onPress={() => router.replace('/notes')} />
        <PillButton variant="solid" label={sl.result.home} onPress={goHome} />
      </View>
    </Screen>
  );
}

function TeamNotified() {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text variant="urgentTitle" accessibilityRole="header" style={{ marginTop: 28 }}>
          {sl.result.teamTitle}
        </Text>
        <Text variant="quote" color={colors.ink2} style={{ marginTop: 16 }}>
          {sl.result.teamBody}
        </Text>
        <View style={{ flexGrow: 1, minHeight: 32 }} />
        <Rings size={300}>
          <Orb diameter={size.recordOrb} onPress={() => Linking.openURL(`tel:${WARD_PHONE}`)} accessibilityLabel={sl.result.callWardA11y}>
            <Icon name="phone" size={44} color={colors.ground} />
            <Text variant="bodyStrong" color={colors.ground} align="center" maxFontSizeMultiplier={1.2}>
              {sl.result.callWard}
            </Text>
          </Orb>
        </Rings>
        <View style={{ flexGrow: 1, minHeight: 32 }} />
      </ScrollView>
      <PillButton variant="solid" label={sl.result.home} onPress={goHome} />
    </Screen>
  );
}

function Urgent({ reason }: { reason: string }) {
  const text = sl.result.urgentReasons[reason] ?? sl.result.urgentReasons.fallback;
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    AccessibilityInfo.announceForAccessibility(`${sl.result.urgentTitle} ${text}`);
  }, [text]);
  return (
    <Screen variant="urgent">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text variant="urgentTitle" accessibilityRole="header" style={{ marginTop: 28 }}>
          {sl.result.urgentTitle}
        </Text>
        <Text variant="quote" style={{ fontSize: 22, lineHeight: 31, marginTop: 16 }}>
          {text}
        </Text>
        <View style={{ flexGrow: 1, minHeight: 32 }} />
        <Rings size={320}>
          <Orb
            diameter={size.urgentOrb}
            tone="urgent"
            onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
            accessibilityLabel={sl.result.urgentCallA11y}
          >
            <Icon name="phone" size={44} color={colors.urgent} />
            <Text
              variant="title"
              color={colors.urgent}
              maxFontSizeMultiplier={1}
              style={{ fontFamily: font.bold, fontSize: 60, lineHeight: 66, letterSpacing: -1 }}
            >
              {sl.result.urgentCall}
            </Text>
          </Orb>
        </Rings>
        <View style={{ flexGrow: 1, minHeight: 32 }} />
        <Text variant="body" align="center" style={styles.team}>
          {sl.result.urgentTeam}
        </Text>
      </ScrollView>
      <PillButton variant="outline" label={sl.result.urgentBack} onPress={goHome} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  team: { fontSize: 19, lineHeight: 27 },
});

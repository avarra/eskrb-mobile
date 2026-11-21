import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { subDays } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { kneeReplacement } from '@/data/protocol';
import { useCreateEpisode } from '@/data/queries';
import { isoDay } from '@/domain/day';
import { fullDate } from '@/domain/format';
import { colors, font, radius, size, space } from '@/theme/tokens';

type Choice = 'today' | 'yesterday' | 'picked';

export default function Setup() {
  const insets = useSafeAreaInsets();
  const create = useCreateEpisode();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [picked, setPicked] = useState<Date>(() => subDays(new Date(), 2));
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  const today = new Date();
  const minDate = subDays(today, kneeReplacement.durationDays);
  const surgery = choice === 'today' ? today : choice === 'yesterday' ? subDays(today, 1) : choice === 'picked' ? picked : null;
  const canStart = !!surgery && name.trim().length > 0;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: picked,
        mode: 'date',
        maximumDate: today,
        minimumDate: minDate,
        onValueChange: (_e, date) => {
          setPicked(date);
          setChoice('picked');
        },
      });
    } else {
      setIosPickerOpen(true);
    }
  };

  const start = () => {
    if (!surgery || !canStart) return;
    create.mutate(
      { patientName: name.trim(), startDate: isoDay(surgery) },
      { onSuccess: () => router.replace('/') },
    );
  };

  return (
    <Screen>
        <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text variant="question" accessibilityRole="header" style={{ marginTop: 28 }}>
            {sl.setup.title}
          </Text>
          <Text variant="body" color={colors.ink2} style={{ marginTop: 8 }}>
            {sl.setup.hint}
          </Text>

          <View style={styles.choices} accessibilityRole="radiogroup">
            <Option label={sl.setup.today} selected={choice === 'today'} onPress={() => setChoice('today')} />
            <Option label={sl.setup.yesterday} selected={choice === 'yesterday'} onPress={() => setChoice('yesterday')} />
            <Option
              label={choice === 'picked' ? fullDate(picked) : sl.setup.pickDate}
              selected={choice === 'picked'}
              onPress={openPicker}
            />
          </View>

          <Text variant="bodyStrong" style={{ marginTop: 32 }} nativeID="nameLabel">
            {sl.setup.nameLabel}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={sl.setup.namePlaceholder}
            placeholderTextColor={colors.sheetInk2}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="done"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            onSubmitEditing={start}
            accessibilityLabel={sl.setup.nameLabel}
            accessibilityLabelledBy="nameLabel"
            style={[styles.input, nameFocused && styles.inputFocused]}
          />

          <View style={{ flexGrow: 1, minHeight: 32 }} />
          <PillButton
            variant="solid"
            label={sl.setup.start}
            accessibilityLabel={sl.setup.startA11y}
            onPress={start}
            disabled={!canStart}
            busy={create.isPending}
          />
        </ScrollView>

      {Platform.OS === 'ios' && (
        <Modal visible={iosPickerOpen} transparent animationType="slide" onRequestClose={() => setIosPickerOpen(false)}>
          <View style={styles.backdrop}>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]}>
              <DateTimePicker
                value={picked}
                mode="date"
                display="inline"
                locale="sl-SI"
                maximumDate={today}
                minimumDate={minDate}
                accentColor={colors.ground}
                themeVariant="light"
                onValueChange={(_e, date) => setPicked(date)}
              />
              <PillButton
                variant="solid"
                label={sl.setup.datePickerDone}
                onPress={() => {
                  setChoice('picked');
                  setIosPickerOpen(false);
                }}
                style={{ backgroundColor: colors.ground }}
                solidInk={colors.ink}
              />
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PillButton
      label={label}
      onPress={onPress}
      variant={selected ? 'solid' : 'tonal'}
      selected={selected}
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  choices: { gap: 12, marginTop: 28 },
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,33,69,0.45)' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.l,
    paddingTop: space.l,
    gap: space.m,
  },
});

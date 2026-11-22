import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { CareNoteCard } from '@/components/care-note-card';
import { PillButton } from '@/components/pill-button';
import { hintFor, initialAnswer, isPain, QuestionView } from '@/components/questions/question-view';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import type { AnswerValue, Answers } from '@/data/api';
import { errorDetail } from '@/data/http';
import { useEpisode, usePostCheckIn } from '@/data/queries';
import { splitPhotoAnswers } from '@/domain/check-in';
import { colors, heatFor } from '@/theme/tokens';

/** The question the backend adds to the protocol when the episode has medication notes. */
const MEDS_QUESTION = 'medsTaken';

/** One question per screen, rendered from the protocol JSON. */
export default function CheckIn() {
  const { data: me } = useEpisode();
  const post = usePostCheckIn();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  if (!me) return <Screen>{null}</Screen>;
  const questions = me.protocol.questions;
  const q = questions[step];
  const total = questions.length;
  const last = step === total - 1;
  const meds = me.notes.filter((n) => n.kind === 'medication');
  const value: AnswerValue | undefined = answers[q.id] ?? initialAnswer(q);
  const answered = value !== undefined;
  // The server rejects a check-in that leaves out a `required: true` question; only explicitly optional ones may be skipped.
  const canSkip = !answered && q.required === false;

  const wash = q.type === 'scale' && isPain(q) && typeof value === 'number' ? heatFor(value - q.min, q.max - q.min).wash : null;

  const back = () => (step === 0 ? router.back() : setStep(step - 1));
  const next = () => {
    if (!answered && !canSkip) return;
    const all = { ...answers };
    if (value === undefined) delete all[q.id];
    else all[q.id] = value;
    setAnswers(all);
    if (!last) {
      setStep(step + 1);
      return;
    }
    post.mutate(
      { episodeId: me.episode.id, input: splitPhotoAnswers(questions, all) },
      {
        onSuccess: (r) => {
          const reason = r.flags.find((f) => f.severity === 'urgent')?.ruleId ?? '';
          router.replace({ pathname: '/result', params: { action: r.patientAction, kind: 'checkin', reason } });
        },
      },
    );
  };

  return (
    <Screen wash={wash}>
      <TopBar onBack={back} right={sl.common.stepOf(step + 1, total)} rightA11y={`Vprašanje ${step + 1} od ${total}`} />
      {/* Keeps a text question's field and the Next button above the keyboard. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ marginHorizontal: -24 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        key={q.id}
      >
        <Text variant="question" accessibilityRole="header" style={{ marginTop: 20, marginBottom: 8 }}>
          {q.text}
        </Text>
        <Text variant="body" color={colors.ink2}>
          {hintFor(q)}
        </Text>
        {/* The server adds `medsTaken` only when the episode has medication notes: show them so the patient can check. */}
        {q.id === MEDS_QUESTION && meds.length > 0 && (
          <View style={{ gap: 10, marginTop: 16 }}>
            <Text variant="meta" color={colors.ink2}>
              {sl.instructions.medsHint}
            </Text>
            {meds.map((n) => (
              <CareNoteCard key={n.id} note={n} />
            ))}
          </View>
        )}
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        <QuestionView
          question={q}
          value={value}
          onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          onClear={() => setAnswers(({ [q.id]: _, ...rest }) => rest)}
        />
        <View style={{ height: 36 }} />
      </ScrollView>
      {post.isError && (
        <Text variant="body" color={colors.today} style={{ marginBottom: 12 }} accessibilityLiveRegion="polite">
          {errorDetail(post.error, sl.checkin.error)}
        </Text>
      )}
      <PillButton
        variant="solid"
        label={canSkip && !last ? sl.checkin.skip : last ? sl.checkin.submit : sl.common.next}
        onPress={next}
        disabled={!answered && !canSkip}
        busy={post.isPending}
      />
      </KeyboardAvoidingView>
    </Screen>
  );
}

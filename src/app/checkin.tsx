import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { hintFor, initialAnswer, isPain, QuestionView } from '@/components/questions/question-view';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import type { AnswerValue, Answers } from '@/data/api';
import { useEpisode, usePostCheckIn } from '@/data/queries';
import { colors, heatFor } from '@/theme/tokens';

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
  const value: AnswerValue | undefined = answers[q.id] ?? initialAnswer(q);
  const answered = value !== undefined;

  const wash = q.type === 'scale' && isPain(q) && typeof value === 'number' ? heatFor(value - q.min, q.max - q.min).wash : null;

  const back = () => (step === 0 ? router.back() : setStep(step - 1));
  const next = () => {
    if (!answered) return;
    const all = { ...answers, [q.id]: value };
    setAnswers(all);
    if (!last) {
      setStep(step + 1);
      return;
    }
    post.mutate(
      { episodeId: me.episode.id, answers: all },
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
      <ScrollView
        style={{ marginHorizontal: -24 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        key={q.id}
      >
        <Text variant="question" accessibilityRole="header" style={{ marginTop: 20, marginBottom: 8 }}>
          {q.text}
        </Text>
        <Text variant="body" color={colors.ink2}>
          {hintFor(q)}
        </Text>
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        <QuestionView question={q} value={value} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        <View style={{ height: 36 }} />
      </ScrollView>
      {post.isError && (
        <Text variant="body" color={colors.today} style={{ marginBottom: 12 }} accessibilityLiveRegion="polite">
          {sl.checkin.error}
        </Text>
      )}
      <PillButton
        variant="solid"
        label={last ? sl.checkin.submit : sl.common.next}
        onPress={next}
        disabled={!answered}
        busy={post.isPending}
      />
    </Screen>
  );
}

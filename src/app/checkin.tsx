import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { hintFor, initialAnswer, isPain, QuestionView } from '@/components/questions/question-view';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { EMERGENCY_NUMBER } from '@/config';
import { sl } from '@/copy/sl';
import type { AnswerValue, Answers, ImmediateAlert, Question } from '@/data/api';
import { errorDetail } from '@/data/http';
import { useEpisode, usePostCheckIn } from '@/data/queries';
import { pruneAnswers, splitPhotoAnswers, triggeredAlert, visibleQuestions } from '@/domain/check-in';
import { colors, heatFor } from '@/theme/tokens';

/** A skip button: the protocol names one (`skipLabel`), or it's the optional free-text question. */
function skipLabelFor(q: Question): string | null {
  if (q.skipLabel) return q.skipLabel;
  return q.type === 'text' && q.required === false ? sl.checkin.skip : null;
}

/**
 * One question per screen, rendered from the protocol JSON. Conditional questions (`showIf`) appear and disappear
 * as answers change; answers to questions no longer asked are dropped before anything is sent.
 */
export default function CheckIn() {
  const { data: me } = useEpisode();
  const post = usePostCheckIn();
  const [answers, setAnswers] = useState<Answers>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  /** Set once a safety-stop option was picked: the questionnaire is over. */
  const [stop, setStop] = useState<ImmediateAlert | null>(null);
  const sent = useRef<Answers>({});

  if (!me) return <Screen>{null}</Screen>;
  const questions = me.protocol.questions;
  const episodeId = me.episode.id;

  const submit = (all: Answers, alert: ImmediateAlert | null) => {
    sent.current = all;
    post.mutate(
      { episodeId, input: splitPhotoAnswers(questions, all) },
      {
        onSuccess: (r) => {
          const reason = r.flags.find((f) => f.severity === 'urgent')?.ruleId ?? '';
          router.replace({
            pathname: '/result',
            params: { action: r.patientAction, kind: 'checkin', reason, alertTitle: alert?.title ?? '', alertText: alert?.text ?? '' },
          });
        },
      },
    );
  };

  if (stop) return <SafetyStop alert={stop} pending={post.isPending} error={post.isError ? errorDetail(post.error, sl.checkin.error) : null} onRetry={() => submit(sent.current, stop)} />;

  const visible = visibleQuestions(questions, answers);
  if (!visible.length) return <Screen>{null}</Screen>;
  const step = Math.max(0, visible.findIndex((x) => x.id === currentId));
  const q = visible[step];
  const total = visible.length;
  const value: AnswerValue | undefined = answers[q.id] ?? initialAnswer(q);
  const answered = value !== undefined;
  const skipLabel = skipLabelFor(q);

  const wash = q.type === 'scale' && isPain(q) && typeof value === 'number' ? heatFor(value - q.min, q.max - q.min).wash : null;

  /** Store (or, when skipped, remove) this answer, then go to the next question still asked, or submit. */
  const advance = (v: AnswerValue | undefined) => {
    const all: Answers = { ...answers };
    if (v === undefined) delete all[q.id];
    else all[q.id] = v;
    const kept = pruneAnswers(questions, all);
    setAnswers(kept);
    const after = visibleQuestions(questions, kept);
    const following = after[after.findIndex((x) => x.id === q.id) + 1];
    if (following) setCurrentId(following.id);
    else submit(kept, null);
  };

  const onChange = (v: AnswerValue) => {
    const alert = triggeredAlert(q, v);
    if (!alert) {
      setAnswers((a) => ({ ...a, [q.id]: v }));
      return;
    }
    // Safety stop: no more questions. Send what we have, up to and including this answer.
    const all = pruneAnswers(questions, { ...answers, [q.id]: v });
    const upTo = new Set(visibleQuestions(questions, all).slice(0, step + 1).map((x) => x.id));
    const partial = Object.fromEntries(Object.entries(all).filter(([id]) => upTo.has(id)));
    setAnswers(partial);
    setStop(alert);
    submit(partial, alert);
  };

  const back = () => (step === 0 ? router.back() : setCurrentId(visible[step - 1].id));
  const last = step === total - 1;

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
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        <QuestionView
          question={q}
          value={value}
          onChange={onChange}
          onClear={() => setAnswers(({ [q.id]: _, ...rest }) => rest)}
        />
        <View style={{ height: 36 }} />
      </ScrollView>
      {post.isError && (
        <Text variant="body" color={colors.today} style={{ marginBottom: 12 }} accessibilityLiveRegion="polite">
          {errorDetail(post.error, sl.checkin.error)}
        </Text>
      )}
      <View style={{ gap: 12 }}>
        {skipLabel && <PillButton label={skipLabel} onPress={() => advance(undefined)} disabled={post.isPending} />}
        <PillButton
          variant="solid"
          label={last ? sl.checkin.submit : sl.common.next}
          onPress={() => answered && advance(value)}
          disabled={!answered}
          busy={post.isPending}
        />
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Shown from the moment a safety-stop option is picked until the server answers (then the result screen takes over). */
function SafetyStop({ alert, pending, error, onRetry }: { alert: ImmediateAlert; pending: boolean; error: string | null; onRetry: () => void }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text variant="urgentTitle" accessibilityRole="header" style={{ marginTop: 28 }}>
          {alert.title}
        </Text>
        <Text variant="quote" color={colors.ink2} style={{ marginTop: 16 }}>
          {alert.text}
        </Text>
        <View style={{ flexGrow: 1, minHeight: 32 }} />
        {pending && (
          <View style={{ alignItems: 'center', gap: 12 }} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={colors.ink} />
            <Text variant="body" align="center">
              {sl.checkin.stopSending}
            </Text>
          </View>
        )}
        {error && (
          <Text variant="body" color={colors.today} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <View style={{ flexGrow: 1, minHeight: 32 }} />
      </ScrollView>
      {/* A failed request must never leave the patient without a way to call. */}
      {error && (
        <View style={{ gap: 12 }}>
          <PillButton label={sl.checkin.stopRetry} onPress={onRetry} />
          <PillButton variant="solid" icon="phone" label={sl.checkin.stopCall} onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)} />
        </View>
      )}
    </Screen>
  );
}

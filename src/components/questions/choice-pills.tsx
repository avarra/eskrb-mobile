import * as Haptics from 'expo-haptics';
import { View } from 'react-native';

import { PillButton } from '@/components/pill-button';

type Option<T> = { value: T; label: string };

/** Full-width tonal pills stacked vertically, 68 tall; the selected one is solid white. */
export function ChoicePills<T extends string | boolean>({ options, value, onChange }: {
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: 12 }} accessibilityRole="radiogroup">
      {options.map((o) => (
        <PillButton
          key={String(o.value)}
          label={o.label}
          variant={value === o.value ? 'solid' : 'tonal'}
          selected={value === o.value}
          onPress={() => {
            onChange(o.value);
            Haptics.selectionAsync();
          }}
        />
      ))}
    </View>
  );
}

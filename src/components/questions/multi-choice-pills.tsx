import * as Haptics from 'expo-haptics';
import { View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { toggleMulti } from '@/domain/check-in';

type Option = { value: string; label: string };

/** Like `ChoicePills`, but several can be on. An exclusive option ("none") stands alone. */
export function MultiChoicePills({ options, exclusive, value, onChange, onClear }: {
  options: readonly Option[];
  exclusive: readonly string[];
  value: readonly string[] | undefined;
  onChange: (v: string[]) => void;
  /** The last selected option was turned off. */
  onClear: () => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {options.map((o) => {
        const on = !!value?.includes(o.value);
        return (
          <PillButton
            key={o.value}
            label={o.label}
            role="checkbox"
            variant={on ? 'solid' : 'tonal'}
            selected={on}
            onPress={() => {
              const next = toggleMulti(value, o.value, exclusive);
              if (next) onChange(next);
              else onClear();
              Haptics.selectionAsync();
            }}
          />
        );
      })}
    </View>
  );
}

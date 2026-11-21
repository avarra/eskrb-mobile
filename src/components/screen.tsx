import { StatusBar } from 'expo-status-bar';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ground } from '@/components/ground';
import { space } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  variant?: 'blue' | 'urgent';
  wash?: string | null;
  /** When false the bottom inset is left to the child (sheets that run to the edge). */
  padBottom?: boolean;
  style?: ViewStyle;
};

/** A full screen on the ground with the mockup's padding: safe-top + 8, 24 sides, safe-bottom + 16. */
export function Screen({ children, variant, wash, padBottom = true, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Ground variant={variant} wash={wash}>
      <StatusBar style="light" />
      <View
        style={[
          {
            flex: 1,
            paddingTop: insets.top + space.s,
            paddingHorizontal: space.side,
            paddingBottom: padBottom ? insets.bottom + space.l : 0,
          },
          style,
        ]}
      >
        {children}
      </View>
    </Ground>
  );
}

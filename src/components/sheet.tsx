import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme/tokens';

/** White sheet with a 32 top radius that runs to the bottom edge. Use inside <Screen padBottom={false}>. */
export function Sheet({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginHorizontal: -space.side,
    paddingHorizontal: space.side,
    paddingTop: space.s,
  },
});

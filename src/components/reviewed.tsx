import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors } from '@/theme/tokens';

export function Reviewed() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <Icon name="check" size={20} color={colors.reviewed} />
      <Text variant="metaStrong" color={colors.reviewed}>
        {sl.common.reviewed}
      </Text>
    </View>
  );
}

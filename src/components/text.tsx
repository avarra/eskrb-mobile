import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, font, type, type TypeRole, type TypeSpec } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeRole;
  color?: string;
  align?: TextStyle['textAlign'];
};

/** Lexend text. Weight comes from the font family, never from fontWeight (Android ignores it for custom fonts). */
export function Text({ variant = 'body', color = colors.ink, align, style, ...rest }: Props) {
  const t: TypeSpec = type[variant];
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: font[t.weight],
          fontSize: t.size,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          color,
          textAlign: align,
        },
        style,
      ]}
    />
  );
}

import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Port of the mockup's SVG sprite: 24×24, stroke 2.4, round caps and joins.
export type IconName = 'mic' | 'cam' | 'phone' | 'back' | 'chev' | 'close' | 'check' | 'send' | 'minus' | 'plus' | 'stop';

const paths: Record<IconName, (color: string) => React.ReactNode> = {
  mic: () => (
    <>
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  cam: () => (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  phone: () => <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  back: () => <Path d="M15 5l-7 7 7 7" />,
  chev: () => <Path d="M9 5l7 7-7 7" />,
  close: () => <Path d="M6 6l12 12M18 6L6 18" />,
  check: () => <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  send: () => <Path d="M5 12h13M13 6l6 6-6 6" />,
  minus: () => <Path d="M5 12h14" />,
  plus: () => <Path d="M5 12h14M12 5v14" />,
  stop: (color) => <Rect x={7} y={7} width={10} height={10} rx={2} fill={color} />,
};

export function Icon({ name, size = 26, color = '#FFFFFF', strokeWidth = 2.4 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      importantForAccessibility="no"
    >
      {paths[name](color)}
    </Svg>
  );
}

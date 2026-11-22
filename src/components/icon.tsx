import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Port of the mockup's SVG sprite: 24×24, stroke 2.4, round caps and joins.
export type IconName =
  | 'mic'
  | 'cam'
  | 'phone'
  | 'back'
  | 'chev'
  | 'close'
  | 'check'
  | 'send'
  | 'minus'
  | 'plus'
  | 'stop'
  | 'flash'
  | 'flashOff'
  | 'flashAuto'
  | 'torch'
  | 'flip'
  | 'timer'
  | 'grid'
  | 'sun'
  | 'lock'
  | 'retake';

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
  flash: () => <Path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  flashOff: () => <Path d="M13 3l-3.2 4.4M8 10.2L5 14h6l-1 7 4.2-5.8M16 11.6l2-1.6h-6l1-7M4 4l16 16" />,
  flashAuto: () => (
    <>
      <Path d="M11 3L4 13h5l-1 7 6-8.5" />
      <Path d="M15 21l2.5-7 2.5 7M15.8 19h3.4" />
    </>
  ),
  torch: () => (
    <>
      <Path d="M8 3h8v4l-2 3v11h-4V10L8 7z" />
      <Path d="M12 13v2" />
    </>
  ),
  flip: () => (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Path d="M9 12.5a3 3 0 0 1 5.2-1.5M15 14.5a3 3 0 0 1-5.2 1.5M14.5 9.5v1.8h-1.8M9.5 17.5v-1.8h1.8" />
    </>
  ),
  timer: () => (
    <>
      <Circle cx={12} cy={13.5} r={7.5} />
      <Path d="M12 9.5v4l2.5 2M10 3h4" />
    </>
  ),
  grid: () => <Path d="M4 4h16v16H4zM9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" />,
  sun: () => (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  lock: () => (
    <>
      <Rect x={5} y={11} width={14} height={10} rx={2} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  retake: () => <Path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />,
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

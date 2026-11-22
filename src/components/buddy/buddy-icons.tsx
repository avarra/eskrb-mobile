import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Icons the buddy screens add to the sprite (design/buddy.html): wave, more, keyboard, and two people for the home entry. Same 24×24 grid and stroke as `Icon`.
export type BuddyIconName = 'wave' | 'more' | 'kbd' | 'pair';

const paths: Record<BuddyIconName, React.ReactNode> = {
  wave: (
    <Path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M7 11l-.6-1.4a1.6 1.6 0 0 0-2.9 1.3L6 16a6 6 0 0 0 5.5 4h.5a6 6 0 0 0 6-6V8.5a1.5 1.5 0 0 0-3 0" />
  ),
  more: (
    <>
      <Circle cx={5} cy={12} r={1.2} />
      <Circle cx={12} cy={12} r={1.2} />
      <Circle cx={19} cy={12} r={1.2} />
    </>
  ),
  pair: (
    <>
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3 19.5a6 6 0 0 1 12 0" />
      <Circle cx={16.5} cy={9} r={2.6} />
      <Path d="M15.8 14.1A5 5 0 0 1 21 19" />
    </>
  ),
  kbd: (
    <>
      <Rect x={3} y={6} width={18} height={12} rx={3} />
      <Path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
    </>
  ),
};

export function BuddyIcon({ name, size = 26, color }: { name: BuddyIconName; size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      importantForAccessibility="no"
    >
      {paths[name]}
    </Svg>
  );
}

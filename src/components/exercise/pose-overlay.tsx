import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import type { FilteredPoint } from '@/domain/exercises/one-euro';
import { LEFT_SHOULDER, LEG, RIGHT_SHOULDER, type Side } from '@/domain/exercises/pose';
import { colors, font } from '@/theme/tokens';

type Props = {
  /**
   * The 33 landmarks already in preview coordinates (VisionCamera did rotation, mirroring and crop),
   * smoothed; null where not visible.
   */
  points: readonly FilteredPoint[];
  width: number;
  height: number;
  highlightSide: Side | null;
  kneeAngle: number | null;
  kneeBent: boolean;
};

type Pt = { x: number; y: number };

/** Hips, legs and feet drawn over the preview, with the tracked knee's angle. */
export function PoseOverlay({ points, width, height, highlightSide, kneeAngle, kneeBent }: Props) {
  if (points.length === 0) return null;

  const at = (i: number): Pt | null => points[i] ?? null;
  const sides: Side[] = ['left', 'right'];
  const accent = kneeBent ? colors.today : colors.ink;

  const bone = (a: Pt | null, b: Pt | null, key: string, strong: boolean) =>
    a && b ? (
      <Line
        key={key}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={strong ? accent : colors.faint}
        strokeWidth={strong ? 6 : 4}
        strokeLinecap="round"
      />
    ) : null;

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      {bone(at(LEFT_SHOULDER), at(LEG.left.hip), 'torso-l', false)}
      {bone(at(RIGHT_SHOULDER), at(LEG.right.hip), 'torso-r', false)}
      {bone(at(LEG.left.hip), at(LEG.right.hip), 'pelvis', false)}
      {sides.map((side) => {
        const leg = LEG[side];
        const strong = side === highlightSide;
        const hip = at(leg.hip);
        const knee = at(leg.knee);
        const ankle = at(leg.ankle);
        const heel = at(leg.heel);
        const toe = at(leg.footIndex);
        return (
          <G key={side}>
            {bone(hip, knee, `${side}-thigh`, strong)}
            {bone(knee, ankle, `${side}-shin`, strong)}
            {bone(ankle, heel, `${side}-heel`, false)}
            {bone(heel, toe, `${side}-foot`, false)}
            {[hip, knee, ankle].map((p, i) =>
              p ? <Circle key={i} cx={p.x} cy={p.y} r={strong ? 9 : 6} fill={strong ? accent : colors.ink2} /> : null,
            )}
            {strong && knee && kneeAngle !== null ? (
              <G>
                {/* Dark copy offset down-right acts as a shadow so the label reads on any background. */}
                <SvgText x={knee.x + 20} y={knee.y + 10} fill="rgba(0,0,0,0.6)" fontSize={28} fontFamily={font.semibold}>
                  {`${Math.round(kneeAngle)}°`}
                </SvgText>
                <SvgText x={knee.x + 18} y={knee.y + 8} fill={accent} fontSize={28} fontFamily={font.semibold}>
                  {`${Math.round(kneeAngle)}°`}
                </SvgText>
              </G>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

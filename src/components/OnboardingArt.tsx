import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import type { M3Roles } from '../theme/material';

/** Flat vector illustrations for the welcome slideshow, drawn from the active theme's colour roles. */
interface ArtProps {
  c: M3Roles;
  accent: string;
}

const VIEW = '0 0 240 200';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid meet">
      {children}
    </Svg>
  );
}

/** Slide 1: a number pad with a filled confirm key under a big amount. */
export function LogArt({ c, accent }: ArtProps) {
  const keys: { x: number; y: number; on?: boolean }[] = [];
  for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) keys.push({ x: 58 + col * 42, y: 74 + r * 40, on: r === 2 && col === 2 });
  return (
    <Frame>
      <Rect x={38} y={10} width={164} height={182} rx={24} fill={c.surfaceContainerHigh} />
      <Rect x={72} y={30} width={14} height={9} rx={4} fill={c.onSurfaceVariant} opacity={0.6} />
      <Rect x={92} y={24} width={76} height={22} rx={8} fill={c.onSurface} />
      <Rect x={174} y={34} width={14} height={9} rx={4} fill={c.onSurfaceVariant} opacity={0.6} />
      <Rect x={56} y={52} width={128} height={10} rx={5} fill={c.surfaceContainerHighest} />
      {keys.map((k, i) => (
        <G key={i}>
          <Rect x={k.x} y={k.y} width={36} height={32} rx={11} fill={k.on ? accent : c.surfaceContainerHighest} />
          {k.on ? <Path d={`M${k.x + 11} ${k.y + 16} l6 6 l11 -12`} stroke={c.onPrimary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : <Rect x={k.x + 14} y={k.y + 12} width={8} height={8} rx={4} fill={c.onSurfaceVariant} opacity={0.55} />}
        </G>
      ))}
    </Frame>
  );
}

/** Slide 2: a week of bars with one highlighted, an average line and category chips. */
export function InsightsArt({ c, accent }: ArtProps) {
  const heights = [58, 92, 40, 118, 78, 48, 68];
  return (
    <Frame>
      <Rect x={14} y={10} width={212} height={182} rx={24} fill={c.surfaceContainerHigh} />
      {heights.map((h, i) => (
        <Rect key={i} x={32 + i * 27} y={150 - h} width={20} height={h} rx={8} fill={i === 3 ? accent : c.surfaceContainerHighest} />
      ))}
      <Line x1={26} y1={86} x2={214} y2={86} stroke={c.onSurfaceVariant} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.7} />
      <Rect x={32} y={162} width={44} height={14} rx={7} fill="#FE724E" opacity={0.85} />
      <Rect x={82} y={162} width={34} height={14} rx={7} fill="#279AF4" opacity={0.85} />
      <Rect x={122} y={162} width={26} height={14} rx={7} fill="#6A7CF9" opacity={0.85} />
    </Frame>
  );
}

/** Slide 3: an overall budget bar with a pace tick, and two category cards. */
export function BudgetArt({ c, accent }: ArtProps) {
  return (
    <Frame>
      <Rect x={22} y={14} width={196} height={84} rx={22} fill={c.surfaceContainerHigh} />
      <Rect x={40} y={30} width={70} height={12} rx={6} fill={c.onSurface} />
      <Rect x={40} y={50} width={44} height={8} rx={4} fill={c.onSurfaceVariant} opacity={0.5} />
      <Rect x={40} y={70} width={160} height={12} rx={6} fill={c.surfaceContainerHighest} />
      <Rect x={40} y={70} width={78} height={12} rx={6} fill={accent} />
      <Rect x={146} y={64} width={3} height={24} rx={1.5} fill={c.onSurfaceVariant} />
      {[0, 1].map((i) => {
        const x = 22 + i * 102;
        const tint = i === 0 ? '#FE724E' : '#FF78A3';
        return (
          <G key={i}>
            <Rect x={x} y={110} width={94} height={80} rx={20} fill={c.surfaceContainerHigh} />
            <Circle cx={x + 24} cy={134} r={12} fill={tint} opacity={0.35} />
            <Rect x={x + 42} y={128} width={36} height={10} rx={5} fill={c.onSurface} opacity={0.85} />
            <Rect x={x + 14} y={156} width={66} height={9} rx={4.5} fill={c.surfaceContainerHighest} />
            <Rect x={x + 14} y={156} width={i === 0 ? 28 : 50} height={9} rx={4.5} fill={tint} />
          </G>
        );
      })}
    </Frame>
  );
}

/** Slide 4: a phone with a lock, to say the data stays on the device. */
export function PrivateArt({ c, accent }: ArtProps) {
  return (
    <Frame>
      <Rect x={76} y={10} width={88} height={182} rx={22} fill={c.surfaceContainerHigh} stroke={c.outline} strokeWidth={2} />
      <Rect x={106} y={20} width={28} height={6} rx={3} fill={c.surfaceContainerHighest} />
      <Path d="M104 92 v-10 a16 16 0 0 1 32 0 v10" stroke={c.onSurface} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Rect x={94} y={90} width={52} height={40} rx={12} fill={accent} />
      <Circle cx={120} cy={108} r={6} fill={c.onPrimary} />
      <Rect x={118} y={110} width={4} height={12} rx={2} fill={c.onPrimary} />
      <Rect x={92} y={150} width={56} height={8} rx={4} fill={c.surfaceContainerHighest} />
      <Rect x={100} y={166} width={40} height={8} rx={4} fill={c.surfaceContainerHighest} />
      <Circle cx={190} cy={52} r={16} fill={c.successContainer} />
      <Path d="M182 52 l6 6 l11 -12" stroke={c.success} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={48} cy={140} r={13} fill={c.surfaceContainerHighest} />
      <Path d="M42 140 h12 M48 134 v12" stroke={c.onSurfaceVariant} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </Frame>
  );
}

/** The multicolour Google "G". */
export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12c0-6.627 5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24c0 11.045 8.955 20 20 20c11.045 0 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
      <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </Svg>
  );
}

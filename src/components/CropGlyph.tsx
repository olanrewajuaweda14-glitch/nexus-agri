import type { CropDef } from '../lib/crops';

/**
 * A line drawing of the crop at its current stage, built from the same stage
 * table the plan uses — not a stock illustration. Height and leaf count follow
 * days after planting; flowers, cobs, pods, fruit and roots appear at the stage
 * they actually do; leaves dry to straw through the late season.
 */

const GREEN = 'var(--color-leaf)';
const DEEP = 'var(--color-leaf-deep)';
const STRAW = '#c4a15a';
const SOIL = 'var(--color-soil)';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 2);
const mix = (a: string, b: string, t: number) => `color-mix(in srgb, ${b} ${Math.round(clamp01(t) * 100)}%, ${a})`;

const GRASS = new Set(['maize', 'sorghum', 'rice']);
const GROUND = 124;
const X = 60;

export function CropGlyph({ crop, dap, size = 112, animate = true }: { crop: CropDef; dap: number; size?: number; animate?: boolean }) {
  const flowerStage = crop.heat?.stageIndex ?? Math.min(2, crop.stages.length - 1);
  const flowerDap = crop.stages[flowerStage].startDap;
  const lateDap = crop.stages[crop.stages.length - 1].startDap;
  const growth = ease(dap / flowerDap); // full height at flowering
  const dry = clamp01((dap - lateDap) / Math.max(1, crop.maturityDays - lateDap));
  const leafColor = mix(GREEN, STRAW, dry);
  const stemColor = mix(DEEP, STRAW, dry * 0.9);
  const a = '';

  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} role="img" aria-label={`${crop.name} drawing at day ${Math.max(0, dap)}`} className={`overflow-visible ${animate ? '' : 'no-anim'}`}>
      {/* soil */}
      <path d={`M10 ${GROUND} Q60 ${GROUND - 7} 110 ${GROUND}`} fill="none" stroke={SOIL} strokeWidth="2" strokeLinecap="round" opacity=".7" />
      <path d={`M24 ${GROUND + 6} h10 M50 ${GROUND + 8} h14 M82 ${GROUND + 6} h9`} stroke={SOIL} strokeWidth="1.5" strokeLinecap="round" opacity=".35" />
      {dap < 0 ? (
        <Seed />
      ) : (
        <g className={animate ? 'sway' : ''}>
          {GRASS.has(crop.id) ? (
            <Grass id={crop.id} dap={dap} growth={growth} flowerDap={flowerDap} leaf={leafColor} stem={stemColor} dry={dry} anim={a} />
          ) : (
            <Broadleaf id={crop.id} dap={dap} growth={growth} flowerDap={flowerDap} crop={crop} leaf={leafColor} stem={stemColor} dry={dry} anim={a} />
          )}
        </g>
      )}
    </svg>
  );
}

function Seed() {
  return (
    <g>
      <ellipse cx={X} cy={GROUND + 7} rx="5" ry="3.4" fill={STRAW} stroke={SOIL} strokeWidth="1" />
      <path d={`M${X} ${GROUND + 3} v-6`} stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" className="draw" pathLength={1} />
    </g>
  );
}

interface PartProps {
  dap: number;
  growth: number;
  flowerDap: number;
  leaf: string;
  stem: string;
  dry: number;
  anim: string;
}

function Leaf({ x, y, len, side, droop, color, i, anim }: { x: number; y: number; len: number; side: 1 | -1; droop: number; color: string; i: number; anim: string }) {
  const tipX = x + side * len;
  const tipY = y + droop;
  const c1x = x + side * len * 0.45;
  const c1y = y - len * 0.35;
  const w = Math.max(2.2, len * 0.12);
  const d = `M${x} ${y} Q${c1x} ${c1y - w} ${tipX} ${tipY} Q${c1x} ${c1y + w} ${x} ${y + 1.5} Z`;
  return (
    <path
      d={d}
      fill={color}
      opacity=".92"
      className={`[animation:pop_520ms_var(--ease-spring)_both]${anim}`}
      style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${250 + i * 70}ms` }}
    />
  );
}

function Grass({ id, dap, growth, flowerDap, leaf, stem, dry, anim }: PartProps & { id: string }) {
  const h = 10 + 96 * growth;
  const top = GROUND - h;
  const nLeaves = Math.max(1, Math.min(9, Math.round(1 + growth * 8)));
  const flowering = dap >= flowerDap;
  const leaves = Array.from({ length: nLeaves }, (_, i) => {
    const t = (i + 1) / (nLeaves + 1);
    const y = GROUND - h * t * 0.92;
    const len = (id === 'rice' ? 22 : 30) * (0.55 + growth * 0.6) * (1 - t * 0.35);
    return <Leaf key={i} x={X} y={y} len={len} side={i % 2 ? 1 : -1} droop={6 + len * 0.35 + dry * 10} color={leaf} i={i} anim={anim} />;
  });

  return (
    <g>
      {id === 'rice' && growth > 0.3 && (
        // Tillers: rice multiplies its stems.
        [-7, 7].map((dx, k) => (
          <path key={k} d={`M${X} ${GROUND} Q${X + dx * 0.6} ${GROUND - h * 0.5} ${X + dx} ${top + 14}`} stroke={stem} strokeWidth="2" fill="none" strokeLinecap="round" className="draw" pathLength={1} />
        ))
      )}
      <path d={`M${X} ${GROUND} L${X} ${top}`} stroke={stem} strokeWidth={id === 'rice' ? 2.2 : 3.2} strokeLinecap="round" className={`draw${anim}`} pathLength={1} />
      {leaves}
      {flowering && id === 'maize' && (
        <g className={`[animation:rise_600ms_var(--ease-out)_both_700ms]${anim}`}>
          {/* tassel */}
          {[-9, -4, 0, 4, 9].map((dx, k) => (
            <path key={k} d={`M${X} ${top + 2} Q${X + dx * 0.5} ${top - 8} ${X + dx} ${top - 12 + Math.abs(dx) * 0.6}`} stroke={mix('#b9a04a', STRAW, dry)} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          ))}
          {/* ear with husk and silk */}
          <g transform={`rotate(-24 ${X + 4} ${GROUND - h * 0.48})`}>
            <ellipse cx={X + 9} cy={GROUND - h * 0.48} rx="4.6" ry="11" fill={mix('#9fbf6a', STRAW, dry)} stroke={stem} strokeWidth="1" />
            {dry < 0.5 && <path d={`M${X + 9} ${GROUND - h * 0.48 - 11} q3 -6 7 -7 M${X + 9} ${GROUND - h * 0.48 - 11} q-1 -6 2 -9`} stroke="#b0703a" strokeWidth="1" fill="none" />}
          </g>
        </g>
      )}
      {flowering && id === 'sorghum' && (
        <g className={`[animation:rise_600ms_var(--ease-out)_both_700ms]${anim}`}>
          {Array.from({ length: 14 }, (_, k) => {
            const row = Math.floor(k / 3);
            return <circle key={k} cx={X - 4 + (k % 3) * 4 + (row % 2) * 2} cy={top - 4 - row * 4} r="2.3" fill={mix('#b5703a', '#8a4b2a', dry)} />;
          })}
        </g>
      )}
      {flowering && id === 'rice' && (
        <g className={`[animation:rise_600ms_var(--ease-out)_both_700ms]${anim}`}>
          <path d={`M${X} ${top} q10 -4 16 10`} stroke={mix('#9fae58', STRAW, dry)} strokeWidth="1.4" fill="none" />
          {Array.from({ length: 7 }, (_, k) => {
            const t = k / 6;
            return <ellipse key={k} cx={X + 3 + t * 13} cy={top - 1 + t * t * 11} rx="1.3" ry="2.3" fill={mix('#c0c26a', STRAW, Math.max(dry, 0.25))} transform={`rotate(${20 + t * 40} ${X + 3 + t * 13} ${top - 1 + t * t * 11})`} />;
          })}
        </g>
      )}
    </g>
  );
}

function Broadleaf({ id, dap, growth, flowerDap, crop, leaf, stem, dry, anim }: PartProps & { id: string; crop: CropDef }) {
  const tall = id === 'cassava' ? 100 : id === 'tomato' ? 82 : 62;
  const h = 10 + tall * growth;
  const top = GROUND - h;
  const nodes = Math.max(1, Math.min(6, Math.round(1 + growth * 5)));
  const leafR = id === 'cassava' ? 9 : 7.5;

  const parts = [];
  for (let i = 0; i < nodes; i++) {
    const t = (i + 1) / (nodes + 0.4);
    const y = GROUND - h * t;
    const side = i % 2 ? 1 : -1;
    const bx = X + side * (8 + growth * 10) * (1 - t * 0.3);
    const by = y - 6;
    parts.push(<path key={`b${i}`} d={`M${X} ${y} Q${X + side * 4} ${y - 2} ${bx} ${by}`} stroke={stem} strokeWidth="1.6" fill="none" strokeLinecap="round" />);
    // Trifoliate (legumes, tomato) or palmate (cassava) leaf cluster.
    const lobes = id === 'cassava' ? [-60, -25, 10, 45] : [-40, 0, 40];
    lobes.forEach((deg, k) => {
      const rad = ((deg - 90 + side * 15) * Math.PI) / 180;
      const cx = bx + Math.cos(rad) * leafR * 0.9;
      const cy = by + Math.sin(rad) * leafR * 0.9;
      parts.push(
        <ellipse
          key={`l${i}-${k}`}
          cx={cx}
          cy={cy}
          rx={id === 'cassava' ? 2.6 : leafR * 0.48}
          ry={leafR * 0.78}
          transform={`rotate(${deg + side * 15} ${cx} ${cy})`}
          fill={leaf}
          opacity=".92"
          className={`[animation:pop_520ms_var(--ease-spring)_both]${anim}`}
          style={{ transformOrigin: `${bx}px ${by}px`, animationDelay: `${250 + (i * lobes.length + k) * 35}ms` }}
        />,
      );
    });
  }

  const podStage = crop.stages.findIndex((s) => /pod|fruit/i.test(s.name));
  const podDap = podStage >= 0 ? crop.stages[podStage].startDap : flowerDap;
  const showPods = (id === 'soybean' || id === 'cowpea') && dap >= podDap;
  const showFlowers = dap >= flowerDap && !showPods && id !== 'cassava';
  const showFruit = id === 'tomato' && dap >= podDap;
  const bulking = id === 'cassava' ? clamp01((dap - (crop.stages[3]?.startDap ?? 120)) / 120) : 0;

  return (
    <g>
      <path d={`M${X} ${GROUND} L${X} ${top}`} stroke={id === 'cassava' ? mix('#8a6a4a', STRAW, dry) : stem} strokeWidth={id === 'cassava' ? 3.4 : 2.4} strokeLinecap="round" className={`draw${anim}`} pathLength={1} />
      {parts}
      {showFlowers &&
        [0.35, 0.6].map((t, k) => (
          <circle key={k} cx={X + (k ? 7 : -7)} cy={GROUND - h * t} r="2.4" fill={id === 'tomato' ? '#d9b23a' : '#c6a3d6'} className={`[animation:pop_420ms_var(--ease-spring)_both_800ms]${anim}`} style={{ transformOrigin: 'center', transformBox: 'fill-box' }} />
        ))}
      {showPods &&
        [0.3, 0.5, 0.7].map((t, k) => {
          const px = X + (k % 2 ? 6 : -6);
          const py = GROUND - h * t;
          return (
            <path
              key={k}
              d={`M${px} ${py} q${k % 2 ? 6 : -6} ${id === 'cowpea' ? 14 : 8} ${k % 2 ? 2 : -2} ${id === 'cowpea' ? 20 : 12}`}
              stroke={mix('#7f9a3f', STRAW, dry)}
              strokeWidth={id === 'cowpea' ? 2 : 3}
              strokeLinecap="round"
              fill="none"
              className={`draw${anim}`}
              pathLength={1}
            />
          );
        })}
      {showFruit &&
        [0.3, 0.45, 0.62].map((t, k) => {
          const ripe = clamp01((dap - podDap - k * 6) / 30);
          return <circle key={k} cx={X + (k % 2 ? 9 : -9)} cy={GROUND - h * t + 6} r={3.6 + ripe * 1.4} fill={mix('#7fa34a', '#c8402c', ripe)} className={`[animation:pop_460ms_var(--ease-spring)_both_800ms]${anim}`} style={{ transformOrigin: 'center', transformBox: 'fill-box' }} />;
        })}
      {bulking > 0 &&
        // Storage roots swelling below ground.
        [-1, 0, 1].map((s) => (
          <ellipse key={s} cx={X + s * 11} cy={GROUND + 8 + Math.abs(s) * 2} rx={2 + bulking * 3} ry={5 + bulking * 6} transform={`rotate(${s * 35} ${X + s * 11} ${GROUND + 8})`} fill="#9a6a3c" opacity=".85" className={`[animation:fade_700ms_ease_both_600ms]${anim}`} />
        ))}
    </g>
  );
}

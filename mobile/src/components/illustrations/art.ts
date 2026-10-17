/**
 * EatMe illustrations, hand-drawn as SVG.
 *
 * One flat, rounded style across the app: organic blob backgrounds, soft
 * shapes, no outlines heavier than the shapes themselves, and only palette
 * colours, so the art belongs to the Warm Community look and recolours
 * itself in dark mode.
 *
 * Each function returns SVG markup for a 240 x 180 canvas. It is plain
 * TypeScript with no React Native import, so the same art can be rendered
 * to PNG outside the app for documentation and design review.
 */

export interface ArtColors {
  blob: string;
  blobAlt: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  cream: string;
  line: string;
  faint: string;
}

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">${body}</svg>`;

const BLOB =
  'M48.7 121.5C32.6 91.6 41.8 52.5 78.6 36.4C110.8 22.6 149.9 20.3 177.5 41C207.4 62.8 212 105.4 191.3 133C170.6 160.6 124.6 167.5 92.4 158.3C70.6 152.5 57.9 139.9 48.7 121.5Z';

const heart = (cx: number, cy: number, s: number, fill: string) => {
  // A heart centred on (cx, cy) with half-width s.
  const k = s / 17;
  const p = (x: number, y: number) => `${cx + x * k} ${cy + y * k}`;
  return `<path d="M${p(0, 14)}C${p(-16, 4)} ${p(-21, -6)} ${p(-17, -13)}C${p(-13, -20)} ${p(-4, -19)} ${p(0, -12)}C${p(4, -19)} ${p(13, -20)} ${p(17, -13)}C${p(21, -6)} ${p(16, 4)} ${p(0, 14)}Z" fill="${fill}"/>`;
};

const leaf = (x: number, y: number, rotate: number, fill: string, scale = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})"><path d="M0 0C5 -11 17 -14 25 -11C23 -2 13 6 0 0Z" fill="${fill}"/><path d="M2 -1C9 -5 15 -8 21 -10" stroke="rgba(255,255,255,0.35)" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>`;

const sparkle = (x: number, y: number, r: number, fill: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

const plus = (x: number, y: number, s: number, stroke: string) =>
  `<path d="M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;

const bowl = (c: ArtColors, withFood: boolean) => `
  ${
    withFood
      ? `<path d="M74 99C77 80 99 71 120 72C141 71 163 80 166 99Z" fill="${c.cream}"/>
  <circle cx="98" cy="88" r="3" fill="${c.faint}"/><circle cx="118" cy="82" r="3" fill="${c.faint}"/><circle cx="140" cy="88" r="3" fill="${c.faint}"/>
  ${leaf(128, 84, -30, c.secondary, 0.7)}`
      : ''
  }
  <rect x="60" y="95" width="120" height="13" rx="6.5" fill="${c.primaryDark}"/>
  <path d="M65 104H175C175 134 151 153 120 153C89 153 65 134 65 104Z" fill="${c.primary}"/>
  <path d="M82 116C86 130 98 140 112 143" stroke="rgba(255,255,255,0.28)" stroke-width="5" stroke-linecap="round" fill="none"/>
`;

/** A steaming bowl with a heart rising from it: sharing food. Also the logo's idea. */
export function shareFood(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blob}"/>
    ${bowl(c, true)}
    <path d="M94 64C88 57 99 52 93 44" stroke="${c.secondary}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.55"/>
    <path d="M146 64C152 57 141 52 147 44" stroke="${c.secondary}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.55"/>
    ${heart(120, 44, 17, c.secondary)}
    ${leaf(182, 100, -25, c.secondary)}
    ${leaf(58, 100, 205, c.secondaryDark, 0.9)}
    ${sparkle(52, 56, 4, c.accent)}${sparkle(190, 58, 5, c.accent)}${sparkle(204, 118, 3, c.primary)}
    ${plus(40, 128, 5, c.accent)}
  `);
}

/** A basket of bread and an apple: asking for what you need. */
export function requestFood(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blobAlt}"/>
    <path d="M88 100C88 68 152 68 152 100" stroke="${c.primaryDark}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M84 101C84 86 97 79 110 81C121 82 128 90 126 101Z" fill="${c.accent}"/>
    <path d="M96 88L100 96M106 86L110 94M116 87L119 95" stroke="${c.cream}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
    <circle cx="140" cy="90" r="14" fill="${c.secondary}"/>
    <path d="M140 76V70" stroke="${c.line}" stroke-width="3" stroke-linecap="round"/>
    ${leaf(141, 72, -40, c.secondaryDark, 0.55)}
    <rect x="64" y="97" width="112" height="11" rx="5.5" fill="${c.primaryDark}"/>
    <path d="M70 106H170L160 146C159 150 155 153 151 153H89C85 153 81 150 80 146Z" fill="${c.primary}"/>
    <path d="M77 118H163M80 131H160M83 143H157" stroke="${c.primaryDark}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
    ${heart(186, 58, 11, c.primary)}
    ${sparkle(50, 60, 4, c.accent)}${sparkle(196, 116, 4, c.secondary)}
    ${plus(46, 124, 5, c.primary)}
  `);
}

/** A delivery van with a heart on its side: getting food where it is needed. */
export function deliverFood(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blob}"/>
    <path d="M30 153H210" stroke="${c.faint}" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 100H48M22 114H44M30 128H46" stroke="${c.faint}" stroke-width="4" stroke-linecap="round"/>
    <rect x="58" y="84" width="96" height="56" rx="12" fill="${c.secondary}"/>
    <path d="M154 102H177C183 102 187 106 189 112L194 126V140H154Z" fill="${c.secondaryDark}"/>
    <path d="M160 108H175C178 108 180 110 181 113L184 123H160Z" fill="${c.cream}"/>
    ${heart(106, 111, 14, c.cream)}
    <rect x="58" y="128" width="136" height="6" rx="3" fill="${c.secondaryDark}"/>
    <circle cx="84" cy="142" r="13" fill="${c.line}"/><circle cx="84" cy="142" r="5" fill="${c.cream}"/>
    <circle cx="170" cy="142" r="13" fill="${c.line}"/><circle cx="170" cy="142" r="5" fill="${c.cream}"/>
    ${leaf(186, 76, -30, c.secondary, 0.9)}
    ${sparkle(64, 58, 4, c.accent)}${sparkle(200, 96, 3, c.primary)}
    ${plus(120, 56, 5, c.accent)}
  `);
}

/** An empty bowl and a spoon: nothing here yet. */
export function emptyBowl(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blob}"/>
    <g transform="rotate(38 158 70)">
      <rect x="154" y="48" width="8" height="56" rx="4" fill="${c.cream}"/>
      <ellipse cx="158" cy="44" rx="11" ry="15" fill="${c.cream}"/>
    </g>
    ${bowl(c, false)}
    ${sparkle(110, 76, 3, c.faint)}${sparkle(118, 63, 3.5, c.faint)}${sparkle(112, 50, 4, c.faint)}
    ${leaf(58, 104, 200, c.secondary, 0.9)}
    ${sparkle(54, 58, 4, c.accent)}${sparkle(196, 120, 3, c.secondary)}
  `);
}

/** A clipboard with a tick: all caught up, nothing waiting. */
export function allClear(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blobAlt}"/>
    <rect x="78" y="46" width="84" height="108" rx="14" fill="${c.cream}"/>
    <rect x="101" y="38" width="38" height="17" rx="7" fill="${c.primary}"/>
    <rect x="94" y="74" width="54" height="7" rx="3.5" fill="${c.faint}"/>
    <rect x="94" y="90" width="42" height="7" rx="3.5" fill="${c.faint}"/>
    <rect x="94" y="106" width="48" height="7" rx="3.5" fill="${c.faint}"/>
    <circle cx="152" cy="138" r="20" fill="${c.secondary}"/>
    <path d="M143 138L150 145L162 132" stroke="${c.cream}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${leaf(66, 132, 200, c.secondary, 0.9)}
    ${sparkle(58, 60, 4, c.accent)}${sparkle(186, 64, 5, c.accent)}
    ${plus(192, 104, 5, c.primary)}
  `);
}

/** A big tick with confetti: it worked. */
export function success(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blobAlt}"/>
    <circle cx="120" cy="96" r="50" fill="${c.secondary}"/>
    <circle cx="120" cy="96" r="50" fill="none" stroke="${c.cream}" stroke-width="3" opacity="0.35"/>
    <path d="M97 97L113 113L145 80" stroke="${c.cream}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="52" y="52" width="10" height="5" rx="2.5" fill="${c.primary}" transform="rotate(-30 57 54)"/>
    <rect x="178" y="46" width="10" height="5" rx="2.5" fill="${c.accent}" transform="rotate(25 183 48)"/>
    <rect x="190" y="118" width="10" height="5" rx="2.5" fill="${c.primary}" transform="rotate(60 195 120)"/>
    <rect x="44" y="120" width="10" height="5" rx="2.5" fill="${c.accent}" transform="rotate(-60 49 122)"/>
    ${sparkle(70, 84, 4, c.accent)}${sparkle(172, 80, 4, c.primary)}${sparkle(160, 150, 3, c.accent)}
    ${heart(196, 84, 8, c.primary)}
  `);
}

/** A tipped-over bowl with spilled rice: something went wrong. */
export function spilled(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blob}"/>
    <path d="M122 134C138 122 166 124 180 134C192 142 182 153 164 153H116C106 153 110 141 122 134Z" fill="${c.cream}"/>
    <ellipse cx="190" cy="148" rx="4" ry="2.5" fill="${c.cream}"/>
    <ellipse cx="200" cy="141" rx="3.5" ry="2.2" fill="${c.cream}"/>
    <ellipse cx="108" cy="150" rx="3.5" ry="2.2" fill="${c.cream}"/>
    <g transform="rotate(-32 104 118)">
      <rect x="44" y="95" width="120" height="13" rx="6.5" fill="${c.primaryDark}"/>
      <path d="M49 104H159C159 134 135 153 104 153C73 153 49 134 49 104Z" fill="${c.primary}"/>
      <path d="M66 116C70 130 82 140 96 143" stroke="rgba(255,255,255,0.28)" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
    ${sparkle(168, 70, 4, c.accent)}${sparkle(60, 58, 3, c.secondary)}
    ${plus(192, 96, 5, c.accent)}
  `);
}

/** An hourglass among leaves: waiting for approval. */
export function waiting(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blobAlt}"/>
    <rect x="86" y="40" width="68" height="10" rx="5" fill="${c.primaryDark}"/>
    <rect x="86" y="142" width="68" height="10" rx="5" fill="${c.primaryDark}"/>
    <path d="M94 50H146C146 74 132 86 120 96C108 86 94 74 94 50Z" fill="${c.cream}"/>
    <path d="M94 142H146C146 118 132 106 120 96C108 106 94 118 94 142Z" fill="${c.cream}"/>
    <path d="M104 62H136C134 72 127 80 120 86C113 80 106 72 104 62Z" fill="${c.accent}"/>
    <path d="M102 142C104 128 112 122 120 118C128 122 136 128 138 142Z" fill="${c.accent}"/>
    <path d="M120 96V116" stroke="${c.accent}" stroke-width="2.5" stroke-dasharray="2 4" stroke-linecap="round"/>
    ${leaf(160, 120, -20, c.secondary)}${leaf(78, 128, 200, c.secondaryDark, 0.9)}
    ${sparkle(62, 62, 4, c.accent)}${sparkle(182, 60, 4, c.primary)}
  `);
}

/** A cloud with a broken link: can't reach the server. */
export function offline(c: ArtColors): string {
  return svg(`
    <path d="${BLOB}" fill="${c.blob}"/>
    <path d="M78 124C62 124 54 112 58 100C61 90 70 85 80 87C83 71 97 60 114 62C128 63 139 72 142 85C147 81 154 80 161 83C172 88 177 99 174 110C171 119 163 124 154 124Z" fill="${c.cream}"/>
    <path d="M104 104L112 96M128 112L136 104" stroke="${c.primary}" stroke-width="6" stroke-linecap="round"/>
    <path d="M113 101C117 97 123 97 127 101" stroke="${c.primary}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.35"/>
    <path d="M92 140L100 150M120 140V152M148 140L140 150" stroke="${c.faint}" stroke-width="4" stroke-linecap="round"/>
    ${sparkle(58, 60, 4, c.accent)}${sparkle(190, 62, 4, c.secondary)}
  `);
}

/** The logo mark: a bowl with a heart rising like steam. 64 x 64 canvas. */
export function logoMark(c: { bowl: string; rim: string; heart: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="6" y="30" width="52" height="7" rx="3.5" fill="${c.rim}"/>
    <path d="M9 35H55C55 49 45 58 32 58C19 58 9 49 9 35Z" fill="${c.bowl}"/>
    <path d="M16 41C18 47 23 51 29 52" stroke="rgba(255,255,255,0.3)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    ${heart(32, 16, 11, c.heart)}
  </svg>`;
}

export const ART = {
  shareFood,
  requestFood,
  deliverFood,
  emptyBowl,
  allClear,
  success,
  spilled,
  waiting,
  offline,
} as const;

export type ArtName = keyof typeof ART;

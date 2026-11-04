import type { Rgb } from './types';

function toHsl([r, g, b]: Rgb): { h: number; s: number; l: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rf) h = ((gf - bf) / d) % 6;
  else if (max === gf) h = (bf - rf) / d + 2;
  else h = (rf - gf) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

/** A plain colour word for one RGB value. */
export function baseColourName(rgb: Rgb): string {
  const { h, s, l } = toHsl(rgb);
  if (s < 0.15) return l > 0.8 ? 'white' : l < 0.25 ? 'black' : 'grey';
  if (h >= 15 && h < 38 && l < 0.5) return 'brown';
  if (h < 15 || h >= 345) return 'red';
  if (h < 38) return 'orange'; // the game's yellow is golden (hue ~44)
  if (h < 70) return 'yellow';
  if (h < 160) return 'green';
  if (h < 190) return 'teal';
  if (h < 215) return s < 0.5 && l > 0.7 ? 'pale blue' : 'sky blue';
  if (h < 250) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

/**
 * R7: names for every region colour, unique within the board. When two colours share a word,
 * the lighter one becomes "light ..." and the darker "dark ..."; any further clash gets a number.
 */
export function nameColours(palette: Rgb[]): string[] {
  const names = palette.map(baseColourName);
  const groups = new Map<string, number[]>();
  names.forEach((name, i) => groups.set(name, [...(groups.get(name) ?? []), i]));
  for (const [name, ids] of groups) {
    if (ids.length < 2) continue;
    const byLightness = [...ids].sort((a, b) => toHsl(palette[a]!).l - toHsl(palette[b]!).l);
    if (ids.length === 2) {
      names[byLightness[0]!] = `dark ${name}`;
      names[byLightness[1]!] = `light ${name}`;
      // Prefer the plain word for the darker one when it is clearly a mid-tone, e.g. "pink" vs "light pink".
      if (toHsl(palette[byLightness[0]!]!).l < 0.75) names[byLightness[0]!] = name;
    } else {
      byLightness.forEach((id, k) => (names[id] = `${name} ${k + 1}`));
    }
  }
  // Last safeguard: a renamed colour can still collide with another (e.g. "light pink" twice).
  const seen = new Map<string, number>();
  names.forEach((name, i) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count > 1) names[i] = `${name} ${count}`;
  });
  return names;
}

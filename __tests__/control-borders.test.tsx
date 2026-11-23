// __tests__/control-borders.test.tsx
// A field's edge must reach 3:1 against what is around it so a player can find
// it (WCAG 2.2, 1.4.11). The old `border-zinc-700/80` measured about 1.5:1.
// This reads the real palette from theme.css for both themes and works out the
// blended colours the browser paints (backlog D5, screen review #5).
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FIELD_BORDER, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AgeChoice } from '@/components/AgeChoice';

type RGB = [number, number, number]; // sRGB, 0-1, gamma encoded

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/theme.css'), 'utf8');
const [darkCss, lightCss] = css.split(':root[data-theme="light"] {');

function token(block: string, name: string): RGB {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(block);
  if (!m) throw new Error(`no ${name}`);
  return parseColour(m[1].trim());
}

function parseColour(v: string): RGB {
  if (v.startsWith('#')) {
    const hex = v.length === 4 ? v.slice(1).split('').map((c) => c + c).join('') : v.slice(1);
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;
  }
  const m = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\)/.exec(v);
  if (!m) throw new Error(`cannot read ${v}`);
  const L = Number(m[1]) / 100;
  const C = Number(m[2]);
  const h = m[3] === 'none' ? 0 : (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return lin.map((c) => {
    const x = Math.min(1, Math.max(0, c));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  }) as RGB;
}

const over = (top: RGB, alpha: number, under: RGB): RGB => top.map((c, i) => c * alpha + under[i] * (1 - alpha)) as RGB;

function luminance(c: RGB) {
  const [r, g, b] = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(x: RGB, y: RGB) {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

// "border-zinc-500/70" -> zinc-500 at 70%
const [, borderName, borderPct] = /^border-(zinc-\d+)\/(\d+)$/.exec(FIELD_BORDER) ?? [];

describe.each([
  ['dark', darkCss],
  ['light', lightCss],
])('field borders in the %s theme', (_theme, block) => {
  const page = token(block, 'background');
  const zinc900 = token(block, 'color-zinc-900');
  const zinc950 = token(block, 'color-zinc-950');
  // Card (bg-zinc-900/90) on the page, field fill (bg-zinc-900/90) on the card,
  // age cards (bg-zinc-950/40) on the card
  const card = over(zinc900, 0.9, page);
  const surfaces: RGB[] = [card, over(zinc900, 0.9, card), over(zinc950, 0.4, card)];

  it('reach 3:1 against the card and the field fill', () => {
    expect(borderName).toBeTruthy();
    for (const surface of surfaces) {
      const edge = over(token(block, `color-${borderName}`), Number(borderPct) / 100, surface);
      expect(contrast(edge, surface)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('every form control uses the field border', () => {
  it('Input, Select and the unselected age cards', () => {
    render(
      <>
        <Input label="Email" />
        <Select label="Level" options={[{ value: 'a', label: 'A' }]} />
        <AgeChoice value={null} onChange={() => {}} />
      </>
    );
    expect(screen.getByLabelText('Email').className).toContain(FIELD_BORDER);
    expect(screen.getByLabelText('Level').className).toContain(FIELD_BORDER);
    expect(screen.getByLabelText(/16 or older/).closest('label')!.className).toContain(FIELD_BORDER);
  });

  it('labels are sentence case, not forced to capitals', () => {
    render(<Input label="Your name or a nickname" />);
    const label = screen.getByText('Your name or a nickname');
    expect(label.className).not.toContain('uppercase');
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('SVN-Calling Code Font Family Integration', () => {
  it('has all 4 OTF font files present in public/', () => {
    expect(existsSync('public/SVN-Calling Code Regular.otf')).toBe(true);
    expect(existsSync('public/SVN-Calling Code Bold.otf')).toBe(true);
    expect(existsSync('public/SVN-Calling Code Italic.otf')).toBe(true);
    expect(existsSync('public/SVN-Calling Code Bold Italic.otf')).toBe(true);
  });

  it('defines @font-face for SVN-Calling Code with opentype format and weights in cascadia-font.css', () => {
    const css = readFileSync('windi/cascadia-font.css', 'utf8');

    expect(css).toContain('font-family: "SVN-Calling Code"');
    expect(css).toContain("url('/SVN-Calling%20Code%20Regular.otf') format('opentype')");
    expect(css).toContain("url('/SVN-Calling%20Code%20Bold.otf') format('opentype')");
    expect(css).toContain("url('/SVN-Calling%20Code%20Italic.otf') format('opentype')");
    expect(css).toContain("url('/SVN-Calling%20Code%20Bold%20Italic.otf') format('opentype')");
    expect(css).toContain('--font-geist: "SVN-Calling Code"');
    expect(css).toContain('--font-geist-mono: "SVN-Calling Code"');
  });

  it('has calling-code-font.css and is loaded in app/layout.tsx', () => {
    const layout = readFileSync('app/layout.tsx', 'utf8');
    expect(layout).toContain('calling-code-font.css');

    const canonicalCss = readFileSync('windi/calling-code-font.css', 'utf8');
    expect(canonicalCss).toContain('cascadia-font.css');
  });

  it('sets SVN-Calling Code as primary font in globals.css root', () => {
    const globals = readFileSync('app/globals.css', 'utf8');
    expect(globals).toContain('--font-geist:"SVN-Calling Code"');
    expect(globals).toContain('--font-geist-mono:"SVN-Calling Code"');
  });
});

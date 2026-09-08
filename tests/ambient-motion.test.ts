import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {makeDuckFall,makeDuckFlight} from '../lib/ambient-flight';
import {AmbientMotion} from '../windi/ambient-motion';
import {PixelDuck} from '../windi/pixel-duck';

test('random flight is visible sooner, bounded, and outside text-heavy hero space',()=>{
  for(const width of [375,768,1024,1440]) for(const seed of [0,.2,.7,.999]){
    const flight=makeDuckFlight(width,900,()=>seed);
    expect(flight.duration).toBeGreaterThanOrEqual(11000);
    expect(flight.duration).toBeLessThan(15000);
    expect(flight.delay).toBeGreaterThanOrEqual(2800);
    expect(flight.delay).toBeLessThan(6000);
    expect(flight.points[1].opacity).toBe(1);
    expect(flight.points[0].opacity).toBe(0);
    expect(flight.points.at(-1)?.opacity).toBe(0);
    expect(flight.direction).toBe(seed>.5?-1:1);
    for(const point of flight.points) expect(point.transform).not.toMatch(/NaN|Infinity/);
  }
});
test('a hit falls from its actual position to below the playfield, never upward',()=>{
  for(const [x,y,floor] of [[100,60,828],[0,80,500],[300,200,100]]){
    const fall=makeDuckFall(x,y,floor);
    expect(fall[0].transform).toBe(`translate3d(${x}px,${y}px,0)`);
    expect(fall[1].transform).toBe(`translate3d(${x}px,${Math.max(y,floor)}px,0)`);
    expect(fall[2].opacity).toBe(0);
  }
});
test('server render is deterministic and motion starts only after preferences load',()=>{
  const first=renderToStaticMarkup(createElement(AmbientMotion));
  expect(first).toBe(renderToStaticMarkup(createElement(AmbientMotion)));
  expect(first).toContain('aria-pressed="false"');
  expect(first).toContain('disabled=""');
  expect(first).toContain('aria-hidden="true"');
  const sprite=renderToStaticMarkup(createElement(PixelDuck));
  expect(sprite).toContain('shape-rendering="crispEdges"');
  expect(sprite).not.toMatch(/https?:|<image/);
  expect(sprite).toContain('duck-wing-up');
  expect(sprite).toContain('duck-wing-down');
  expect(first).toContain('aria-label="Bắn vịt pixel"');
  expect(first).toContain('data-phase="waiting"');
  expect(first).toContain('role="status"');
});
test('CSS honors reduced motion and decorations do not intercept clicks',()=>{
  const css=readFileSync('windi/ambient-motion.css','utf8');
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  expect(css).toContain('.ambient-duck{display:none!important}');
  expect(css).toContain('pointer-events:none');
  expect(css).toContain('.hero-search:focus-within{animation-play-state:paused!important}');
  expect(css).toContain('.ambient-duck[data-phase=flying]{pointer-events:auto}');
  expect(css).toContain('.ambient-duck[data-phase=waiting]{visibility:hidden}');
});
test('public navigation no longer links to the editor desk',()=>{
  expect(readFileSync('windi/app-shell.tsx','utf8')).not.toContain('href="/admin"');
});

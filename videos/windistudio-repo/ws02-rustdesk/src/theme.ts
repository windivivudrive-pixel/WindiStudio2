import {Easing, interpolate} from 'remotion';

export const COLORS = {
  bg: '#071724',
  panel: '#102b3a',
  panelDeep: '#0b2232',
  panelSoft: '#173746',
  cream: '#fff4d5',
  muted: '#aec7c8',
  border: '#8dc8c2',
  pink: '#ff6f9d',
  teal: '#4cc8ba',
  yellow: '#f2c15b',
  red: '#f06f78',
  green: '#76d29e',
};

export const enter = (frame: number, delay = 0, duration = 9) =>
  interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

export const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};


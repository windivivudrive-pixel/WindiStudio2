import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {clamp} from '../theme';

export const SceneShell: React.FC<React.PropsWithChildren<{duration: number; direction?: 1 | -1}>> = ({children, direction = 1}) => {
  const frame = useCurrentFrame();
  const entering = interpolate(frame, [0, 8], [0, 1], clamp);

  return (
    <div style={{
      position: 'absolute',
      left: 80,
      top: 330,
      width: 920,
      height: 1060,
      translate: `${direction * (1 - entering) * 48}px 0`,
    }}>
      {children}
    </div>
  );
};

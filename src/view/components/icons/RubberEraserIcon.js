import * as React from 'react';
import SvgIcon from '@mui/material/SvgIcon';

export default function RubberEraserIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Taller, more vertical rubber eraser: pink body + light band, leaning right */}
      <g transform="rotate(10 12 12)">
        {/* Main eraser body */}
        <rect x="8" y="4" width="6" height="14" rx="2" ry="2" fill="#ffb6c1" />
        {/* Eraser cap/band */}
        <rect x="8" y="4" width="6" height="4" rx="2" ry="2" fill="#f5f5f5" />
      </g>
    </SvgIcon>
  );
}

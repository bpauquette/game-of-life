import React from 'react';
import { SvgIcon } from '@mui/material';

const OvalIcon = (props) => (
  <SvgIcon {...props}>
    <ellipse
      cx="12"
      cy="12"
      rx="9"
      ry="6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </SvgIcon>
);

export default OvalIcon;
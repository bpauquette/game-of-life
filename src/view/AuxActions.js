import React from 'react';
import { BarChart as BarChartIcon, CloudDownload as ImportIcon, Help as HelpIcon, Info as InfoIcon, Language as LanguageIcon, LockPerson as UserLoggedInIcon, PsychologyAlt as UserIcon, Settings as SettingsIcon, VolunteerActivism as DonateIcon } from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import PropTypes from 'prop-types';
import { FRONTEND_TIMESTAMP, FRONTEND_VERSION } from '../version.js';

function AuxActions({ onOpenChart, onOpenHelp, onOpenAbout, onOpenOptions, onOpenUser, onOpenImport, onOpenDonate, onOpenPhotoTest, onOpenScript, onOpenAssistant, showAssistant = false, showPhotoTest = true, loggedIn }) {
  const openLifeWiki = () => {
    globalThis.open('https://conwaylife.com/wiki/Main_Page', '_blank');
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title="Script Playground">
        <IconButton size="small" onClick={onOpenScript} aria-label="script-playground"><CodeIcon fontSize="small" /></IconButton>
      </Tooltip>
      {showAssistant ? (
        <Tooltip title="AI Assistant">
          <IconButton size="small" onClick={onOpenAssistant} aria-label="ai-assistant"><AutoAwesomeIcon fontSize="small" /></IconButton>
        </Tooltip>
      ) : null}
      {showPhotoTest ? (
        <Tooltip title="Photosensitivity Test">
          <IconButton size="small" onClick={onOpenPhotoTest} aria-label="photosensitivity-test"><BugReportIcon fontSize="small" /></IconButton>
        </Tooltip>
      ) : null}
      <IconButton size="small" onClick={onOpenChart} aria-label="chart" data-testid="toggle-chart"><BarChartIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={onOpenImport} aria-label="import"><Tooltip title="Import Shape"><ImportIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={openLifeWiki} aria-label="lifewiki"><Tooltip title="LifeWiki"><LanguageIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={onOpenDonate} aria-label="donate"><Tooltip title="Donate"><DonateIcon fontSize="small" /></Tooltip></IconButton>
      <IconButton size="small" onClick={onOpenHelp} aria-label="help"><Tooltip title="Help"><HelpIcon fontSize="small" /></Tooltip></IconButton>
      <Tooltip title={`Version: v${FRONTEND_VERSION}\nBuild: ${FRONTEND_TIMESTAMP}`.replace(/\n/g, '\u000A')} placement="bottom">
        <span>
          <IconButton size="small" onClick={onOpenAbout} aria-label="about"><InfoIcon fontSize="small" /></IconButton>
        </span>
      </Tooltip>
      <IconButton size="small" onClick={onOpenOptions} aria-label="options" data-testid="options-icon-button"><SettingsIcon fontSize="small" /></IconButton>
      {/* User profile icon to the right of settings */}
      <IconButton size="small" onClick={onOpenUser} aria-label="user-profile" data-testid="user-profile-icon">
        {loggedIn ? <UserLoggedInIcon fontSize="small" /> : <UserIcon fontSize="small" />}
      </IconButton>
    </Stack>
  );
}

AuxActions.propTypes = {
  onOpenChart: PropTypes.func.isRequired,
  onOpenImport: PropTypes.func.isRequired,
  onOpenHelp: PropTypes.func.isRequired,
  onOpenAbout: PropTypes.func.isRequired,
  onOpenOptions: PropTypes.func.isRequired,
  onOpenScript: PropTypes.func.isRequired,
  onOpenAssistant: PropTypes.func,
  showAssistant: PropTypes.bool,
  showPhotoTest: PropTypes.bool,
  onOpenDonate: PropTypes.func,
  onOpenUser: PropTypes.func,
  onOpenPhotoTest: PropTypes.func,
  loggedIn: PropTypes.bool
};

export default AuxActions;

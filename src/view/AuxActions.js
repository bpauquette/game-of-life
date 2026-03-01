import React, { useCallback, useMemo, useState } from 'react';
import { BarChart as BarChartIcon, CloudDownload as ImportIcon, Help as HelpIcon, Info as InfoIcon, Language as LanguageIcon, LockPerson as UserLoggedInIcon, PsychologyAlt as UserIcon, Settings as SettingsIcon, VolunteerActivism as SupportIcon } from '@mui/icons-material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import PropTypes from 'prop-types';
import { FRONTEND_TIMESTAMP, FRONTEND_VERSION } from '../version.js';

function AuxActions({
  onOpenChart,
  onOpenHelp,
  onOpenAbout,
  onOpenOptions,
  onOpenUser,
  onOpenImport,
  onOpenSupport,
  onOpenPhotoTest,
  onOpenScript,
  onOpenAssistant,
  showAssistant = false,
  showPhotoTest = true,
  photoTestEnabled = true,
  loggedIn,
  compact = false
}) {
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const moreOpen = Boolean(moreAnchorEl);

  const openLifeWiki = useCallback(() => {
    globalThis.open('https://conwaylife.com/wiki/Main_Page', '_blank');
  }, []);

  const closeMoreMenu = () => setMoreAnchorEl(null);

  const mobileMenuItems = useMemo(() => {
    const items = [
      { key: 'script', label: 'Script Playground', icon: <CodeIcon fontSize="small" />, onClick: onOpenScript, disabled: false },
      { key: 'chart', label: 'Chart', icon: <BarChartIcon fontSize="small" />, onClick: onOpenChart, disabled: false },
      { key: 'lifewiki', label: 'LifeWiki', icon: <LanguageIcon fontSize="small" />, onClick: openLifeWiki, disabled: false },
      { key: 'support', label: 'Support', icon: <SupportIcon fontSize="small" />, onClick: onOpenSupport, disabled: false },
      { key: 'help', label: 'Help', icon: <HelpIcon fontSize="small" />, onClick: onOpenHelp, disabled: false },
      { key: 'about', label: 'About (Version info)', icon: <InfoIcon fontSize="small" />, onClick: onOpenAbout, disabled: false },
    ];
    if (showAssistant) {
      items.splice(1, 0, {
        key: 'assistant',
        label: 'AI Assistant',
        icon: <AutoAwesomeIcon fontSize="small" />,
        onClick: onOpenAssistant,
        disabled: false
      });
    }
    if (showPhotoTest) {
      items.splice(showAssistant ? 2 : 1, 0, {
        key: 'photo',
        label: 'Photosensitivity Test',
        icon: <BugReportIcon fontSize="small" />,
        onClick: onOpenPhotoTest,
        disabled: !photoTestEnabled
      });
    }
    return items;
  }, [onOpenAbout, onOpenAssistant, onOpenChart, onOpenHelp, onOpenPhotoTest, onOpenScript, onOpenSupport, openLifeWiki, photoTestEnabled, showAssistant, showPhotoTest]);

  if (compact) {
    return (
      <>
        <Stack direction="row" spacing={0.25} alignItems="center">
          <Tooltip title="Import Shape">
            <IconButton size="small" onClick={onOpenImport} aria-label="import"><ImportIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Options">
            <IconButton size="small" onClick={onOpenOptions} aria-label="options" data-testid="options-icon-button"><SettingsIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title={loggedIn ? 'User Profile' : 'Login / Register'}>
            <IconButton size="small" onClick={onOpenUser} aria-label="user-profile" data-testid="user-profile-icon">
              {loggedIn ? <UserLoggedInIcon fontSize="small" /> : <UserIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="More actions">
            <IconButton
              size="small"
              aria-label="more-actions"
              aria-haspopup="menu"
              aria-expanded={moreOpen ? 'true' : undefined}
              aria-controls={moreOpen ? 'mobile-more-actions-menu' : undefined}
              onClick={(event) => setMoreAnchorEl(event.currentTarget)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Menu
          id="mobile-more-actions-menu"
          anchorEl={moreAnchorEl}
          open={moreOpen}
          onClose={closeMoreMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {mobileMenuItems.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && item.key === 'chart' && <Divider />}
              <MenuItem
                onClick={() => {
                  closeMoreMenu();
                  item.onClick?.();
                }}
                disabled={item.disabled}
                data-testid={`more-${item.key}`}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.key === 'about' ? `v${FRONTEND_VERSION} • ${FRONTEND_TIMESTAMP}` : undefined}
                />
              </MenuItem>
            </React.Fragment>
          ))}
        </Menu>
      </>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: compact ? '100%' : 'none',
        overflowX: compact ? 'auto' : 'visible',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin'
      }}
    >
      <Stack direction="row" spacing={compact ? 0.25 : 1} alignItems="center" sx={{ width: 'max-content', minWidth: '100%' }}>
        <Tooltip title="Script Playground">
          <IconButton size="small" onClick={onOpenScript} aria-label="script-playground"><CodeIcon fontSize="small" /></IconButton>
        </Tooltip>
        {showAssistant ? (
          <Tooltip title="AI Assistant">
            <IconButton size="small" onClick={onOpenAssistant} aria-label="ai-assistant"><AutoAwesomeIcon fontSize="small" /></IconButton>
          </Tooltip>
        ) : null}
        {showPhotoTest ? (
          <Tooltip title={photoTestEnabled ? 'Photosensitivity Test' : 'Enable ADA Compliance Mode to use Photosensitivity Test'}>
            <span>
              <IconButton
                size="small"
                onClick={onOpenPhotoTest}
                aria-label="photosensitivity-test"
                disabled={!photoTestEnabled}
              >
                <BugReportIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <IconButton size="small" onClick={onOpenChart} aria-label="chart" data-testid="toggle-chart"><BarChartIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={onOpenImport} aria-label="import"><Tooltip title="Import Shape"><ImportIcon fontSize="small" /></Tooltip></IconButton>
        <IconButton size="small" onClick={openLifeWiki} aria-label="lifewiki"><Tooltip title="LifeWiki"><LanguageIcon fontSize="small" /></Tooltip></IconButton>
        <IconButton size="small" onClick={onOpenSupport} aria-label="support"><Tooltip title="Support"><SupportIcon fontSize="small" /></Tooltip></IconButton>
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
    </Box>
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
  photoTestEnabled: PropTypes.bool,
  onOpenSupport: PropTypes.func,
  onOpenUser: PropTypes.func,
  onOpenPhotoTest: PropTypes.func,
  loggedIn: PropTypes.bool,
  compact: PropTypes.bool
};

export default AuxActions;

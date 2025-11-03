import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Tabs, Tab, Link, List, ListItem, ListItemText, Divider, Card, CardContent, Chip } from '@mui/material';
import { Brush as BrushIcon, ShowChart as LineAxisIcon, CropSquare as CropSquareIcon, RadioButtonUnchecked as RadioButtonUncheckedIcon, Casino as CasinoIcon, Widgets as WidgetsIcon, PlayArrow as PlayArrowIcon, BarChart as BarChartIcon, Settings as SettingsIcon } from '@mui/icons-material';
import OvalIcon from './components/OvalIcon';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`help-tabpanel-${index}`} aria-labelledby={`help-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

export default function HelpDialog({ open, onClose }) {
  const [tabValue, setTabValue] = useState(0);
  const ICON_COLOR_PRIMARY = 'primary.main';
  const handleTabChange = (_e, newValue) => setTabValue(newValue);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { minHeight: '70vh', maxHeight: '90vh' } } }}>
      <DialogTitle>Conway's Game of Life - Help & Guide</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="help tabs">
            <Tab label="Game Rules" />
            <Tab label="Tools & Controls" />
            <Tab label="Tips & Strategies" />
            <Tab label="Resources" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>What is Conway's Game of Life?</Typography>
          <Typography sx={{ mb: 2 }}>The Game of Life is a cellular automaton. You set the initial pattern and watch it evolve without additional input.</Typography>
          <Typography variant="h6" gutterBottom>The Rules</Typography>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <List dense>
                <ListItem><ListItemText primary="Birth" secondary="A dead cell with exactly 3 live neighbors becomes alive" /></ListItem>
                <ListItem><ListItemText primary="Survival" secondary="A live cell with 2 or 3 neighbors stays alive" /></ListItem>
                <ListItem><ListItemText primary="Death by Isolation" secondary="Fewer than 2 neighbors" /></ListItem>
                <ListItem><ListItemText primary="Death by Overpopulation" secondary="More than 3 neighbors" /></ListItem>
              </List>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>Drawing Tools</Typography>
          <List>
            <ListItem><BrushIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Freehand Draw" secondary="Click-drag to draw. Single-click toggles a cell." /></ListItem>
            <ListItem><LineAxisIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Line Tool" secondary="Press-drag-release to place a straight line. Overlay previews the line." /></ListItem>
            <ListItem><CropSquareIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Rectangle Tool" secondary="Press-drag-release to place an axis-aligned outline rectangle (not filled)." /></ListItem>
            <ListItem><RadioButtonUncheckedIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Circle Tool" secondary="Press-drag-release to place a circle." /></ListItem>
            <ListItem><OvalIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Oval Tool" secondary="Press-drag-release to place an ellipse." /></ListItem>
            <ListItem><CasinoIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Random Rectangle" secondary="Press-drag-release to fill an area with random live cells." /></ListItem>
            <ListItem><WidgetsIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Shapes Library" secondary="Pick predefined patterns. A preview follows the cursor; click to place." /></ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>Shapes & Capture</Typography>
          <List>
            <ListItem><ListItemText primary="Recent Shapes Strip" secondary="Each slot has ⟳90 which rotates the shape 90° clockwise. Thumbnail and preview update immediately." /></ListItem>
            <ListItem><ListItemText primary="Rotate Direction" secondary="Rotation is visually clockwise; internally this maps to a 270° math rotation (y-down screen)." /></ListItem>
            <ListItem><ListItemText primary="Capture Tool" secondary="Drag a rectangle to capture cells. On release, a dialog opens with a live preview and autofocus fields; typing doesn't trigger global shortcuts." /></ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Simulation Controls</Typography>
          <List>
            <ListItem><PlayArrowIcon sx={{ mr: 2, color: 'success.main' }} /><ListItemText primary="Start/Stop" secondary="Toggle simulation (Spacebar)." /></ListItem>
            <ListItem><ListItemText primary="Step" secondary="Advance exactly one generation." sx={{ ml: 4 }} /></ListItem>
            <ListItem><ListItemText primary="Clear" secondary="Reset to generation 0 and clear all cells." sx={{ ml: 4 }} /></ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>Visualization & Analysis</Typography>
          <List>
            <ListItem><BarChartIcon sx={{ mr: 2, color: 'info.main' }} /><ListItemText primary="Population Chart" secondary="Graph of population over time." /></ListItem>
            <ListItem><SettingsIcon sx={{ mr: 2, color: 'action.active' }} /><ListItemText primary="Settings" secondary="Change color scheme and options. Colors update immediately." /></ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>Navigation</Typography>
          <List dense>
            <ListItem><ListItemText primary="Mouse Wheel" secondary="Zoom in/out (snaps to device pixels)." /></ListItem>
            <ListItem><ListItemText primary="Arrow Keys" secondary="Pan the grid; hold Shift to pan faster." /></ListItem>
            <ListItem><ListItemText primary="Center View" secondary="Click crosshair or press 'f' to focus on live cells." /></ListItem>
            <ListItem><ListItemText primary="Typing in Dialogs" secondary="Global shortcuts are ignored while typing in inputs/textareas." /></ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Getting Started Tips</Typography>
          <List>
            <ListItem><ListItemText primary="Start Simple" secondary="Try a Blinker (3 in a row) to see oscillation." /></ListItem>
            <ListItem><ListItemText primary="Use the Library" secondary="Load gliders, oscillators, and spaceships quickly." /></ListItem>
            <ListItem><ListItemText primary="Explore R-pentomino" secondary="A small 5-cell pattern with long evolution." /></ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Resources</Typography>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>LifeWiki</Typography>
              <Link href="https://conwaylife.com/wiki/Main_Page" target="_blank" rel="noopener noreferrer" variant="body2">https://conwaylife.com/wiki/Main_Page</Link>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>Pattern Collections</Typography>
              <Link href="https://conwaylife.com/wiki/Category:Patterns" target="_blank" rel="noopener noreferrer" variant="body2" display="block">LifeWiki Pattern Database</Link>
              <Link href="https://copy.sh/life/" target="_blank" rel="noopener noreferrer" variant="body2" display="block">Game of Life Pattern Search</Link>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>Life Lexicon — Pattern Catalog Attribution</Typography>
              <Typography sx={{ mb: 1 }} variant="body2">
                This application includes patterns from the Life Lexicon, Release 29 (July 2018), compiled by Stephen A. Silver and updated by Dave Greene and David Bell.
              </Typography>
              <Typography sx={{ mb: 1 }} variant="body2">
                © Stephen A. Silver, 1997–2018. Used under the Creative Commons Attribution-ShareAlike 3.0 license (CC BY-SA 3.0).
              </Typography>
              <Typography sx={{ mb: 1 }} variant="body2">
                Major contributors include John Conway, Dean Hickerson, David Bell, Bill Gosper, Bob Wainwright, Noam Elkies, Nathan Thompson, Harold McIntosh, Dan Hoey, Alan Hensel, and the Conway's Game of Life community.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Link href="http://conwaylife.com/ref/lexicon/" target="_blank" rel="noopener noreferrer" variant="body2">Life Lexicon Home</Link>
                <Link href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" variant="body2">CC BY-SA 3.0 License</Link>
              </Box>
            </CardContent>
          </Card>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>File Formats</Typography>
          <Typography sx={{ mb: 2 }}>Common: RLE, Plaintext (.life), Life 1.06</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label="RLE" variant="outlined" />
            <Chip label="Plaintext (.life)" variant="outlined" />
            <Chip label="Life 1.06" variant="outlined" />
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

HelpDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
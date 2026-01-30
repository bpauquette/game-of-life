import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Tabs, Tab, Link, List, ListItem, ListItemText, Divider, Card, CardContent, Chip } from '@mui/material';
import { Brush as BrushIcon, ShowChart as LineAxisIcon, CropSquare as CropSquareIcon, RadioButtonUnchecked as RadioButtonUncheckedIcon, Casino as CasinoIcon, Widgets as WidgetsIcon, PlayArrow as PlayArrowIcon, BarChart as BarChartIcon, Settings as SettingsIcon, Backspace as BackspaceIcon } from '@mui/icons-material';
import OvalIcon from './components/OvalIcon.js';

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
      <DialogTitle>Conway&apos;s Game of Life - Help &amp; Guide</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="help tabs">
            <Tab label="Game Rules" />
            <Tab label="Tools & Controls" />
            <Tab label="Keyboard Shortcuts" />
            <Tab label="Tips & Strategies" />
            <Tab label="Resources" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h5" component="h2" gutterBottom>What is Conway&apos;s Game of Life?</Typography>
          <Typography sx={{ mb: 2 }}>The Game of Life is a cellular automaton. You set the initial pattern and watch it evolve without additional input.</Typography>
          <Typography variant="h5" component="h2" gutterBottom>The Rules</Typography>
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
          <Typography variant="h5" component="h2" gutterBottom>Drawing Tools</Typography>
          <List>
            <ListItem><BrushIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Freehand Draw" secondary="Click-drag to paint cells. Single-click toggles a cell with the current tool overlay." /></ListItem>
            <ListItem><BackspaceIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Erase" secondary="Scrub away cells with the same precision as drawing—great for trimming edges or carving tunnels." /></ListItem>
            <ListItem><LineAxisIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Line Tool" secondary="Press-drag-release to place a straight line. The translucent preview shows the exact segment before you commit." /></ListItem>
            <ListItem><CropSquareIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Rectangle Tool" secondary="Press-drag-release to place an outline rectangle. Great for borders and staging areas." /></ListItem>
            <ListItem><RadioButtonUncheckedIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Circle Tool" secondary="Press-drag-release to place a circle that snaps to the current cell size." /></ListItem>
            <ListItem><OvalIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Oval Tool" secondary="Press-drag-release to place an ellipse with live overlay feedback." /></ListItem>
            <ListItem><CasinoIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Random Rectangle" secondary="Fill a region with randomized live cells for entropy tests." /></ListItem>
            <ListItem><WidgetsIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} /><ListItemText primary="Shapes Library" secondary="Search or browse curated patterns atop a whiz-bang virtual list, so even thousands of shapes stay silky smooth. A preview follows the cursor (or finger) until you click/tap to place." /></ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>Shapes & Capture</Typography>
          <List>
            <ListItem><ListItemText primary="Recent Shapes Strip" secondary="Pinned thumbnails remember metadata, color previews, and clockwise rotations via the ⟳90 action." /></ListItem>
            <ListItem><ListItemText primary="Shape Palette Dialog" secondary="Loads asynchronously with a mobile-friendly loading overlay, supports search, sort, and tap-to-place previews." /></ListItem>
            <ListItem><ListItemText primary="Capture Tool" secondary="Drag a rectangle to capture cells. The capture dialog autofocuses inputs, shows a live preview, and keeps global shortcuts suspended while typing." /></ListItem>
          </List>

          <Typography variant="h5" component="h2" gutterBottom>Simulation Controls</Typography>
          <List>
            <ListItem><PlayArrowIcon sx={{ mr: 2, color: 'success.main' }} /><ListItemText primary="Start/Stop" secondary="Toggle simulation (Spacebar)." /></ListItem>
            <ListItem><ListItemText primary="Step" secondary="Advance exactly one generation." sx={{ ml: 4 }} /></ListItem>
            <ListItem><ListItemText primary="Clear" secondary="Reset to generation 0 and clear all cells." sx={{ ml: 4 }} /></ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>Visualization & Analysis</Typography>
          <List>
            <ListItem><BarChartIcon sx={{ mr: 2, color: 'info.main' }} /><ListItemText primary="Population Chart" secondary="Live-updating graph that stays in sync with every generation, even while fast-forwarding." /></ListItem>
            <ListItem><SettingsIcon sx={{ mr: 2, color: 'action.active' }} /><ListItemText primary="Settings" secondary="Switch color schemes, tweak performance budgets, and enable diagnostics—changes redraw instantly." /></ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>Options Panel (Gear Icon)</Typography>
          <Typography sx={{ mb: 1 }}>Tap the gear to open the Options panel; every control in that dialog is wired to the code paths below:</Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Color scheme"
                secondary="Populated from the full colorSchemes map and applied via setColorSchemeKey → GameOfLifeApp → GameMVC, so the canvas redraws immediately with your palette." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Steady globalThis & population tolerance"
                secondary="Both values are clamped (globalThis ≥1, tolerance ≥0) before calling setPopWindowSize/setPopTolerance; GameModel.isStable(globalThis, tolerance) uses them whenever we evaluate steady-state runs." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Show Speed Gauge"
                secondary="Toggles the uiState.showSpeedGauge flag through setShowSpeedGauge so the floating performance widget (and forthcoming overlays) know whether to render." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Max FPS / Max GPS"
                secondary="Inputs clamp to 1–120 FPS and 1–60 GPS before flowing into setPerformanceSettings, and the controller now retunes its animation loop immediately so both rendering and stepping respect your budgets." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Confirm before clearing"
                secondary="Backed by localStorage.confirmOnClear and consumed by RunControlGroup—when enabled, tapping Clear opens the confirmation dialog instead of wiping instantly." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Draw while running"
                secondary="Writes to localStorage.drawWhileRunning and is read in GameController.handleMouseDown/Move so drawing tools can paint even while the simulation is advancing." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Toggle Draw Mode"
                secondary="Stores localStorage.drawToggleMode; when true the draw tool uses the legacy 'flip whatever you drag over' path in drawTool.js, otherwise it paints continuously." />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Detect Stable Population"
                secondary="Flips the detectStablePopulation flag via setDetectStablePopulation so the steady-state indicator knows you've opted in as soon as its detector wiring lands." />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom sx={{ color: 'warning.main' }}>⚠️ ADA Compliance Mode</Typography>
          <Card variant="outlined" sx={{ mb: 2, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>What is ADA Compliance?</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                ADA (Americans with Disabilities Act) compliance ensures the application is safe for users with photosensitive epilepsy. 
                This mode enforces strict limits on animation speed and visual effects to prevent seizures triggered by rapid flashing.
              </Typography>

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Why is it Necessary?</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Under WCAG 2.1 (Web Content Accessibility Guidelines), web content must not flash more than 3 times per second 
                or exceed specific flash area thresholds. Without these protections, animations could trigger photosensitive seizures 
                in susceptible individuals. This is a legal requirement and a critical safety feature.
              </Typography>

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>What Changes When Enabled?</Typography>
              <List dense sx={{ mb: 2 }}>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText 
                    primary="• Frame rate capped at 2 FPS" 
                    secondary="Both rendering and game stepping are throttled to prevent rapid flashing" 
                  />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText 
                    primary="• Low-contrast color scheme (adaSafe)" 
                    secondary="Reduces luminance differences to minimize flash intensity" 
                  />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText 
                    primary="• Canvas limited to 160×160 pixels" 
                    secondary="Restricts visible flash area below safety threshold (87,296 pixels)" 
                  />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText 
                    primary="• Script execution HUD hidden" 
                    secondary="Removes translucent overlays that could contribute to flash area" 
                  />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText 
                    primary="• FPS/GPS controls locked" 
                    secondary="Speed settings cannot be changed while ADA mode is active" 
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>How to Enable/Disable</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>To Enable:</strong> Open Options (gear icon or press &apos;O&apos;) &rarr; Check &quot;Enable ADA Compliance&quot;
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>To Disable:</strong> Open Options &rarr; Uncheck &quot;Enable ADA Compliance&quot;
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                Note: ADA compliance is enabled by default for safety. A legal warning is displayed when disabled.
              </Typography>

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Photosensitivity Testing</Typography>
              <Typography variant="body2">
                Advanced users can test photosensitivity compliance using the built-in tester. Enable it in Options &rarr; 
                &quot;Enable Photosensitivity Tester&quot; &rarr; then access it via the bug icon in the header. The tester analyzes 
                flash rate (must be ≤3/sec) and flash area (must be ≤87,296px) to verify WCAG compliance.
              </Typography>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>Navigation</Typography>
          <List dense>
            <ListItem><ListItemText primary="Mouse Wheel / Trackpad" secondary="Zoom in or out around the pointer. Rendering keeps cell edges aligned with device pixels." /></ListItem>
            <ListItem><ListItemText primary="Pinch-to-Zoom (Touch)" secondary="Use two fingers to pinch or spread. The zoom focuses on the pinch center and includes a gentle pan when the centroid moves." /></ListItem>
            <ListItem><ListItemText primary="Two-Finger Pan" secondary="While pinching, drag both fingers to slide the world without changing zoom." /></ListItem>
            <ListItem><ListItemText primary="Arrow Keys" secondary="Pan the grid; hold Shift for faster travel." /></ListItem>
            <ListItem><ListItemText primary="Center View" secondary="Press 'f' to snap the viewport around all live cells." /></ListItem>
            <ListItem><ListItemText primary="Typing in Dialogs" secondary="Global shortcuts pause while inputs, textareas, or contentEditable fields are focused." /></ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" component="h2" gutterBottom>Keyboard Shortcuts (ADA Compliant)</Typography>
          <Typography sx={{ mb: 2 }}>All GUI actions are accessible via keyboard for full accessibility compliance.</Typography>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Playback Controls</Typography>
          <List dense>
            <ListItem><ListItemText primary={<><strong>Space</strong> - Play/Pause</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>S</strong> - Step one generation</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>Ctrl+C</strong> - Clear grid</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>[</strong> - Decrease speed</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>]</strong> - Increase speed</>} /></ListItem>
          </List>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>View & Navigation</Typography>
          <List dense>
            <ListItem><ListItemText primary={<><strong>Arrow Keys</strong> - Pan view</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>+/=</strong> - Zoom in</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>-</strong> - Zoom out</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>F</strong> - Center on live cells</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>H</strong> - Hide/Show UI controls</>} /></ListItem>
          </List>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Tool Selection</Typography>
          <List dense>
            <ListItem><ListItemText primary={<><strong>1</strong> - Draw tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>2</strong> - Eraser tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>3</strong> - Pan tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>4</strong> - Shapes tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>5</strong> - Rectangle tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>6</strong> - Line tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>7</strong> - Circle tool</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>8</strong> - Capture tool</>} /></ListItem>
          </List>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Editing</Typography>
          <List dense>
            <ListItem><ListItemText primary={<><strong>Ctrl+Z</strong> - Undo</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>Ctrl+Shift+Z</strong> or <strong>Ctrl+Y</strong> - Redo</>} /></ListItem>
          </List>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Dialogs & Windows</Typography>
          <List dense>
            <ListItem><ListItemText primary={<><strong>P</strong> - Open shape palette</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>O</strong> - Open options</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>?</strong> - Open help (this dialog)</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>G</strong> - Toggle population chart</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>Ctrl+S</strong> - Save grid</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>Ctrl+L</strong> - Load grid</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>Esc</strong> - Close dialog/cancel</>} /></ListItem>
          </List>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Color Schemes</Typography>
          <List dense>
            <ListItem><ListItemText primary={<><strong>T</strong> - Next color scheme</>} /></ListItem>
            <ListItem><ListItemText primary={<><strong>Shift+T</strong> - Previous color scheme</>} /></ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" component="h2" gutterBottom>Getting Started Tips</Typography>
          <List>
            <ListItem><ListItemText primary="Start Simple" secondary="Try a Blinker (3 in a row) to see oscillation." /></ListItem>
            <ListItem><ListItemText primary="Use the Library" secondary="Load gliders, oscillators, and spaceships quickly." /></ListItem>
            <ListItem><ListItemText primary="Explore R-pentomino" secondary="A small 5-cell pattern with long evolution." /></ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h5" component="h2" gutterBottom>Resources</Typography>
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
                Major contributors include John Conway, Dean Hickerson, David Bell, Bill Gosper, Bob Wainwright, Noam Elkies, Nathan Thompson, Harold McIntosh, Dan Hoey, Alan Hensel, and the Conway&apos;s Game of Life community.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Link href="http://conwaylife.com/ref/lexicon/" target="_blank" rel="noopener noreferrer" variant="body2">Life Lexicon Home</Link>
                <Link href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" variant="body2">CC BY-SA 3.0 License</Link>
              </Box>
            </CardContent>
          </Card>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>File Formats</Typography>
          <Typography sx={{ mb: 2 }}>Common: RLE, Plaintext (.life), Life 1.06</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label="RLE" variant="outlined" />
            <Chip label="Plaintext (.life)" variant="outlined" />
            <Chip label="Life 1.06" variant="outlined" />
          </Box>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>About the Builder</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                This app was crafted by Bryan Pauquette over several weeks as an experiment in pairing hands-on React/Node work with AI-assisted coding workflows.
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Bryan is usually on the lookout for the next opportunity—say hi or reach out via LinkedIn.
              </Typography>
              <Link href="https://www.linkedin.com/in/bryanpauquette/" target="_blank" rel="noopener noreferrer" variant="body2">
                linkedin.com/in/bryanpauquette/
              </Link>
            </CardContent>
          </Card>
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
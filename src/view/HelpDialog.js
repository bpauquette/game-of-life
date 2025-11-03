import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
          <Typography variant="h6" gutterBottom>
            Drawing Tools
          </Typography>
  DialogActions,
  Button,
  Box,
  Typography,
                primary="Freehand Draw" 
                secondary="Click and drag to draw living cells freely. Single-click toggles one cell."
  Link,
  List,
  ListItem,
  ListItemText,
  Divider,
                primary="Line Tool" 
                secondary="Draw straight lines of living cells between two points. Press and hold, move to set the endpoint, then release. A preview overlay shows the line before placement."
  Chip
} from '@mui/material';
import {
  Brush as BrushIcon,
  ShowChart as LineAxisIcon,
                primary="Rectangle Tool" 
                secondary="Create filled rectangles of living cells. Press and drag to size; release to place."
  Casino as CasinoIcon,
  Widgets as WidgetsIcon,
  PlayArrow as PlayArrowIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon
                primary="Circle Tool" 
                secondary="Draw circles that fit within a bounding box. Press and drag to size; release to place."

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
                primary="Oval Tool" 
                secondary="Create elliptical patterns within a bounding box. Press and drag to size; release to place."
      aria-labelledby={`help-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
                secondary="Fill a rectangular area with randomly placed living cells. Press and drag to size; release to commit."
      )}
    </div>
  );
}

                primary="Shapes Library" 
                secondary="Place pre-defined patterns like gliders, oscillators, and spaceships. Select a shape from the palette or recent strip; a preview overlay follows your cursor, and a click places the shape."
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

export default function HelpDialog({ open, onClose }) {

          <Typography variant="h6" gutterBottom>
            Shapes & Capture
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Recent Shapes Strip" 
                secondary={
                  <>
                    Choose from your recently used shapes. Each tile has a ⟳90 button that rotates the shape 90° clockwise. The thumbnail and on-canvas preview update immediately.
                  </>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Rotate Direction" 
                secondary="Rotation is visually clockwise (y-down screen coordinates). Each click rotates the selected shape 90° clockwise."
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Capture Tool" 
                secondary={
                  <>
                    Click and drag to select a rectangular region of the grid. When you release, a dialog opens to name and describe the captured pattern. The preview is shown in the dialog, and fields autofocus so you can type immediately. Spaces and normal typing are supported without triggering global shortcuts.
                  </>
                }
              />
            </ListItem>
          </List>
  const [tabValue, setTabValue] = useState(0);

  // Extract repeated style keys to constants to satisfy sonarjs/no-duplicate-string
  const ICON_COLOR_PRIMARY = 'primary.main';

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

                secondary="Begin or pause the automatic simulation (shortcut: Spacebar)."
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
                secondary="Advance the simulation by exactly one generation."
        paper: {
          sx: { minHeight: '70vh', maxHeight: '90vh' }
        }
      }}
    >
      <DialogTitle>
                secondary="Remove all living cells and reset to generation 0."
      </DialogTitle>
      
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
          <Typography variant="h6" gutterBottom>
            What is Conway's Game of Life?
                secondary="View population changes over time in a graphical format."
          <Typography sx={{ mb: 2 }}>
            The Game of Life is a cellular automaton devised by mathematician John Conway in 1970. 
            It's a zero-player game where the evolution is determined by its initial state, requiring 
            no further input. You interact by creating an initial configuration and observing how it evolves.
          </Typography>

                secondary="Adjust color schemes, population stability detection, and performance preferences. Color scheme changes take effect immediately and update grid/cell colors."
            The Rules
          </Typography>
          <Typography sx={{ mb: 2 }}>
            The universe is an infinite two-dimensional orthogonal grid of square cells, each in one of two states:{' '}
            <strong>alive</strong> or <strong>dead</strong>. Every cell interacts with its eight neighbors.
          </Typography>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                At each step in time, the following transitions occur:
              </Typography>
              <List dense>
                secondary="Zoom in and out of the grid (snapped to device pixels for crisp rendering)."
                  <ListItemText 
                    primary="Birth" 
                    secondary="A dead cell with exactly 3 live neighbors becomes alive" 
                  />
                </ListItem>
                secondary="Pan around the infinite grid. Hold Shift to pan faster."
                  <ListItemText 
                    primary="Survival" 
                    secondary="A live cell with 2 or 3 live neighbors stays alive" 
                  />
                </ListItem>
                secondary="Use the Center button (crosshair icon) or press 'f' to focus the viewport on all live cells."
                  <ListItemText 
                    primary="Death by Isolation" 
            <ListItem>
              <ListItemText 
                primary="Typing in Dialogs" 
                secondary="When typing in inputs or text areas (e.g., capture dialog), global shortcuts are temporarily disabled so you can enter spaces and text normally."
              />
            </ListItem>
                    secondary="A live cell with fewer than 2 neighbors dies" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Death by Overpopulation" 
                    secondary="A live cell with more than 3 neighbors dies" 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>
            Common Patterns
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
            <Box>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" color="primary">Still Lifes</Typography>
                  <Typography variant="body2">
                    Patterns that don't change: Block, Beehive, Loaf, Boat
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" color="primary">Oscillators</Typography>
                  <Typography variant="body2">
                    Patterns that return to initial state: Blinker, Toad, Beacon
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" color="primary">Spaceships</Typography>
                  <Typography variant="body2">
                    Moving patterns: Glider, Lightweight Spaceship (LWSS)
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" color="primary">Methuselahs</Typography>
                  <Typography variant="body2">
                    Small patterns that evolve for many generations: R-pentomino, Acorn
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Drawing Tools
          </Typography>
          <List>
            <ListItem>
              <BrushIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Freehand Draw" 
                secondary="Click and drag to draw living cells freely"
              />
            </ListItem>
            <ListItem>
              <LineAxisIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Line Tool" 
                secondary="Draw straight lines of living cells between two points"
              />
            </ListItem>
            <ListItem>
              <CropSquareIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Rectangle Tool" 
                secondary="Create filled rectangles of living cells"
              />
            </ListItem>
            <ListItem>
              <RadioButtonUncheckedIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Circle Tool" 
                secondary="Draw circles that fit within a bounding box"
              />
            </ListItem>
            <ListItem>
              <OvalIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Oval Tool" 
                secondary="Create elliptical patterns within a bounding box"
              />
            </ListItem>
            <ListItem>
              <CasinoIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Random Rectangle" 
                secondary="Fill a rectangular area with randomly placed living cells"
              />
            </ListItem>
            <ListItem>
              <WidgetsIcon sx={{ mr: 2, color: ICON_COLOR_PRIMARY }} />
              <ListItemText 
                primary="Shapes Library" 
                secondary="Place pre-defined patterns like gliders, oscillators, and spaceships"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Simulation Controls
          </Typography>
          <List>
            <ListItem>
              <PlayArrowIcon sx={{ mr: 2, color: 'success.main' }} />
              <ListItemText 
                primary="Start/Stop" 
                secondary="Begin or pause the automatic simulation"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Step" 
                secondary="Advance the simulation by exactly one generation"
                sx={{ ml: 4 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Clear" 
                secondary="Remove all living cells and reset to generation 0"
                sx={{ ml: 4 }}
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Visualization & Analysis
          </Typography>
          <List>
            <ListItem>
              <BarChartIcon sx={{ mr: 2, color: 'info.main' }} />
              <ListItemText 
                primary="Population Chart" 
                secondary="View population changes over time in a graphical format"
              />
            </ListItem>
            <ListItem>
              <SettingsIcon sx={{ mr: 2, color: 'action.active' }} />
              <ListItemText 
                primary="Settings" 
                secondary="Adjust color schemes, population stability detection, and other preferences"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Navigation
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Mouse Wheel" 
                secondary="Zoom in and out of the grid"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Arrow Keys" 
                secondary="Pan around the infinite grid"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Mouse Drag" 
                secondary="Pan by clicking and dragging (when no tool is selected)"
              />
            </ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Getting Started Tips
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Start Simple" 
                secondary="Begin with basic patterns like a Blinker (3 cells in a row) to understand the rules"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Use the Shapes Library" 
                secondary="Explore pre-made patterns to see interesting behaviors without manual drawing"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Experiment with R-pentomino" 
                secondary="This simple 5-cell pattern evolves for over 1000 generations before stabilizing"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Watch for Steady States" 
                secondary="The app detects when patterns become stable or periodic - look for the indicator"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Advanced Techniques
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Glider Guns" 
                secondary="Create patterns that continuously generate gliders for complex interactions"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Collision Studies" 
                secondary="Set up gliders or spaceships to collide and observe the resulting patterns"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Garden of Eden Patterns" 
                secondary="Some configurations can never arise from any previous state - these are rare and interesting"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Population Analysis" 
                secondary="Use the population chart to study growth patterns and find equilibrium states"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Performance Tips
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Large Patterns" 
                secondary="The simulation is optimized for sparse patterns - performance may vary with density"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Zoom for Detail" 
                secondary="Zoom in to see individual cells clearly when working with complex patterns"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Use Step Mode" 
                secondary="For detailed analysis, use the Step button instead of continuous running"
              />
            </ListItem>
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Essential Resources
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                LifeWiki - The Ultimate Reference
              </Typography>
              <Typography sx={{ mb: 2 }}>
                The most comprehensive resource for Conway's Game of Life patterns, rules, and discoveries.
              </Typography>
              <Link 
                href="https://conwaylife.com/wiki/Main_Page" 
                target="_blank" 
                rel="noopener noreferrer"
                variant="body2"
              >
                https://conwaylife.com/wiki/Main_Page
              </Link>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Pattern Collections
              </Typography>
              <Typography sx={{ mb: 2 }}>
                Extensive libraries of Life patterns, from simple oscillators to complex constructions.
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Link 
                  href="https://conwaylife.com/wiki/Category:Patterns" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  variant="body2"
                  display="block"
                >
                  LifeWiki Pattern Database
                </Link>
              </Box>
              <Link 
                href="https://copy.sh/life/" 
                target="_blank" 
                rel="noopener noreferrer"
                variant="body2"
                display="block"
              >
                Game of Life Pattern Search
              </Link>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Life Lexicon - Pattern Catalog Attribution
              </Typography>
              <Typography sx={{ mb: 2 }}>
                This application includes patterns from the Life Lexicon, Release 29 (July 2018), 
                compiled by Stephen A. Silver and updated by Dave Greene and David Bell. 
                © Stephen Silver, 1997-2018, used under CC BY-SA 3.0 license.
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Major Contributors:</strong> John Conway, Dean Hickerson, David Bell, Bill Gosper, 
                Bob Wainwright, Noam Elkies, Nathan Thompson, Harold McIntosh, Dan Hoey, Alan Hensel, 
                and the Conway's Game of Life community.
              </Typography>
              <Link 
                href="http://conwaylife.com/ref/lexicon/" 
                target="_blank" 
                rel="noopener noreferrer"
                variant="body2"
              >
                Life Lexicon Home Page
              </Link>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Educational Resources
              </Typography>
              <Typography sx={{ mb: 2 }}>
                Learn about the mathematical foundations and computational aspects of cellular automata.
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Link 
                  href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  variant="body2"
                  display="block"
                >
                  Wikipedia: Conway's Game of Life
                </Link>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Link 
                  href="https://web.stanford.edu/class/cs106b/assignments/life/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  variant="body2"
                  display="block"
                >
                  Stanford CS106B: Life Assignment
                </Link>
              </Box>
              <Link 
                href="https://mathworld.wolfram.com/CellularAutomaton.html" 
                target="_blank" 
                rel="noopener noreferrer"
                variant="body2"
                display="block"
              >
                Wolfram MathWorld: Cellular Automata
              </Link>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                John Conway's Legacy
              </Typography>
              <Typography sx={{ mb: 2 }}>
                Learn about the mathematician who created this fascinating cellular automaton.
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Link 
                  href="https://en.wikipedia.org/wiki/John_Horton_Conway" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  variant="body2"
                  display="block"
                >
                  John Horton Conway - Biography
                </Link>
              </Box>
              <Link 
                href="https://www.scientificamerican.com/article/the-fantastic-combinations-of-john-conways-new-solitaire-game-life/" 
                target="_blank" 
                rel="noopener noreferrer"
                variant="body2"
                display="block"
              >
                Scientific American: The Original Article (1970)
              </Link>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            File Formats
          </Typography>
          <Typography sx={{ mb: 2 }}>
            Many Life patterns are shared using these standard formats:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label="RLE (Run Length Encoded)" variant="outlined" />
            <Chip label="Plaintext (.life)" variant="outlined" />
            <Chip label="Life 1.06" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            This application supports importing RLE patterns through the backend API.
          </Typography>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

HelpDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
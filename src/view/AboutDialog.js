import React from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Link,
  Divider,
  Card,
  CardContent,
  Chip,
  Grid,
} from "@mui/material";
import {
  GitHub as GitHubIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
} from "@mui/icons-material";

export default function AboutDialog({ open, onClose }) {
  // Get version from package.json - in a real app you might import this
  const version = "0.1.0";
  const buildDate = new Date().toLocaleDateString();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { minHeight: "60vh" },
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <InfoIcon color="primary" />
          About Conway's Game of Life
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Game of Life
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Interactive Cellular Automaton Simulator
          </Typography>
          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2 }}
          >
            <Chip
              label={`Version ${version}`}
              color="primary"
              variant="outlined"
            />
            <Chip label={`Built: ${buildDate}`} variant="outlined" />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          About This Implementation
        </Typography>
        <Typography sx={{ mb: 2 }}>
          This is a modern web-based implementation of John Conway's Game of
          Life, featuring an infinite canvas, optimized performance through
          chunked state management, and a comprehensive set of drawing tools for
          creating and exploring cellular automata patterns.
        </Typography>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Key Features
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              }}
            >
              <Box>
                <Typography variant="body2">
                  • Infinite scrollable grid
                </Typography>
                <Typography variant="body2">
                  • Multiple drawing tools
                </Typography>
                <Typography variant="body2">
                  • Shape library integration
                </Typography>
                <Typography variant="body2">• Population analysis</Typography>
              </Box>
              <Box>
                <Typography variant="body2">
                  • Zoom and pan navigation
                </Typography>
                <Typography variant="body2">
                  • Real-time performance metrics
                </Typography>
                <Typography variant="body2">
                  • Steady-state detection
                </Typography>
                <Typography variant="body2">
                  • Multiple color schemes
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="h6" gutterBottom>
          Technology Stack
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
          <Chip label="React 19.1.1" size="small" />
          <Chip label="Material-UI 7.3.4" size="small" />
          <Chip label="HTML5 Canvas" size="small" />
          <Chip label="JavaScript ES6+" size="small" />
          <Chip label="Node.js Backend" size="small" />
          <Chip label="Express.js API" size="small" />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Architecture Highlights
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <strong>Performance:</strong> Uses chunked state management for
          efficient simulation of large, sparse patterns. Canvas-based rendering
          with device pixel ratio handling ensures crisp graphics on all
          displays.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          <strong>Modularity:</strong> Tool system with unified mouse event
          interface allows easy extension with new drawing tools. Pure game
          logic separation enables unit testing and alternative state
          implementations.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          About Conway's Game of Life
        </Typography>
        <Typography sx={{ mb: 2 }}>
          The Game of Life was devised by British mathematician John Horton
          Conway in 1970. It became widely known when it was featured in Martin
          Gardner's "Mathematical Games" column in Scientific American. Despite
          its simple rules, the Game of Life is Turing complete and can simulate
          any computer algorithm.
        </Typography>

        <Card variant="outlined" sx={{ mb: 2, bgcolor: "action.hover" }}>
          <CardContent>
            <Typography variant="body2" fontStyle="italic">
              "The Game of Life is not a game in the conventional sense. There
              are no players, and no winning or losing. Once the 'pieces' are
              placed in the starting position, the rules determine everything
              that happens later."
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
              — Martin Gardner, Scientific American (1970)
            </Typography>
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Pattern Catalog Attribution
        </Typography>
        <Card variant="outlined" sx={{ mb: 2, bgcolor: "action.hover" }}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Life Lexicon Integration:</strong> This application
              includes patterns from the Life Lexicon, Release 29 (July 2,
              2018), compiled by Stephen A. Silver and updated by Dave Greene
              and David Bell.
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Copyright:</strong> © Stephen Silver, 1997-2018. Used
              under Creative Commons Attribution-ShareAlike 3.0 Unported License
              (CC BY-SA 3.0).
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Contributors:</strong> John Conway, Dean Hickerson, David
              Bell, Bill Gosper, Bob Wainwright, Noam Elkies, Nathan Thompson,
              Harold McIntosh, Dan Hoey, Alan Hensel, and many others from the
              Conway's Game of Life community.
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

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Links & Resources
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Link
            href="https://github.com/bpauquette/game-of-life"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <GitHubIcon fontSize="small" />
            Source Code Repository
          </Link>
          <Link
            href="https://conwaylife.com/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <CodeIcon fontSize="small" />
            LifeWiki - Pattern Database
          </Link>
          <Link
            href="https://github.com/bpauquette/game-of-life/issues"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <BugReportIcon fontSize="small" />
            Report Issues & Feedback
          </Link>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          Built with ❤️ for exploring the beauty of emergent complexity
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

AboutDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

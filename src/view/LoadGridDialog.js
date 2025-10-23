import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  InputAdornment,
  TextField
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CancelIcon from '@mui/icons-material/Cancel';
import GridOnIcon from '@mui/icons-material/GridOn';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import logger from '../controller/utils/logger';
import { BUTTONS, STATUS, PLACEHOLDERS } from '../utils/Constants';

const LoadGridDialog = ({ 
  open, 
  onClose, 
  onLoad,
  onDelete,
  grids = [],
  loading = false,
  error = null,
  loadingGrids = false
}) => {
  const [selectedGrid, setSelectedGrid] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [filteredGrids, setFilteredGrids] = useState(grids);

  useEffect(() => {
    if (searchFilter.trim() === '') {
      setFilteredGrids(grids);
    } else {
      const searchTerm = searchFilter.toLowerCase();
      const filtered = grids.filter(grid => 
        grid.name.toLowerCase().includes(searchTerm) ||
        grid.description?.toLowerCase().includes(searchTerm)
      );
      setFilteredGrids(filtered);
    }
  }, [grids, searchFilter]);

  const handleGridSelect = (grid) => {
    setSelectedGrid(grid);
  };

  const handleLoad = async () => {
    if (selectedGrid) {
      try {
          await onLoad(selectedGrid.id);
          handleClose();
        } catch (loadError) {
          logger.warn('Load failed:', loadError.message);
        }
    }
  };

  const handleDelete = async (gridId, event) => {
    event.stopPropagation();
    
    if (selectedGrid?.id === gridId) {
      setSelectedGrid(null);
    }
    
    try {
      await onDelete(gridId);
    } catch (deleteError) {
      logger.warn('Delete failed:', deleteError.message);
    }
  };

  const handleClose = () => {
    setSelectedGrid(null);
    setSearchFilter('');
    onClose();
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown date';
    }
  };

  const formatCellCount = (count) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { minHeight: '500px', maxHeight: '80vh' }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <FolderOpenIcon color="primary" />
        Load Grid State
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Select a saved grid state to load into the simulation.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {grids.length > 0 && (
          <TextField
            fullWidth
            variant="outlined"
            placeholder={PLACEHOLDERS.SEARCH_GRIDS}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            sx={{ mb: 2 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        <Box sx={{ minHeight: '300px' }}>
          {loadingGrids && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading saved grids...
              </Typography>
            </Box>
          )}
          
          {!loadingGrids && filteredGrids.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <GridOnIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {grids.length === 0 ? 'No saved grids' : 'No grids match your search'}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {grids.length === 0 
                  ? 'Save your first grid state to see it here'
                  : 'Try adjusting your search terms'
                }
              </Typography>
            </Box>
          )}
          
          {!loadingGrids && filteredGrids.length > 0 && (
            <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {filteredGrids.map((grid, index) => (
                <React.Fragment key={grid.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={selectedGrid?.id === grid.id}
                      onClick={() => handleGridSelect(grid)}
                      sx={{ py: 2 }}
                    >
                      <ListItemIcon>
                        <GridOnIcon color={selectedGrid?.id === grid.id ? 'primary' : 'action'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {grid.name}
                            </Typography>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={(e) => handleDelete(grid.id, e)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Delete
                            </Button>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {grid.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {grid.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Chip 
                                label={`${formatCellCount(grid.liveCells)} cells`}
                                size="small" 
                                variant="outlined"
                                color="primary"
                              />
                              <Chip 
                                label={`Gen ${grid.generation}`}
                                size="small" 
                                variant="outlined"
                                color="secondary"
                              />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled">
                                  {formatDate(grid.createdAt)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < filteredGrids.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
          startIcon={<CancelIcon />}
        >
          {BUTTONS.CANCEL}
        </Button>
        <Button 
          onClick={handleLoad}
          disabled={!selectedGrid || loading}
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} /> : <FolderOpenIcon />}
        >
          {loading ? STATUS.LOADING : `${BUTTONS.LOAD} Grid`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

LoadGridDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLoad: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  grids: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    liveCells: PropTypes.number.isRequired,
    generation: PropTypes.number.isRequired,
    createdAt: PropTypes.string.isRequired
  })),
  loading: PropTypes.bool,
  error: PropTypes.string,
  loadingGrids: PropTypes.bool
};

export default LoadGridDialog;
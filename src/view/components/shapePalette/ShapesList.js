import React, { memo } from 'react';
import PropTypes from 'prop-types';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ShapeListItem from './ShapeListItem.js';

const ShapesList = memo(function ShapesList({
  items,
  colorScheme,
  loading,
  onSelect,
  onDeleteRequest,
  onAddRecent,
  user,
  backendBase,
}) {
  if (!loading && items.length === 0) {
    return (
      <List dense>
        <ListItem>
          <ListItemText primary="No shapes found" />
        </ListItem>
      </List>
    );
  }

  // Simpler non-virtualized list for reliability
  return (
    <List dense sx={{ pl: 1.5, pr: 1, overflowY: 'visible' }}>
      {items.map((shape, idx) => (
        <ShapeListItem
          key={shape.id || `${shape.name || 'shape'}-${shape.userId || 'unknown'}`}
          shape={shape}
          idx={idx}
          colorScheme={colorScheme}
          onSelect={onSelect}
          onRequestDelete={onDeleteRequest}
          onAddRecent={onAddRecent}
          user={user}
          backendBase={backendBase}
        />
      ))}
    </List>
  );
});

ShapesList.propTypes = {
  items: PropTypes.array.isRequired,
  colorScheme: PropTypes.object,
  loading: PropTypes.bool,
  onSelect: PropTypes.func,
  onDeleteRequest: PropTypes.func,
  onAddRecent: PropTypes.func.isRequired,
  user: PropTypes.object,
  backendBase: PropTypes.string,
};

export default ShapesList;

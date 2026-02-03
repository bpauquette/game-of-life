import React, { memo } from 'react';
import PropTypes from 'prop-types';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ShapeListItem from './ShapeListItem.js';

const VirtualRow = memo(({ index, style, data }) => {
  const { items, colorScheme, onSelect, onDeleteRequest, onAddRecent, onHover, user, backendBase } = data;
  const shape = items[index];
  if (!shape) return null;
  return (
    <div style={{ ...style, margin: 0, padding: 0, paddingLeft: 12 }}>
      <ShapeListItem
        shape={shape}
        idx={index}
        colorScheme={colorScheme}
        onSelect={onSelect}
        onRequestDelete={onDeleteRequest}
        onAddRecent={onAddRecent}
        onHover={onHover}
        user={user}
        backendBase={backendBase}
      />
    </div>
  );
});

VirtualRow.displayName = 'VirtualRow';

VirtualRow.propTypes = {
  index: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired,
  data: PropTypes.shape({
    items: PropTypes.array.isRequired,
    colorScheme: PropTypes.object,
    onSelect: PropTypes.func,
    onDeleteRequest: PropTypes.func,
    onAddRecent: PropTypes.func.isRequired,
    onHover: PropTypes.func,
    user: PropTypes.object,
    backendBase: PropTypes.string,
  }).isRequired,
};

const ShapesList = memo(function ShapesList({
  items,
  colorScheme,
  loading,
  onSelect,
  onDeleteRequest,
  onAddRecent,
  onHover,
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
          key={`${shape.id || 'shape'}-${idx}`}
          shape={shape}
          idx={idx}
          colorScheme={colorScheme}
          onSelect={onSelect}
          onRequestDelete={onDeleteRequest}
          onAddRecent={onAddRecent}
          onHover={onHover}
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
  onHover: PropTypes.func,
  user: PropTypes.object,
  backendBase: PropTypes.string,
};

export default ShapesList;

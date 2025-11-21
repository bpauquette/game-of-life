import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList } from 'react-window';
import ShapeListItem from './ShapeListItem';

const ROW_HEIGHT = 64;
const MIN_RENDER_HEIGHT = ROW_HEIGHT * 4;

const VirtualRow = memo(({ index, style, data }) => {
  const { items, colorScheme, onSelect, onDeleteRequest, onAddRecent, onHover } = data;
  const shape = items[index];
  if (!shape) return null;
  return (
    <div style={style}>
      <ShapeListItem
        shape={shape}
        idx={index}
        colorScheme={colorScheme}
        onSelect={onSelect}
        onRequestDelete={onDeleteRequest}
        onAddRecent={onAddRecent}
        onHover={onHover}
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
}) {
  const itemData = useMemo(() => ({ items, colorScheme, onSelect, onDeleteRequest, onAddRecent, onHover }), [
    items,
    colorScheme,
    onSelect,
    onDeleteRequest,
    onAddRecent,
    onHover,
  ]);

  if (!loading && items.length === 0) {
    return (
      <List dense>
        <ListItem>
          <ListItemText primary="No shapes found" />
        </ListItem>
      </List>
    );
  }

  return (
    <AutoSizer>
      {({ height, width }) => {
        if (!height || !width) {
          return null;
        }
        const listHeight = Math.max(height, MIN_RENDER_HEIGHT);
        const listWidth = Math.max(width, 240);
        return (
          <FixedSizeList
            height={listHeight}
            width={listWidth}
            itemCount={items.length}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            overscanCount={4}
          >
            {VirtualRow}
          </FixedSizeList>
        );
      }}
    </AutoSizer>
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
};

export default ShapesList;

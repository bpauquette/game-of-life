/* eslint-disable testing-library/no-container, testing-library/no-node-access, no-unused-vars */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecentShapesStrip from './RecentShapesStrip';

describe('RecentShapesStrip', () => {
  const defaultProps = {
    recentShapes: [],
    selectShape: jest.fn(),
    drawWithOverlay: jest.fn(),
    colorScheme: {}
  };

  const mockShapes = [
    {
      id: 'glider',
      name: 'Glider',
      cells: [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 }
      ]
    },
    {
      id: 'block',
      name: 'Block',
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders empty strip when no recent shapes', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} />);
      
      expect(container.firstChild).toBeNull();
    });

    test('renders shapes when recentShapes provided', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      // Check that shapes are rendered (they should have titles)
      expect(screen.getByTitle('Glider')).toBeInTheDocument();
      expect(screen.getByTitle('Block')).toBeInTheDocument();
    });

    test('renders correct number of SVG elements', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements).toHaveLength(2);
    });

    test('renders container with enhanced styling and header', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      // Check for "Recent Shapes" header text
      expect(screen.getByText('Recent Shapes')).toBeInTheDocument();
    });

    test('renders shape labels below thumbnails', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      // Labels should be present as text content (in addition to title attributes)
      expect(screen.getByText('Glider')).toBeInTheDocument();
      expect(screen.getByText('Block')).toBeInTheDocument();
    });
  });

  describe('Shape Key Generation', () => {
    test('uses shape id when available', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      // The div with title contains the SVG
      const shapeDiv = screen.getByTitle('Glider');
      expect(shapeDiv).toHaveAttribute('title', 'Glider');
    });

    test('uses index when no id available', () => {
      const shapesWithoutIds = [{ cells: [{ x: 0, y: 0 }] }];
      
      render(<RecentShapesStrip {...defaultProps} recentShapes={shapesWithoutIds} />);
      
      expect(screen.getByTitle('shape 0')).toBeInTheDocument();
    });
  });

  describe('Cell Handling', () => {
    test('handles object-style cells', () => {
      const shapeWithObjectCells = [{
        cells: [{ x: 1, y: 1 }]
      }];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithObjectCells} />);
      
      // Check that a cell rect is rendered
      const cellRects = container.querySelectorAll('rect[fill]:not([fill="transparent"])');
      expect(cellRects).toHaveLength(1);
    });

    test('handles array-style cells', () => {
      const shapeWithArrayCells = [{
        cells: [[1, 1], [2, 2]]
      }];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithArrayCells} />);
      
      // Check that cell rects are rendered
      const cellRects = container.querySelectorAll('rect[fill]:not([fill="transparent"])');
      expect(cellRects).toHaveLength(2);
    });

    test('handles shape as array directly', () => {
      const shapesAsArrays = [[[0, 0], [1, 1]]];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapesAsArrays} />);
      
      const cellRects = container.querySelectorAll('rect[fill]:not([fill="transparent"])');
      expect(cellRects).toHaveLength(2);
    });

    test('handles empty cells gracefully', () => {
      const shapeWithEmptyCells = [{
        name: 'Empty',
        cells: []
      }];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithEmptyCells} />);
      
      expect(screen.getByTitle('Empty')).toBeInTheDocument();
      
      // Should render default-sized grid
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 8 8');
    });
  });

  describe('Shape Dimensions', () => {
    test('calculates correct dimensions for object cells', () => {
      const shapeWith3x3 = [{
        cells: [
          { x: 0, y: 0 },
          { x: 2, y: 2 }
        ]
      }];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWith3x3} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 3 3');
    });

    test('calculates correct dimensions for array cells', () => {
      const shapeWith4x2 = [{
        cells: [[3, 0], [0, 1]]
      }];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWith4x2} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 4 2');
    });

    test('handles missing coordinates gracefully', () => {
      const shapeWithMissingCoords = [{
        cells: [{ x: 1 }, { y: 1 }] // Missing y and x respectively
      }];
      
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithMissingCoords} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 2 2');
    });
  });

  describe('Shape Titles', () => {
    test('uses shape name as title', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      expect(screen.getByTitle('Glider')).toBeInTheDocument();
      expect(screen.getByTitle('Block')).toBeInTheDocument();
    });

    test('uses meta.name when shape.name not available', () => {
      const shapeWithMetaName = [{
        meta: { name: 'Meta Shape' },
        cells: []
      }];
      
      render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithMetaName} />);
      
      expect(screen.getByTitle('Meta Shape')).toBeInTheDocument();
    });

    test('uses shape id as fallback title', () => {
      const shapeWithIdOnly = [{
        id: 'shape-id-123',
        cells: []
      }];
      
      render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithIdOnly} />);
      
      expect(screen.getByTitle('shape-id-123')).toBeInTheDocument();
    });

    test('uses index-based title as final fallback', () => {
      const shapeWithNoIdentifier = [{ cells: [] }];
      
      render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithNoIdentifier} />);
      
      expect(screen.getByTitle('shape 0')).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    test('calls selectShape and drawWithOverlay when shape clicked', () => {
      const selectShape = jest.fn();
      const drawWithOverlay = jest.fn();
      
      render(
        <RecentShapesStrip 
          {...defaultProps} 
          recentShapes={mockShapes} 
          selectShape={selectShape}
          drawWithOverlay={drawWithOverlay}
        />
      );
      
      fireEvent.click(screen.getByTitle('Glider'));
      
      expect(selectShape).toHaveBeenCalledWith(mockShapes[0]);
      expect(drawWithOverlay).toHaveBeenCalled();
    });

    test('handles click on second shape correctly', () => {
      const selectShape = jest.fn();
      const drawWithOverlay = jest.fn();
      
      render(
        <RecentShapesStrip 
          {...defaultProps} 
          recentShapes={mockShapes} 
          selectShape={selectShape}
          drawWithOverlay={drawWithOverlay}
        />
      );
      
      fireEvent.click(screen.getByTitle('Block'));
      
      expect(selectShape).toHaveBeenCalledWith(mockShapes[1]);
      expect(drawWithOverlay).toHaveBeenCalled();
    });
  });

  describe('Styling and Visual Properties', () => {
    test('applies correct cursor style', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const shapeElement = screen.getByTitle('Glider');
      expect(shapeElement).toHaveStyle('cursor: pointer');
    });

    test('applies margin bottom to shapes', () => {
      render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const shapeElement = screen.getByTitle('Glider');
      expect(shapeElement).toHaveStyle('margin-bottom: 12px');
    });

    test('uses colorScheme background when provided', () => {
      const colorScheme = { background: '#123456' };
      
      const { container } = render(
        <RecentShapesStrip 
          {...defaultProps} 
          recentShapes={mockShapes} 
          colorScheme={colorScheme}
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveStyle('background: rgb(18, 52, 86)'); // #123456 converted
    });

    test('uses default dark background when no colorScheme provided', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveStyle('background: #1a1a1a');
    });
  });

  describe('Color Scheme Integration', () => {
    test('uses getCellColor function when provided', () => {
      const getCellColor = jest.fn().mockReturnValue('#FF0000');
      const colorScheme = { getCellColor };
      
      const { container } = render(
        <RecentShapesStrip 
          {...defaultProps} 
          recentShapes={mockShapes} 
          colorScheme={colorScheme}
        />
      );
      
      expect(getCellColor).toHaveBeenCalled();
      
      const cellRect = container.querySelector('rect[fill="#FF0000"]');
      expect(cellRect).toBeInTheDocument();
    });

    test('falls back to default color when getCellColor not provided', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const cellRects = container.querySelectorAll('rect[fill="#222"]');
      expect(cellRects.length).toBeGreaterThan(0);
    });

    test('uses getCellColor parameters correctly', () => {
      const getCellColor = jest.fn().mockReturnValue('#00FF00');
      const colorScheme = { getCellColor };
      
      const { container } = render(
        <RecentShapesStrip 
          {...defaultProps} 
          recentShapes={mockShapes} 
          colorScheme={colorScheme}
        />
      );
      
      // getCellColor should have been called with specific parameters
      expect(getCellColor).toHaveBeenCalled();
      
      // Should use the returned color
      const cellRects = container.querySelectorAll('rect[fill="#00FF00"]');
      expect(cellRects.length).toBeGreaterThan(0);
    });
  });

  describe('Grid Background Rendering', () => {
    test('renders grid background rectangles', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      // Grid rectangles should have fill="transparent"
      const gridRects = container.querySelectorAll('rect[fill="transparent"]');
      expect(gridRects.length).toBeGreaterThan(0);
    });

    test('grid rectangles have correct stroke color', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const gridRect = container.querySelector('rect[fill="transparent"]');
      expect(gridRect).toHaveAttribute('stroke', 'rgba(255,255,255,0.02)');
    });
  });

  describe('SVG Properties', () => {
    test('SVG has correct size', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
    });

    test('SVG has correct aspect ratio preservation', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    });

    test('SVG has correct border styling', () => {
      const { container } = render(<RecentShapesStrip {...defaultProps} recentShapes={mockShapes} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveStyle('border: 1px solid rgba(255,255,255,0.15)');
      expect(svg).toHaveStyle('border-radius: 8px');
    });
  });

  describe('Edge Cases', () => {
    test('handles null shape gracefully', () => {
      const shapesWithNull = [null, mockShapes[0]];
      
      render(<RecentShapesStrip {...defaultProps} recentShapes={shapesWithNull} />);
      
      // Should still render the valid shape
      expect(screen.getByTitle('Glider')).toBeInTheDocument();
    });

    test('handles undefined recentShapes', () => {
      const { container } = render(
        <RecentShapesStrip 
          {...defaultProps} 
          recentShapes={undefined}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    test('handles shapes with no cells property', () => {
      const shapeWithNoCells = [{ name: 'No Cells' }];
      
      render(<RecentShapesStrip {...defaultProps} recentShapes={shapeWithNoCells} />);
      
      expect(screen.getByTitle('No Cells')).toBeInTheDocument();
    });
  });

  describe('Shape Positioning and Stability', () => {
    test('shapes maintain stable keys when array order changes', () => {
      const initialShapes = [
        { id: 'shape1', name: 'Shape 1', cells: [{ x: 0, y: 0 }] },
        { id: 'shape2', name: 'Shape 2', cells: [{ x: 1, y: 1 }] }
      ];

      const { rerender } = render(
        <RecentShapesStrip {...defaultProps} recentShapes={initialShapes} />
      );

      // Verify initial elements exist
      expect(screen.getByTitle('Shape 1')).toBeInTheDocument();
      expect(screen.getByTitle('Shape 2')).toBeInTheDocument();

      // Reverse the array (simulating new shape added to front)
      const reversedShapes = [...initialShapes].reverse();
      
      rerender(
        <RecentShapesStrip {...defaultProps} recentShapes={reversedShapes} />
      );

      // Shapes should still be present with same titles
      expect(screen.getByTitle('Shape 1')).toBeInTheDocument();
      expect(screen.getByTitle('Shape 2')).toBeInTheDocument();
    });

    test('generates stable keys for shapes without IDs using content hash', () => {
      const shapesWithoutIds = [
        { name: 'Named Shape', cells: [{ x: 0, y: 0 }] },
        { cells: [{ x: 1, y: 1 }] }, // No name or ID
        { cells: [{ x: 2, y: 2 }] }  // No name or ID, different content
      ];

      const { container } = render(
        <RecentShapesStrip {...defaultProps} recentShapes={shapesWithoutIds} />
      );

      // Should render all shapes
      expect(screen.getByTitle('Named Shape')).toBeInTheDocument();
      
      // Check that all buttons are rendered (one per shape)
      const shapeDivs = container.querySelectorAll('button[title]');
      expect(shapeDivs).toHaveLength(3);
    });

    test('new shapes appear at the top of the list', () => {
      const initialShapes = [
        { id: 'old1', name: 'Old Shape 1', cells: [{ x: 0, y: 0 }] },
        { id: 'old2', name: 'Old Shape 2', cells: [{ x: 1, y: 1 }] }
      ];

      const { rerender } = render(
        <RecentShapesStrip {...defaultProps} recentShapes={initialShapes} />
      );

      // Add new shape at the beginning
      const withNewShape = [
        { id: 'new', name: 'New Shape', cells: [{ x: 2, y: 2 }] },
        ...initialShapes
      ];

      rerender(
        <RecentShapesStrip {...defaultProps} recentShapes={withNewShape} />
      );

      // Get all shape buttons in DOM order
      const shapeDivs = screen.getAllByRole('button').filter(button => 
        button.hasAttribute('title') && button.getAttribute('title') !== ''
      );

      // First shape in DOM should be the new one
      expect(shapeDivs[0]).toHaveAttribute('title', 'New Shape');
      expect(shapeDivs[1]).toHaveAttribute('title', 'Old Shape 1');
      expect(shapeDivs[2]).toHaveAttribute('title', 'Old Shape 2');
    });

    test('handles maximum number of shapes correctly', () => {
      // Create more shapes than MAX_RECENT_SHAPES (20)
      const manyShapes = Array.from({ length: 25 }, (_, i) => ({
        id: `shape${i}`,
        name: `Shape ${i}`,
        cells: [{ x: i, y: i }]
      }));

      const { container } = render(
        <RecentShapesStrip {...defaultProps} recentShapes={manyShapes} />
      );

      // Should only render the shapes that were passed (component doesn't enforce limit)
      const shapeDivs = container.querySelectorAll('button[title]');
      expect(shapeDivs).toHaveLength(25);
    });

    test('duplicate shapes are handled by parent logic, component renders all provided', () => {
      const shapesWithDuplicates = [
        { id: 'shape1', name: 'Shape 1', cells: [{ x: 0, y: 0 }] },
        { id: 'shape1', name: 'Shape 1', cells: [{ x: 0, y: 0 }] }, // Duplicate ID
        { id: 'shape2', name: 'Shape 2', cells: [{ x: 1, y: 1 }] }
      ];

      const { container } = render(
        <RecentShapesStrip {...defaultProps} recentShapes={shapesWithDuplicates} />
      );

      // Component should render all provided shapes (deduplication is parent's responsibility)
      const shapeDivs = container.querySelectorAll('button[title]');
      expect(shapeDivs).toHaveLength(3);
    });
  });
});
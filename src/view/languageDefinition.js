// src/view/languageDefinition.js
// Enhanced scripting language documentation for GOL ScriptPanel

const languageDefinition = `# GOL Script Language Reference

The Game of Life Scripting Language allows you to programmatically create patterns and control the simulation.

## Basic Commands

### Drawing Commands
- PENDOWN - Start drawing (place cells)
- PENUP - Stop drawing 
- GOTO x y - Move cursor to position (x, y)
- RECT width height - Draw filled rectangle at current position
- RECTPERIMETER x1 y1 x2 y2 - Draw rectangle outline from corner to corner
- SQUARE size - Draw square perimeter at current position
- CIRCLE radius - Draw circle at current position
- OVAL x1 y1 x2 y2 - Draw ellipse perimeter from corner to corner
- LINE x1 y1 x2 y2 - Draw line from point to point
- RANDRECT minW maxW minH maxH [count] - Draw random rectangles
- FORWARD distance - Move forward in current direction
- BACK distance - Move backward
- LEFT angle - Turn left by angle degrees
- RIGHT angle - Turn right by angle degrees

### Simulation Commands
- STEP n - Run n generations of the Game of Life
- CAPTURE name - Capture current pattern with given name
- COUNT varName - Store current cell count in variable
- CLEAR - Clear all cells from the grid
- PRINT expression - Output value to console/debug log

### Control Flow
- IF condition ... END - Conditional execution
- WHILE condition ... END - Loop
- LABEL expression - Place a text label at current position

## Complete Command Reference

### Basic Drawing (cursor-based)
- PENDOWN / PENUP - Control drawing mode
- GOTO x y - Move cursor
- RECT width height - Filled rectangle at cursor
- CIRCLE radius - Circle at cursor
- FORWARD/BACK distance - Move cursor in direction
- LEFT/RIGHT angle - Turn cursor

### Geometric Drawing (coordinate-based)
- LINE x1 y1 x2 y2 - Draw line between points
- OVAL x1 y1 x2 y2 - Draw ellipse outline
- RECTPERIMETER x1 y1 x2 y2 - Draw rectangle outline
- SQUARE size - Draw square outline at cursor
- RANDRECT minW maxW minH maxH [count] - Random rectangles

### Currently NOT Supported
- User-defined functions (FUNCTION/CALL)
- Loops with custom step (FOR loops)
- File I/O operations
- Advanced math functions (sin, cos, etc)
- Pattern libraries or imports

### Advanced Features
- Variables: x = 10, name = "string"
- Expressions: x = y + 5, area = width * height
- Conditions: x < 10, name == "test", count >= 100
- String concatenation: message = "Hello " + name

## Variables
Use variables to store values:
x = 10
y = x + 5
GOTO x y

## Examples

### Simple Glider
PENDOWN
GOTO 1 0
RECT 1 1
GOTO 2 1  
RECT 1 1
GOTO 0 2
RECT 1 1
GOTO 1 2
RECT 1 1
GOTO 2 2
RECT 1 1
STEP 20

### Geometric Patterns
PENDOWN
CLEAR
# Draw various shapes
LINE 0 0 10 10
OVAL 15 5 25 15
RECTPERIMETER 30 0 40 10
GOTO 5 20
SQUARE 8
PRINT "Geometric pattern complete"

### Random Garden
PENDOWN
COUNT start_cells
RANDRECT 1 4 1 4 20
COUNT end_cells
LABEL "Added " + (end_cells - start_cells) + " random cells"
STEP 30

### Drawing Loop
PENDOWN
GOTO 10 10
size = 1
WHILE size < 10
  RECT size 1
  FORWARD size
  RIGHT 90
  size = size + 1
END

### Cell Counting Example
PENDOWN
RECT 5 5
COUNT cell_count
LABEL "Pattern has " + cell_count + " cells"
STEP 10
COUNT final_count
LABEL "After 10 steps: " + final_count + " cells"

### Advanced Drawing
PENDOWN
# Draw geometric shapes
LINE 0 0 10 10
OVAL 5 5 15 10
SQUARE 8
RECTPERIMETER 20 20 25 25
# Create random scatter
GOTO 30 30
RANDRECT 2 5 2 5 10

## Tips
- Comments start with #
- All coordinates are integers
- Use variables to make scripts more flexible
- RECT draws filled shapes, RECTPERIMETER draws outlines
- LINE, OVAL provide precise geometric control
- RANDRECT creates interesting random patterns
- COUNT and LABEL help track pattern evolution
- CLEAR resets the grid, PRINT outputs debug info
- Monaco Editor provides syntax highlighting for all commands
- Ctrl+R to run, Ctrl+P to preview
- Real-time debugging shows execution state
- No user-defined functions yet - use variables and loops instead`;

export default languageDefinition;
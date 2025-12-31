# Game of Life Scripting Language Reference

## Overview
This scripting language is designed for educational, creative, and programmatic control of the Game of Life grid. It supports drawing commands, variables, control flow, labels, and simulation stepping.

---

## Formal Grammar (EBNF)

```
script        ::= { statement | block } ;
statement     ::= command | assignment | label | empty ;
block         ::= while_block | if_block ;
assignment    ::= IDENTIFIER '=' expr ;
label         ::= 'LABEL' expr ;
while_block   ::= 'WHILE' cond NEWLINE { statement } 'END' ;
if_block      ::= 'IF' cond NEWLINE { statement } 'END' ;
command       ::= pen_cmd | move_cmd | draw_cmd | shape_cmd | step_cmd | capture_cmd | tool_cmd | place_cmd ;
pen_cmd       ::= 'PENUP' | 'PENDOWN' ;
move_cmd      ::= ('FORWARD' | 'FD' | 'BACK' | 'BK') expr ;
draw_cmd      ::= 'GOTO' expr expr | 'SET' expr expr ;
shape_cmd     ::= 'RECT' expr expr | 'RECT_OUTLINE' expr expr | 'SQUARE' expr | 'CIRCLE' expr | 'CIRCLE_OUTLINE' expr | 'OVAL' expr expr | 'LINE' expr expr | 'ERASE' expr expr | 'RANDRECT' expr expr expr expr [expr] ;
step_cmd      ::= 'STEP' expr ;
capture_cmd   ::= 'CAPTURE' expr ;
tool_cmd      ::= 'SELECT_TOOL' expr ;
place_cmd     ::= ('PLACE' | 'PLACE_SHAPE') expr expr expr ;
expr          ::= term { ('+' | '-' | '*' | '/') term } ;
term          ::= NUMBER | STRING | IDENTIFIER ;
cond          ::= expr comp_op expr ;
comp_op       ::= '==' | '!=' | '<' | '>' | '<=' | '>=' ;
empty         ::= ;
```

---

## Features & Syntax

- **Variables:**
  - Assign numbers or strings: `x = 5`, `name = "glider"`
  - Use variables in commands: `FORWARD x`, `RECT x y`
- **Strings:**
  - Double-quoted: `name = "hello"`
- **Labels:**
  - `LABEL expr` places a label at the current position.
- **Control Flow:**
  - `WHILE cond ... END` and `IF cond ... END` blocks.
- **STEP n:**
  - `STEP n` advances the simulation n generations, animating each step.
- **Drawing & Movement:**
  - `PENUP`, `PENDOWN`, `FORWARD n`, `BACK n`, `GOTO x y`, etc.
- **Shapes:**
  - `RECT`, `CIRCLE`, `SQUARE`, `OVAL`, `LINE`, `ERASE`, `RANDRECT`, etc.
- **Shape Placement:**
  - `CAPTURE name`, `PLACE idOrName x y`, `SELECT_TOOL name`

---

## Example

```
x = 4
LABEL "Start"
PENDOWN
RECT x 3
STEP 5
WHILE x < 10
  x = x + 1
  FORWARD 1
  STEP 1
END
```

---

## Notes
- All commands are case-insensitive.
- Indentation is for readability; blocks are delimited by END.
- Comments start with `#` and are ignored.
- Errors are reported with line numbers and hints.

---

## New Features (2025)
- Variables (numbers and strings)
- Labels (`LABEL` command)
- Block-based control flow (`WHILE`, `IF`, `END`)
- Animated simulation stepping (`STEP n`)
- Improved error reporting

---

For more, see the test suite in `src/new-tests/scriptLanguage.test.js`.

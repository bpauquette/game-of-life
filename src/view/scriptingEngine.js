// src/view/scriptingEngine.js
// Core scripting engine logic for GOL ScriptPanel

// Helper: parse a value (number, string, or variable)
function parseValue(tok, state) {
  if (!tok) return 0;
  if (/^".*"$/.test(tok)) return tok.slice(1, -1); // quoted string
  if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
  if (tok in state.vars) return state.vars[tok];
  return 0;
}

// Helper: evaluate simple expressions (only +, -, *, /, concat, and string functions)
function evalExpr(expr, state) {
  let m;
  
  // Check for string functions first (higher precedence than arithmetic)
  // STRLEN(str) - returns length of string
  if ((m = expr.match(/^STRLEN\s*\(\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    return str.length;
  }
  
  // TOUPPER(str) - returns uppercase string
  if ((m = expr.match(/^TOUPPER\s*\(\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    return str.toUpperCase();
  }
  
  // TOLOWER(str) - returns lowercase string
  if ((m = expr.match(/^TOLOWER\s*\(\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    return str.toLowerCase();
  }
  
  // TRIM(str) - removes leading/trailing whitespace
  if ((m = expr.match(/^TRIM\s*\(\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    return str.trim();
  }
  
  // SUBSTRING(str, start, end) - returns substring
  if ((m = expr.match(/^SUBSTRING\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    const start = Math.floor(parseValue(m[2].trim(), state));
    const end = Math.floor(parseValue(m[3].trim(), state));
    return str.substring(start, end);
  }
  
  // INDEX(str, pattern) - returns first index of pattern (-1 if not found)
  if ((m = expr.match(/^INDEX\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    const pattern = String(parseValue(m[2].trim(), state));
    return str.indexOf(pattern);
  }
  
  // REPLACE(str, old, new) - replaces all occurrences
  if ((m = expr.match(/^REPLACE\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)$/i))) {
    const str = String(parseValue(m[1].trim(), state));
    const oldStr = String(parseValue(m[2].trim(), state));
    const newStr = String(parseValue(m[3].trim(), state));
    return str.replaceAll(oldStr, newStr);
  }
  
  // Arithmetic operations
  if ((m = expr.match(/^(.+)\s*([+\-*/])\s*(.+)$/))) {
    let a = parseValue(m[1].trim(), state);
    let b = parseValue(m[3].trim(), state);
    switch (m[2]) {
      case '+':
        if (typeof a === 'string' || typeof b === 'string') return String(a) + String(b);
        return a + b;
      case '-': return Number(a) - Number(b);
      case '*': return Number(a) * Number(b);
      case '/': return Number(a) / Number(b);
      default: return parseValue(expr.trim(), state);
    }
  }
  return parseValue(expr.trim(), state);
}

// Helper: parse a condition (x < 5, name == "foo")
function evalCond(lhs, op, rhs, state) {
  let a = parseValue(lhs, state);
  let b = parseValue(rhs, state);
  switch (op) {
     case '==': return a === b;
     case '!=': return a !== b;
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '>=': return a >= b;
    default: return false;
  }
}

// Helper: evaluate compound conditions with AND/OR/NOT
function evalCondCompound(condition, state) {
  if (!condition) return false;
  return parseOr(condition.trim(), state);
}

// Parse OR expressions (lowest precedence)
function parseOr(expr, state) {
  // Find the rightmost OR at depth 0 (not inside NOT)
  let lastOrIndex = -1;
  let notCount = 0;
  
  for (let i = expr.length - 1; i >= 0; i--) {
    const substr = expr.substring(i);
    if (substr.match(/^OR\s/i)) {
      if (notCount % 2 === 0) {
        lastOrIndex = i;
        break;
      }
    }
    if (substr.match(/^\sNOT\b/i) || (i === 0 && expr.match(/^NOT\b/i))) {
      notCount++;
    }
  }
  
  if (lastOrIndex !== -1) {
    const left = expr.substring(0, lastOrIndex).trim();
    const right = expr.substring(lastOrIndex + 2).trim();
    return parseOr(left, state) || parseOr(right, state);
  }
  
  return parseAnd(expr, state);
}

// Parse AND expressions (higher precedence than OR)
function parseAnd(expr, state) {
  // Find the rightmost AND at depth 0
  let lastAndIndex = -1;
  let notCount = 0;
  
  for (let i = expr.length - 1; i >= 0; i--) {
    const substr = expr.substring(i);
    if (substr.match(/^AND\s/i)) {
      if (notCount % 2 === 0) {
        lastAndIndex = i;
        break;
      }
    }
    if (substr.match(/^\sNOT\b/i) || (i === 0 && expr.match(/^NOT\b/i))) {
      notCount++;
    }
  }
  
  if (lastAndIndex !== -1) {
    const left = expr.substring(0, lastAndIndex).trim();
    const right = expr.substring(lastAndIndex + 3).trim();
    return parseAnd(left, state) && parseAnd(right, state);
  }
  
  return parseNot(expr, state);
}

// Parse NOT expressions (highest precedence)
function parseNot(expr, state) {
  const trimmed = expr.trim();
  const notMatch = trimmed.match(/^NOT\s+(.+)$/i);
  if (notMatch) {
    return !parseNot(notMatch[1], state);
  }
  return parseComparison(trimmed, state);
}

// Parse simple comparison (x < 5, etc.)
function parseComparison(expr, state) {
  const trimmed = expr.trim();
  const simpleMatch = trimmed.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
  if (simpleMatch) {
    return evalCond(simpleMatch[1].trim(), simpleMatch[2], simpleMatch[3].trim(), state);
  }
  
  // If no operators found, treat as variable lookup (0 is falsy)
  const val = parseValue(trimmed, state);
  return val !== 0 && val !== '' && val !== false;
}

// Split expression by operator, respecting nesting
// eslint-disable-next-line no-unused-vars
function splitByOperator(expr, operator, depth) {
  const result = [];
  let current = '';
  let i = 0;
  const opRegex = new RegExp(`\\s+${operator}\\s+`, 'i');
  
  while (i < expr.length) {
    const remaining = expr.substring(i);
    const match = remaining.match(opRegex);
    
    if (!match) {
      current += remaining;
      break;
    }
    
    // Check if this operator is at depth 0 (not inside NOT)
    const beforeOp = remaining.substring(0, match.index);
    let beforeNotCount = (beforeOp.match(/\bNOT\b/gi) || []).length;
    
    if (beforeNotCount % 2 === 0) {
      // This operator is at our depth level
      result.push(current + beforeOp);
      current = '';
      i += match.index + match[0].length;
    } else {
      // This operator is inside a NOT, skip it
      current += remaining.substring(0, match.index + match[0].length);
      i += match.index + match[0].length;
    }
  }
  
  if (current) {
    result.push(current);
  }
  
  return result.length > 0 ? result : [expr];
}

// Export all helpers for use in ScriptPanel
export { parseValue, evalExpr, evalCond, evalCondCompound };

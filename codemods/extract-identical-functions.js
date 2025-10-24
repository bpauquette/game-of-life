/**
 * Codemod: extract-identical-functions
 * - Finds function declarations/assignments with identical bodies and same params
 * - Extracts a shared helper function and replaces originals with references
 * - Conservative: only handles functions without 'this' or 'arguments' usage
 */

export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Collect candidate functions: FunctionDeclaration and VariableDeclarator with FunctionExpression/ArrowFunctionExpression
  const funcs = [];

  root.find(j.FunctionDeclaration).forEach(path => {
    funcs.push({ type: 'decl', path, node: path.node });
  });

  root.find(j.VariableDeclarator, { init: { type: 'FunctionExpression' } }).forEach(path => {
    funcs.push({ type: 'var-fn', path, node: path.node });
  });
  root.find(j.VariableDeclarator, { init: { type: 'ArrowFunctionExpression' } }).forEach(path => {
    funcs.push({ type: 'var-arrow', path, node: path.node });
  });

  // Helper to check forbidden usage
  function hasThisOrArguments(fnNode) {
    let found = false;
    j(fnNode).find(j.ThisExpression).forEach(() => { found = true; });
    j(fnNode).find(j.Identifier, { name: 'arguments' }).forEach(() => { found = true; });
    return found;
  }

  // Normalize body + params to a key
  function bodyKey(fnNode) {
    const params = (fnNode.params || []).map(p => j(p).toSource()).join(',');
    const body = j(fnNode.body).toSource();
    return params + '::' + body;
  }

  const map = new Map();
  for (const f of funcs) {
    let fnNode = null;
    let name = null;
    if (f.type === 'decl') {
      fnNode = f.node;
      name = f.node.id && f.node.id.name;
    } else {
      fnNode = f.node.init;
      name = f.node.id && f.node.id.name;
    }
    if (!fnNode || !name) continue;
    if (hasThisOrArguments(f.path)) continue;
    const key = bodyKey(fnNode);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ f, name, fnNode });
  }

  const groups = [...map.values()].filter(arr => arr.length > 1);
  if (groups.length === 0) return null;

  // Insert helper(s) after imports
  const body = root.get().value.program.body;
  let insertIndex = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i].type === 'ImportDeclaration') insertIndex = i + 1;
    else break;
  }

  let helperCount = 0;
  for (const group of groups) {
    helperCount++;
    const helperName = `_shared_fn_${helperCount}`;
    // Use first function node to create helper
    const prototype = group[0].fnNode;
    const helperDecl = j.variableDeclaration('const', [
      j.variableDeclarator(j.identifier(helperName), j.functionExpression(null, prototype.params || [], prototype.body))
    ]);
    root.get().value.program.body.splice(insertIndex, 0, helperDecl);
    insertIndex++;

    // Replace each original with assignment to helper or reference
    for (const item of group) {
      const { f } = item;
      if (f.type === 'decl') {
        // replace function declaration with const name = helperName;
        const parent = f.path.parentPath;
        j(f.path).replaceWith(j.variableDeclaration('const', [j.variableDeclarator(j.identifier(f.node.id.name), j.identifier(helperName))]));
      } else {
        // variable declarator -> set init to helper identifier
        const declPath = f.path;
        if (declPath && declPath.node) {
          declPath.get('init').replace(j.identifier(helperName));
        }
      }
    }
  }

  return root.toSource({ quote: 'single' });
}

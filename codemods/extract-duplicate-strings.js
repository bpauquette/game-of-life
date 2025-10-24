/**
 * Codemod: extract-duplicate-strings
 * - Finds string Literals repeated >= 3 times in a file (length >= 4)
 * - Inserts a const at top of file with a safe name and replaces occurrences
 * - Conservative: skips object property keys, import/export literals, and JSXText
 */

export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const literalPaths = [];

  root.find(j.Literal).forEach(path => {
    const val = path.node.value;
    if (typeof val !== 'string') return;
    if (val.length < 4) return;
    // Skip if parent is an import/export literal or property key (non-computed)
    const parent = path.parent && path.parent.node;
    if (!parent) return;
    if (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration') return;
    if (parent.type === 'Property' && parent.key === path.node && parent.computed === false) return;
    // Skip if inside a JSXExpressionContainer (we leave JSX alone)
    let p = path;
    let inJSX = false;
    while (p) {
      if (p.node && p.node.type && p.node.type.indexOf && p.node.type.indexOf('JSX') !== -1) { inJSX = true; break; }
      p = p.parentPath;
    }
    if (inJSX) return;
    literalPaths.push(path);
  });

  const map = new Map();
  for (const p of literalPaths) {
    const v = p.node.value;
    if (!map.has(v)) map.set(v, []);
    map.get(v).push(p);
  }

  const candidates = [...map.entries()].filter(([str, arr]) => arr.length >= 3);
  if (candidates.length === 0) return null;

  // Find insertion point: after last import or at top
  const body = root.get().value.program.body;
  let insertIndex = 0;
  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    if (node.type === 'ImportDeclaration') insertIndex = i + 1;
    else break;
  }

  const declarations = [];
  const usedNames = new Set();

  function makeConstName(str) {
    let s = str.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!s) s = 'STR';
    s = s.toUpperCase();
    let name = `CONST_${s}`;
    let i = 1;
    while (usedNames.has(name)) { name = `CONST_${s}_${i++}`; }
    usedNames.add(name);
    return name;
  }

  for (const [str, arr] of candidates) {
    const constName = makeConstName(str.slice(0, 40));
    // Create const declaration
    const decl = j.variableDeclaration('const', [
      j.variableDeclarator(j.identifier(constName), j.literal(str))
    ]);
    declarations.push(decl);

    // Replace occurrences with identifier, skipping keys
    for (const p of arr) {
      const parent = p.parent && p.parent.node;
      if (parent && parent.type === 'Property' && parent.key === p.node && parent.computed === false) continue;
      j(p).replaceWith(j.identifier(constName));
    }
  }

  // Insert declarations
  root.get().value.program.body.splice(insertIndex, 0, ...declarations);

  return root.toSource({ quote: 'single' });
}

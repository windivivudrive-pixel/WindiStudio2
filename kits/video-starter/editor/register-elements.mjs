import ts from 'typescript';

function numericStyle(node, file) {
  const attrs = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
  const style = attrs.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(file) === 'style');
  const expression = style?.initializer?.expression;
  if (!expression || !ts.isObjectLiteralExpression(expression)) return {};
  return Object.fromEntries(expression.properties.filter(p => ts.isPropertyAssignment(p) && ts.isNumericLiteral(p.initializer)).map(p => [p.name.getText(file), Number(p.initializer.text)]));
}

export function componentGeometry(source) {
  const file = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let geometry;
  const visit = node => {
    if (!geometry && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))) {
      const style = numericStyle(node, file);
      if (style.left != null && style.top != null && style.width != null && style.height != null) geometry = {x: style.left, y: style.top, width: style.width, height: style.height};
    }
    ts.forEachChild(node, visit);
  };
  visit(file); return geometry;
}

// Register existing roots, preserving the complete JSX and all native scenes.
// This intentionally recognizes the WS20-style adapter only, not arbitrary JSX.
export function registerElements(source, importPath, components = {}) {
  if (source.includes('data-windi-element') || /import\s*\{\s*EditorElement\s*\}/.test(source)) return source;
  const file = ts.createSourceFile('adapter.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inserts = [], found = new Set();
  const visit = node => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = (ts.isJsxElement(node) ? node.openingElement : node).tagName.getText(file);
      let spec;
      if (tag === 'Watermark') spec = {id: 'watermark', label: 'Thương hiệu', mode: 'scale', x: 80, y: 150, width: 920, height: 72, ...components.watermark};
      if (tag === 'RetroWindow') spec = {id: 'window', label: 'Cửa sổ nội dung', mode: 'scale', x: 80, y: 410, width: 920, height: 880, ...components.window};
      if (tag === 'EditorCaptionBar') spec = {id: 'captions', label: 'Phụ đề', mode: 'caption', x: 80, y: 1350, width: 920, height: 140, fontSize: 38};
      if (tag === 'div' && ts.isJsxElement(node)) {
        const expression = node.children.filter(ts.isJsxExpression).map(c => c.expression?.getText(file)).join(' ');
        const text = [['headline', 'Tiêu đề'], ['category', 'Nhãn nội dung'], ['spokenPill', 'Dòng nhấn']].find(([key]) => expression.includes(`currentBeat.${key}`));
        const style = numericStyle(node, file);
        if (text && style.left != null && style.top != null) spec = {id: text[0] === 'spokenPill' ? 'pill' : text[0], label: text[1], x: style.left, y: style.top, width: style.width ?? 920, height: style.height ?? Math.ceil((style.fontSize ?? 42) * (style.lineHeight ?? 1.5)), fontSize: style.fontSize ?? 42};
      }
      if (spec) {
        if (found.has(spec.id)) throw new Error(`Khối ${spec.id} lặp lại; cần adapter layout thủ công.`);
        found.add(spec.id);
        inserts.push({at: node.getStart(file), text: `<EditorElement editor={editor} spec={${JSON.stringify(spec)}}>`}, {at: node.end, text: '</EditorElement>'});
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (found.size !== 6) throw new Error(`Layout custom cần adapter thủ công với EditorElement (đã nhận: ${[...found].join(', ')}); không tự thay bản dựng gốc.`);
  for (const insert of inserts.sort((a, b) => b.at - a.at)) source = source.slice(0, insert.at) + insert.text + source.slice(insert.at);
  return `import {EditorElement} from '${importPath}/Layout';\n` + source;
}

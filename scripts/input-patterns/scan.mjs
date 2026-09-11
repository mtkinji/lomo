import ts from 'typescript';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { hasUnmanagedKeyboardScroll } from './keyboard-hosts.mjs';

const sharedNames = new Set(['Input', 'TitleInput', 'SearchField', 'TagEntryField', 'PickerFieldTrigger', 'SmallSetPickerField', 'RelationPickerField',
  'SettingsTextInputRow', 'EditableField', 'EditableTextArea', 'NarrativeEditableTitle', 'LongTextField', 'Combobox', 'ObjectPicker', 'RichTextEditor', 'EnumPickerField', 'FormField']);
// Reviewed compositions. Exact module/name only; internal controls remain scanned.
const canonicalAdapters = new Set([
  'src/features/activities/QuickAddDock.tsx:QuickAddDock',
  'src/capabilities/groceries/components/KrogerStoreFinder.tsx:KrogerStoreFinder',
  'src/ui/FilterDrawer.tsx:ValueInput',
  'src/ui/PickerFields.tsx:FixedSetPickerField',
]);
const appearance = /^(backgroundColor|border.*|shadow.*|elevation|padding.*|font.*|lineHeight|color|opacity)$/;
const unwrap = node => {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
  return node;
};
const visitAll = (node, visitor) => { visitor(node); ts.forEachChild(node, child => visitAll(child, visitor)); };
const nameOf = node => node && (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) ? node.text : node?.getText();
function fingerprint(node) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX, typeof node === 'string' ? node : node.getText());
  const tokens = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) tokens.push([token, scanner.getTokenText()]);
  return createHash('sha256').update(JSON.stringify(tokens)).digest('hex').slice(0, 24);
}
function ownerOf(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if ((ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent) || ts.isMethodDeclaration(parent)) && parent.name) return nameOf(parent.name);
    if (ts.isVariableDeclaration(parent)) return nameOf(parent.name);
  }
  return '<module>';
}
function sourceModule(file, source) {
  return {file, ast: ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), imports: new Map(), values: new Map(), exports: new Map(), exportStars: [], namespaces: new Set()};
}
function prepare(module) {
  visitAll(module.ast, node => {
    if (ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly) {
      const from = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (clause.name) module.imports.set(clause.name.text, {from, name: 'default'});
      if (clause.name && from === 'react-native') module.namespaces.add(clause.name.text);
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        module.imports.set(clause.namedBindings.name.text, {from, name: '*'});
        if (from === 'react-native') module.namespaces.add(clause.namedBindings.name.text);
      } else if (clause.namedBindings) for (const item of clause.namedBindings.elements) {
        if (!item.isTypeOnly) module.imports.set(item.name.text, {from, name: (item.propertyName ?? item.name).text});
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const value = unwrap(node.initializer);
      if (ts.isIdentifier(node.name)) module.values.set(node.name.text, value);
      const required = ts.isCallExpression(value) && value.expression.getText() === 'require' && ts.isStringLiteralLike(value.arguments[0]) ? value.arguments[0].text : null;
      if (required) {
        if (ts.isIdentifier(node.name)) { module.imports.set(node.name.text, {from: required, name: '*'}); if (required === 'react-native') module.namespaces.add(node.name.text); }
        if (ts.isObjectBindingPattern(node.name)) for (const item of node.name.elements) module.imports.set(item.name.getText(), {from: required, name: nameOf(item.propertyName ?? item.name)});
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name) module.values.set(node.name.text, node);
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && !node.isTypeOnly) {
      for (const item of node.exportClause.elements) if (!item.isTypeOnly) module.exports.set(item.name.text, {from: node.moduleSpecifier?.text, name: nameOf(item.propertyName ?? item.name)});
    }
    if (ts.isExportDeclaration(node) && !node.exportClause && !node.isTypeOnly && node.moduleSpecifier) module.exportStars.push(node.moduleSpecifier.text);
    if (ts.isExportAssignment(node)) module.values.set('default', node.expression);
  });
}

export function scanInputProject({sources}) {
  const modules = new Map(Object.entries(sources).map(([file, source]) => [file, sourceModule(file, source)]));
  for (const module of modules.values()) prepare(module);
  const resolveModule = (module, from) => {
    const base = from.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(module.file), from)) : from.startsWith('@/') ? from.slice(2) : from;
    return [base, ...['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js'].map(suffix => base + suffix)].map(file => modules.get(file)).find(Boolean);
  };
  function resolveImport(module, binding, seen) {
    if (binding.from === 'react-native' && binding.name === 'TextInput') return 'raw-native-input';
    if (binding.from === 'react-native-pell-rich-editor' && binding.name === 'RichEditor') return 'rich-input';
    const importPath = binding.from?.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(module.file), binding.from)) : binding.from;
    if (sharedNames.has(binding.name) && /(?:^|\/)ui(?:\/|$)/.test(importPath ?? '')) return 'shared-input';
    if (binding.from) {
      const target = resolveModule(module, binding.from);
      if (target) return resolveName(target, binding.name, seen);
    } else return resolveName(module, binding.name, seen);
    return null;
  }
  function resolveName(module, name, seen = new Set()) {
    const key = `${module.file}:${name}`;
    if (seen.has(key)) return null;
    seen = new Set(seen).add(key);
    if (canonicalAdapters.has(key) && module.values.has(name)) return 'shared-input';
    if (sharedNames.has(name) && module.file.startsWith('src/ui/') && module.values.has(name)) return 'shared-input';
    const imported = module.imports.get(name) ?? module.exports.get(name);
    if (imported) return resolveImport(module, imported, seen);
    const value = module.values.get(name);
    if (!value) {
      for (const from of module.exportStars) { const resolved = resolveImport(module, {from, name}, seen); if (resolved) return resolved; }
      return null;
    }
    if (ts.isIdentifier(value) || ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value) || ts.isConditionalExpression(value)) return resolveControl(module, value, seen);
    // Follow the actual render implementation of a local wrapper, including forwardRef/memo.
    if (ts.isFunctionLike(value) || ts.isCallExpression(value)) {
      let found = false, forwardsInput = false;
      visitAll(value, child => {
        if (ts.isJsxSelfClosingElement(child) || ts.isJsxOpeningElement(child)) {
          const kind = resolveControl(module, child.tagName, seen);
          found ||= Boolean(kind);
          if (kind && kind !== 'input-host') {
            // A host containing another input is useful reachability evidence, not another field.
            const parameters = value.parameters ?? [];
            const names = parameters.map(parameter => parameter.name.getText());
            forwardsInput ||= child.attributes.properties.some(prop =>
              ts.isJsxSpreadAttribute(prop) && names.some(name => prop.expression.getText() === name)
              || ts.isJsxAttribute(prop) && ['value', 'onChangeText', 'onChange', 'defaultValue'].includes(prop.name.getText()) &&
                prop.initializer && names.some(name => name.includes(prop.initializer.getText().replace(/[{}]/g, ''))));
          }
        }
      });
      if (found) return forwardsInput ? 'input-wrapper' : 'input-host';
    }
    return null;
  }
  function resolveControl(module, expression, seen = new Set()) {
    expression = unwrap(expression);
    if (!expression) return null;
    if (ts.isIdentifier(expression)) {
      if (['input', 'textarea'].includes(expression.text)) return 'embedded-input';
      return resolveName(module, expression.text, seen);
    }
    if (ts.isStringLiteralLike(expression) && ['input', 'textarea'].includes(expression.text)) return 'embedded-input';
    if (ts.isPropertyAccessExpression(expression)) {
      const root = expression.expression.getText();
      if (ts.isCallExpression(expression.expression) && expression.expression.expression.getText() === 'require'
        && expression.expression.arguments[0]?.getText().replace(/['"]/g, '') === 'react-native' && expression.name.text === 'TextInput') return 'raw-native-input';
      if (module.namespaces.has(root) && expression.name.text === 'TextInput') return 'raw-native-input';
      const binding = module.imports.get(root);
      if (binding?.name === '*') return resolveImport(module, {from: binding.from, name: expression.name.text}, seen);
    }
    if (ts.isElementAccessExpression(expression) && module.namespaces.has(expression.expression.getText())) return 'unresolved-input-construction';
    if (ts.isConditionalExpression(expression) && (resolveControl(module, expression.whenTrue, seen) || resolveControl(module, expression.whenFalse, seen))) return 'unresolved-input-construction';
    return null;
  }
  function resolveValue(module, expression, seen = new Set()) {
    const node = unwrap(expression);
    if (!node || seen.has(node)) return {unknown: true};
    seen = new Set(seen).add(node);
    if (ts.isIdentifier(node)) {
      if (['undefined', 'null', 'false', 'true'].includes(node.text)) return {keys: [], values: {}};
      return resolveValue(module, module.values.get(node.text), seen);
    }
    if (ts.isPropertyAccessExpression(node)) {
      let base = unwrap(module.values.get(node.expression.getText()));
      if (base && ts.isCallExpression(base) && base.expression.getText().endsWith('StyleSheet.create')) base = base.arguments[0];
      if (base && ts.isObjectLiteralExpression(base)) {
        const property = base.properties.find(prop => nameOf(prop.name) === node.name.text);
        return resolveValue(module, property?.initializer, seen);
      }
      return {unknown: true};
    }
    if (ts.isCallExpression(node) && node.expression.getText().endsWith('StyleSheet.create')) return resolveValue(module, node.arguments[0], seen);
    if (ts.isArrayLiteralExpression(node) || ts.isConditionalExpression(node) || (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind))) {
      const parts = ts.isArrayLiteralExpression(node) ? node.elements : ts.isConditionalExpression(node) ? [node.whenTrue, node.whenFalse] : [node.right];
      return merge(parts.map(part => resolveValue(module, part, seen)));
    }
    if (ts.isObjectLiteralExpression(node)) {
      return merge(node.properties.map(prop => ts.isSpreadAssignment(prop) ? resolveValue(module, prop.expression, seen)
        : {keys: [nameOf(prop.name)], values: {[nameOf(prop.name)]: prop.initializer ?? prop.name}}));
    }
    if (node.kind === ts.SyntaxKind.NullKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return {keys: [], values: {}};
    return {unknown: true};
  }
  const merge = parts => ({unknown: parts.some(part => part.unknown), keys: parts.flatMap(part => part.keys ?? []), values: Object.assign({}, ...parts.map(part => part.values))});
  const results = [];
  for (const module of modules.values()) visitAll(module.ast, node => {
    let kind, component, properties = [], unknownSpread = false;
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      kind = resolveControl(module, node.tagName); component = node.tagName.getText();
      if (kind) for (const prop of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(prop)) {
          const resolved = resolveValue(module, prop.expression); unknownSpread ||= !!resolved.unknown;
          properties.push(...Object.entries(resolved.values ?? {}));
        } else properties.push([prop.name.getText(), prop.initializer && ts.isJsxExpression(prop.initializer) ? prop.initializer.expression : prop.initializer]);
      }
    } else if (ts.isCallExpression(node) && (/(?:^|\.)createElement$/.test(node.expression.getText())
      || module.imports.get(node.expression.getText())?.from === 'react' && module.imports.get(node.expression.getText())?.name === 'createElement')) {
      kind = resolveControl(module, node.arguments[0]); component = node.arguments[0]?.getText();
      if (kind && node.arguments[1]) { const resolved = resolveValue(module, node.arguments[1]); unknownSpread = !!resolved.unknown; properties = Object.entries(resolved.values ?? {}); }
    } else if ((ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) && /<(input|textarea)\b/i.test(node.getText())) {
      const text = node.getText();
      for (const match of text.matchAll(/<(input|textarea)\b[^>]*>/gi)) results.push({file: module.file, line: module.ast.getLineAndCharacterOfPosition(node.getStart() + match.index).line + 1, component: match[1], owner: ownerOf(node), kind: 'embedded-input', fingerprint: fingerprint(match[0]), violations: ['embedded-input'], props: {}});
      return;
    }
    if (!kind) return;
    const violations = new Set(['raw-native-input', 'embedded-input', 'unresolved-input-construction'].includes(kind) ? [kind] : []);
    const fieldName = module.imports.get(component)?.name ?? component;
    const opensEditorElsewhere = /PickerField|PickerFieldTrigger|LongTextField|Combobox|ObjectPicker/.test(fieldName);
    if (kind !== 'input-host' && !opensEditorElsewhere && hasUnmanagedKeyboardScroll(node, module.imports, module.file)) violations.add('unmanaged-keyboard-scroll');
    if (kind === 'input-wrapper') violations.add('legacy-input-wrapper');
    if (unknownSpread && kind !== 'input-host') violations.add('unresolved-props-spread');
    const props = {};
    for (const [name, value] of properties) {
      props[name] = value ? ts.isStringLiteralLike(value) ? value.text : value.getText() : true;
      if (name === 'variant' && ['surface', 'ghost'].includes(props[name])) violations.add('legacy-variant');
      if (['variant', 'fieldVariant', 'surfaceVariant'].includes(name) && value && !ts.isStringLiteralLike(value)) violations.add('unresolved-variant');
      if (name === 'elevation' && props[name] === 'elevated') violations.add('elevated-input');
      if (kind !== 'input-host' && ['style', 'inputStyle', 'containerStyle', 'wrapperStyle', 'textStyle'].includes(name) && value) {
        const resolved = resolveValue(module, value);
        if (resolved.unknown) violations.add('unresolved-style');
        if (resolved.keys?.some(key => appearance.test(key))) violations.add('appearance-override');
      }
    }
    if (kind !== 'input-host' && ['always', 'while-editing', 'unless-editing'].includes(props.clearButtonMode)
      && props.trailingIcon === 'close' && props.onPressTrailingIcon
      && !['undefined', 'null', 'false'].includes(props.onPressTrailingIcon)) {
      violations.add('duplicate-clear-controls');
    }
    const canonicalName = module.imports.get(component)?.name ?? component;
    if (['Input', 'Textarea', 'LongTextField', 'PickerFieldTrigger', 'SmallSetPickerField', 'EnumPickerField', 'RelationPickerField'].includes(canonicalName)
      && Object.hasOwn(props, 'treatment')) violations.add('removed-treatment-prop');
    results.push({kind, file: module.file, component, line: module.ast.getLineAndCharacterOfPosition(node.getStart()).line + 1, owner: ownerOf(node), fingerprint: fingerprint(node), violations: [...violations].sort(), props});
  });
  return results;
}
export function scanInputSites({file, source}) { return scanInputProject({sources: {[file]: source}}); }

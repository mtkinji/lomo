import ts from 'typescript';
import path from 'node:path';

const sharedScrollHosts = new Set(['KeyboardAwareScrollView', 'BottomDrawerScrollView', 'CanvasScrollView', 'CanvasFlatList', 'CanvasFlatListWithRef']);
const sharedLayoutHosts = new Set(['Dialog', 'DialogContent', 'SharedLifePage', 'KeyboardSafeFormSheet', 'KeyboardSafeScrollView']);

/** Checks the field's actual JSX ancestry, not whether a file imports a safe host. */
export function hasUnmanagedKeyboardScroll(node, imports, file) {
  let unmanaged = false;
  const attr = (opening, name) => opening.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText() === name);
  const disabled = prop => prop?.initializer?.getText() === '{false}';
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (!ts.isJsxElement(parent) || parent.openingElement === node) continue;
    const opening = parent.openingElement;
    const tag = opening.tagName;
    const namespace = ts.isPropertyAccessExpression(tag) ? imports.get(tag.expression.getText()) : null;
    const binding = namespace && ['*', 'default'].includes(namespace.name)
      ? { from: namespace.from, name: tag.name.text }
      : imports.get(tag.getText());
    if (!binding) continue;
    const native = ['react-native', 'react-native-gesture-handler'].includes(binding.from);
    const importPath = binding.from.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), binding.from)) : binding.from;
    const owned = /(?:^|\/)(ui|shared-home)(?:\/|$)/.test(importPath);
    if (native && binding.name === 'ScrollView') unmanaged = true;
    if (owned && sharedScrollHosts.has(binding.name)) return unmanaged;
    if (native && binding.name === 'KeyboardAvoidingView' && !disabled(attr(opening, 'enabled'))) return false;
    if (owned && sharedLayoutHosts.has(binding.name) && !disabled(attr(opening, 'keyboardAvoidance'))) return false;
    // A portal interrupts ancestor geometry; its own layout requires runtime proof.
    if (native && binding.name === 'Modal' || owned && binding.name === 'BottomDrawer') return unmanaged;
  }
  return unmanaged;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {scanInputSites} from './scan.mjs';

const scan = source => scanInputSites({file: 'src/features/Form.tsx', source});
const violations = source => scan(source).flatMap(site => site.violations).filter(value => value === 'unmanaged-keyboard-scroll');
const imports = `import {ScrollView as NativeScroll, KeyboardAvoidingView} from 'react-native'; import {Input} from '../ui/Input'; import {KeyboardAwareScrollView} from '../ui/KeyboardAwareScrollView';`;

test('rejects a canonical field in an aliased plain native scroll view', () => {
  assert.equal(violations(`${imports} const Form = () => <NativeScroll><Input treatment="unified" /></NativeScroll>;`).length, 1);
});
test('rejects the same unmanaged form through a native namespace import', () => {
  assert.equal(violations(`import * as RN from 'react-native'; import {Input} from '../ui/Input'; const Form = () => <RN.ScrollView><Input treatment="unified" /></RN.ScrollView>;`).length, 1);
});
test('traces local field wrappers inside the unmanaged form', () => {
  assert.equal(violations(`${imports} const Field = props => <Input {...props} />; const Form = () => <NativeScroll><Field value="" /></NativeScroll>;`).length, 1);
});
test('accepts the explicit focus-reveal host', () => {
  assert.deepEqual(violations(`${imports} const Form = () => <KeyboardAwareScrollView><Input treatment="unified" /></KeyboardAwareScrollView>;`), []);
});
test('an unrelated safe sibling cannot cover an unmanaged field', () => {
  assert.equal(violations(`${imports} const Form = () => <><KeyboardAwareScrollView /><NativeScroll><Input treatment="unified" /></NativeScroll></>;`).length, 1);
});
test('a plain inner scroll view cannot borrow an outer scroll hosts focus context', () => {
  assert.equal(violations(`${imports} const Form = () => <KeyboardAwareScrollView><NativeScroll><Input treatment="unified" /></NativeScroll></KeyboardAwareScrollView>;`).length, 1);
});
test('retains an explicit native avoidance owner around a scroll view', () => {
  assert.deepEqual(violations(`${imports} const Form = () => <KeyboardAvoidingView behavior="padding"><NativeScroll><Input treatment="unified" /></NativeScroll></KeyboardAvoidingView>;`), []);
});
test('a disabled native avoidance owner does not qualify', () => {
  assert.equal(violations(`${imports} const Form = () => <KeyboardAvoidingView enabled={false}><NativeScroll><Input treatment="unified" /></NativeScroll></KeyboardAvoidingView>;`).length, 1);
});
test('does not attribute a modal field to the scroll view behind it', () => {
  assert.deepEqual(violations(`${imports} import {BottomDrawer, BottomDrawerScrollView} from '../ui/BottomDrawer'; const Form = () => <NativeScroll><BottomDrawer><BottomDrawerScrollView><Input treatment="unified" /></BottomDrawerScrollView></BottomDrawer></NativeScroll>;`), []);
});

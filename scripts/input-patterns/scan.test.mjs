import test from 'node:test';
import assert from 'node:assert/strict';
import { scanInputSites, scanInputProject } from './scan.mjs';

const scan = source => scanInputSites({ file: 'src/features/demo/Form.tsx', source });
const raw = source => scan(source).filter(site => site.kind === 'raw-native-input');
test('detects named, namespace, default and require aliases only when rendered', () => {
  for (const source of [
    'import {TextInput as Entry} from "react-native"; const Form = () => <Entry />;',
    'import * as RN from "react-native"; const Form = () => <RN.TextInput />;',
    'import RN from "react-native"; const Form = () => <RN.TextInput />;',
    'const {TextInput: Entry} = require("react-native"); const Form = () => <Entry />;',
    'const RN = require("react-native"); const Form = () => React.createElement(RN.TextInput, {});',
    'import {TextInput} from "react-native"; const Entry = TextInput; const Form = () => <Entry />;',
  ]) assert.equal(raw(source).length, 1, source);
  assert.equal(raw('import type {TextInput} from "react-native"; let ref: TextInput | null = null;').length, 0);
  assert.equal(raw('import {TextInput} from "react-native"; TextInput.State.currentlyFocusedInput();').length, 0);
});
test('fingerprints survive formatting and line movement but distinguish changed controls', () => {
  const a = raw('import {TextInput} from "react-native"; const Form=()=> <TextInput placeholder="Name" />;')[0];
  const b = raw('\nimport {TextInput} from "react-native";\nconst Form = () => (\n <TextInput\n placeholder="Name"\n />\n);')[0];
  const c = raw('import {TextInput} from "react-native"; const Form=()=> <TextInput placeholder="Email" />;')[0];
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(a.fingerprint, c.fingerprint);
  assert.equal(a.owner, 'Form');
});
test('resolves local styles and spreads and separates layout from material', () => {
  const sites = scan(`import {Input} from '../../ui';
    const shared = {borderRadius: 10};
    const styles = StyleSheet.create({field: {...shared, backgroundColor: 'red'}, placement: {marginTop: 8}});
    const Form = () => <><Input style={[styles.field, styles.placement]} /><Input containerStyle={styles.placement} /><Input {...unknown} /></>;`);
  assert(sites[0].violations.includes('appearance-override'));
  assert(!sites[1].violations.includes('appearance-override'));
  assert(!sites[1].violations.includes('unresolved-style'));
  assert(sites[2].violations.includes('unresolved-props-spread'));
});
test('records legacy variants, elevation and unknown style resolution', () => {
  const sites = scan('import {Input} from "../../ui"; const Form=()=> <><Input variant="surface" /><Input elevation="elevated" /><Input inputStyle={props.style} /></>;');
  assert(sites[0].violations.includes('legacy-variant'));
  assert(sites[1].violations.includes('elevated-input'));
  assert(sites[2].violations.includes('unresolved-style'));
});
test('follows local wrappers and project reexports without counting imports as controls', () => {
  const sites = scanInputProject({ sources: {
    'src/ui/entry.tsx': 'export {TextInput as Entry} from "react-native";',
    'src/features/demo/Form.tsx': 'import {Entry} from "../../ui/entry"; const Field = p => <Entry {...p} />; const Form = () => <Field />;',
  }});
  assert.equal(sites.filter(site => site.kind === 'raw-native-input').length, 1);
  assert.equal(sites.filter(site => site.kind === 'input-wrapper').length, 1);
});
test('captures embedded markup and unresolved native constructions for review', () => {
  assert.equal(scan('const html = `<html><input name="q"/><textarea></textarea></html>`;').filter(s => s.kind === 'embedded-input').length, 2);
  assert.equal(scan('import * as RN from "react-native"; const Form = () => React.createElement(RN[kind], {});')[0].kind, 'unresolved-input-construction');
});
test('recognizes canonical relative imports and rich controls', () => {
  const sites = scanInputProject({sources: {
    'src/ui/PickerFields.tsx': 'import {Input} from "./Input"; import {RichEditor} from "react-native-pell-rich-editor"; const Field=()=> <><Input /><RichEditor /></>;',
    'src/ui/Input.tsx': 'export const Input = memo(forwardRef((props, ref) => <TextInput />));',
  }});
  assert.deepEqual(sites.map(site => site.kind), ['shared-input', 'rich-input']);
});
test('distinguishes field wrappers from container screen references', () => {
  const sites = scan('import {TextInput} from "react-native"; const Field=p=><TextInput {...p}/>; const Screen=()=> <View><Field value="a"/></View>; const App=()=> <Screen/>;');
  assert.equal(sites.find(site => site.component === 'Screen').kind, 'input-host');
  assert.equal(sites.find(site => site.component === 'Field').kind, 'input-wrapper');
});
test('follows export-star barrels and flags dynamic component aliases', () => {
  const sites = scanInputProject({sources: {
    'src/entry.ts': 'export {TextInput as Entry} from "react-native";',
    'src/barrel.ts': 'export * from "./entry";',
    'src/Form.tsx': 'import {Entry} from "./barrel"; const Dynamic = condition ? Entry : View; const Form = () => <><Entry/><Dynamic/></>;',
  }});
  assert.deepEqual(sites.map(s => s.kind), ['raw-native-input', 'unresolved-input-construction']);
});
test('does not let new calls silently adopt legacy defaults or a dynamic material', () => {
  const sites = scan('import {Input as Entry} from "../../ui/Input"; const Form = () => <><Entry/><Entry treatment="unified"/><Entry treatment="unified" variant={choice}/></>;');
  assert(!sites[0].violations.includes('removed-treatment-prop'));
  assert(sites[1].violations.includes('removed-treatment-prop'));
  assert(sites[2].violations.includes('unresolved-variant'));
});
test('recognizes require-member controls and aliased React createElement', () => {
  const sites = scan('import {createElement as make} from "react"; const Entry = require("react-native").TextInput; const Form = () => make(Entry, {placeholder:"Name"});');
  assert.equal(sites[0]?.kind, 'raw-native-input');
});
test('resolves the repository root alias and rejects newly reused legacy wrappers', () => {
  const sites = scanInputProject({sources: {
    'src/features/demo/Field.tsx': 'import {TextInput} from "react-native"; export const Field = p => <TextInput {...p}/>;',
    'src/features/demo/Form.tsx': 'import {Field} from "@/src/features/demo/Field"; const Form = () => <Field value="new"/>;',
  }});
  const wrapper = sites.find(site => site.component === 'Field');
  assert.equal(wrapper?.kind, 'input-wrapper');
  assert(wrapper.violations.includes('legacy-input-wrapper'));
});

test('accepts the owned grouped settings adapter while rejecting caller appearance overrides', () => {
  const sites = scanInputProject({sources: {
    'src/ui/SettingsSurface.tsx': 'import {Input} from "./Input"; export const SettingsTextInputRow = p => <Input treatment="unified" variant="plain" {...p}/>;',
    'src/features/demo/Form.tsx': 'import {SettingsTextInputRow as Row} from "../../ui/SettingsSurface"; const Form = () => <><Row label="Name" value="A"/><Row label="Name" value="B" inputStyle={{backgroundColor:"red"}}/></>;',
  }});
  const rows = sites.filter(site => site.component === 'Row');
  assert.equal(rows[0].kind, 'shared-input');
  assert.deepEqual(rows[0].violations, []);
  assert(rows[1].violations.includes('appearance-override'));
});

test('rejects removed treatment flags on rich-note previews', () => {
  const sites = scan('import {LongTextField as Notes} from "../../ui/LongTextField"; const Form = () => <><Notes value="draft"/><Notes treatment="unified" value="draft"/></>;');
  assert(!sites[0].violations.includes('removed-treatment-prop'));
  assert(sites[1].violations.includes('removed-treatment-prop'));
});

test('recognizes the reviewed store finder by exact module and still audits its internals', () => {
  const sites = scanInputProject({sources: {
    'src/capabilities/groceries/components/KrogerStoreFinder.tsx': 'import {TextInput} from "react-native"; export const KrogerStoreFinder = ({query}) => <TextInput value={query}/>;',
    'src/features/demo/Other.tsx': 'import {TextInput} from "react-native"; export const KrogerStoreFinder = ({query}) => <TextInput value={query}/>;',
    'src/features/demo/Form.tsx': 'import {KrogerStoreFinder as Finder} from "../../capabilities/groceries/components/KrogerStoreFinder"; import {KrogerStoreFinder as OtherFinder} from "./Other"; const Form=()=> <><Finder query="a"/><Finder query="b" inputStyle={{backgroundColor:"red"}}/><OtherFinder query="c"/></>;',
  }});
  const finders = sites.filter(site => site.component === 'Finder');
  assert.equal(finders[0].kind, 'shared-input');
  assert.deepEqual(finders[0].violations, []);
  assert(finders[1].violations.includes('appearance-override'));
  assert(sites.find(site => site.component === 'OtherFinder').violations.includes('legacy-input-wrapper'));
  assert.equal(sites.filter(site => site.kind === 'raw-native-input').length, 2);
});

test('recognizes owned internal filter and fixed-set adapters without skipping their controls', () => {
  const sites = scanInputProject({sources: {
    'src/ui/FilterDrawer.tsx': 'import {Input} from "./Input"; function ValueInput({value}) {return <Input treatment="unified" value={value}/>}; export const FilterDrawer=()=> <ValueInput value="a"/>;',
    'src/ui/PickerFields.tsx': 'import {Input} from "./Input"; function FixedSetPickerField(props) {return <Input {...props}/>}; export const EnumPickerField=props=> <FixedSetPickerField {...props}/>;',
  }});
  assert.equal(sites.find(s => s.component === 'ValueInput').kind, 'shared-input');
  assert.equal(sites.find(s => s.component === 'FixedSetPickerField').kind, 'shared-input');
  assert(sites.find(s => s.component === 'FixedSetPickerField').violations.includes('unresolved-props-spread'));
  assert.equal(sites.filter(s => s.component === 'Input').length, 2);
});

test('recognizes the owned quick-add adapter while retaining its internal input audit', () => {
  const sites = scanInputProject({sources: {
    'src/features/activities/QuickAddDock.tsx': 'import {Input} from "../../ui/Input"; export function QuickAddDock({value}) {return <Input value={value}/>}',
    'src/features/demo/Form.tsx': 'import {QuickAddDock as Capture} from "../activities/QuickAddDock"; export const Form = () => <Capture value="draft"/>;',
  }});
  assert.equal(sites.find(s => s.component === 'Capture').kind, 'shared-input');
  assert.equal(sites.find(s => s.component === 'Input').kind, 'shared-input');
});

test('rejects simultaneous native and custom clear controls through aliases and resolved spreads', () => {
  for (const mode of ['always', 'while-editing', 'unless-editing']) {
    const sites = scan(`import {Input as Entry} from '../../ui/Input';
      const clearProps = {clearButtonMode: '${mode}', trailingIcon: 'close', onPressTrailingIcon: clear};
      const Form = () => <Entry treatment="unified" {...clearProps} />;`);
    assert(sites[0].violations.includes('duplicate-clear-controls'));
  }
});

test('allows one clear owner and does not confuse a password visibility action with clear', () => {
  const sites = scan(`import {Input} from '../../ui/Input'; const Form=()=> <>
    <Input treatment="unified" clearButtonMode="never" trailingIcon="close" onPressTrailingIcon={clear}/>
    <Input treatment="unified" clearButtonMode="while-editing"/>
    <Input treatment="unified" clearButtonMode="always" trailingIcon="close" onPressTrailingIcon={undefined}/>
    <Input treatment="unified" trailingIcon="close" onPressTrailingIcon={clear}/>
    <Input treatment="unified" clearButtonMode="while-editing" trailingIcon="eye" onPressTrailingIcon={togglePassword}/>
  </>;`);
  assert(sites.every(site => !site.violations.includes('duplicate-clear-controls')));
});

test('recognizes owned title callers while still inspecting their native renderer', () => {
  const sites = scanInputProject({sources: {
    'src/ui/TitleInput.tsx': 'import {TextInput} from "react-native"; export const TitleInput = props => <TextInput {...props}/>;',
    'src/features/demo/Form.tsx': 'import {TitleInput as Heading} from "../../ui/TitleInput"; export const Form = () => <Heading accessibilityLabel="Title"/>;',
  }});
  assert.equal(sites.find(s => s.component === 'Heading').kind, 'shared-input');
  assert(sites.find(s => s.component === 'TextInput').violations.includes('raw-native-input'));
});

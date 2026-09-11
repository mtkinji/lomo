import React from 'react';
import { render } from '@testing-library/react-native';
import { RichTextBlock } from './RichTextBlock';
import { typography } from '../theme';

const mockRender = jest.fn();
jest.mock('react-native-render-html', () => (props: unknown) => { mockRender(props); return null; });

test('read mode keeps authored blank lines, paragraph and list spacing from the editor', () => {
  render(<RichTextBlock value="<p>Before</p><p><br></p><ul><li>Item</li></ul>" />);
  const props = mockRender.mock.calls.at(-1)![0];
  expect(props.classesStyles['kwilt-blank-line'].height).toBe(typography.body.lineHeight);
  expect(props.tagsStyles.p.marginBottom).toBe(0);
  expect(props.tagsStyles.ul.marginTop).toBe(typography.body.fontSize);
  expect(props.tagsStyles.ul.paddingLeft).toBe(40);
});

test('read mode preserves bold, italic and underline when combined in one span', () => {
  render(<RichTextBlock value="<p>Text</p>" />);
  const props = mockRender.mock.calls.at(-1)![0];
  const element = { name: 'span', attribs: { style: 'font-weight: bold; font-style: italic; text-decoration: underline' } };
  props.domVisitors.onElement(element);
  expect(element.name).toBe('strong');
  expect(element.attribs.style).toContain('font-style: italic');
  expect(element.attribs.style).toContain('text-decoration: underline');
});

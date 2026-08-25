import React from 'react';
import { render } from '@testing-library/react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { KwiltIcon } from './KwiltIcons';

describe('Kwilt token icon optical sizing', () => {
  it('uses the same canonical drawing at metadata and standard sizes', () => {
    const compact = render(<KwiltIcon name="token" size={20} color="#111" />);
    const standard = render(<KwiltIcon name="token" size={24} color="#111" />);

    expect(compact.UNSAFE_getByType(Svg).props).toMatchObject({
      viewBox: '2 2 20 20',
      strokeWidth: 1.7,
    });
    expect(standard.UNSAFE_getByType(Svg).props).toMatchObject({
      viewBox: '2 2 20 20',
      strokeWidth: 1.7,
    });
    expect(compact.UNSAFE_getAllByType(Circle)).toHaveLength(1);
    expect(compact.UNSAFE_queryAllByType(Ellipse)).toHaveLength(0);
    expect(compact.UNSAFE_getAllByType(Path)).toHaveLength(3);
    expect(compact.UNSAFE_getAllByType(Path).map((node) => node.props.transform)).toEqual([
      'translate(1 -2)',
      'translate(-2 -3)',
      'translate(9 0)',
    ]);
    expect(compact.UNSAFE_getAllByType(G).some((node) => (
      node.props.fill === '#111' && node.props.stroke === 'none'
    ))).toBe(true);
    expect(compact.UNSAFE_getAllByType(Path).map((node) => node.props.d)).toEqual([
      'M49 9C70 9 87 26 87 47V187C87 217 70 241 47 247C26 252 10 244 10 228V48C10 26 27 9 49 9Z',
      'M166 9C143 10 126 28 126 51V121C126 136 135 143 147 137C172 124 197 108 218 89C236 72 246 49 246 25C246 16 239 10 230 9C209 7 187 7 166 9Z',
      'M218 140C234 139 246 149 246 164V215C246 233 232 247 214 247H113C104 247 100 238 104 229C127 178 168 144 218 140Z',
    ]);
    expect(compact.UNSAFE_getAllByType(Path).map((node) => node.props.d))
      .toEqual(standard.UNSAFE_getAllByType(Path).map((node) => node.props.d));
  });
});

const React = require('react');
const { View } = require('react-native');

const Svg = ({ children, style, width, height, ...rest }) => {
  return (
    <View
      style={[
        style,
        width != null || height != null
          ? { width: width, height: height }
          : null,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

// Shape primitives rendered as no-ops: avoids native SVG crashes while
// allowing the rest of the UI to function. Icons using react-native-svg
// simply won't render until native SVG is properly wired up.
const Noop = () => null;

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  // Common convenience renderers used by `react-native-svg` consumers.
  // In shim mode they should render nothing (but must exist to avoid crashing).
  SvgXml: Noop,
  SvgUri: Noop,
  Path: Noop,
  Circle: Noop,
  Rect: Noop,
  Line: Noop,
  Ellipse: Noop,
  Polygon: Noop,
  Polyline: Noop,
  Defs: ({ children }) => children || null,
  G: ({ children }) => children || null,
  ClipPath: Noop,
  LinearGradient: Noop,
  RadialGradient: Noop,
  Stop: Noop,
  Text: Noop,
  TSpan: Noop,
  TextPath: Noop,
  Use: Noop,
  Symbol: Noop,
  Pattern: Noop,
  Mask: Noop,
};



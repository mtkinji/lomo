import React, { useCallback, useMemo } from 'react';
import { Linking, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { colors, spacing, typography, fonts } from '../theme';
import { normalizeToHtml } from './richText';

export function RichTextBlock({
  value,
  horizontalPaddingPx = spacing.md,
}: {
  value: string;
  /**
   * Used to derive an approximate contentWidth for layout.
   * (LongTextField read surface uses `spacing.md`.)
   */
  horizontalPaddingPx?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();

  const html = useMemo(() => normalizeToHtml(value), [value]);
  const contentWidth = Math.max(0, windowWidth - horizontalPaddingPx * 2);

  const systemFonts = useMemo(() => Object.values(fonts), []);

  const onLinkPress = useCallback((_event: unknown, href: string) => {
    const url = String(href ?? '').trim();
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  }, []);

  const domVisitors = useMemo(
    () => ({
      onElement: (element: any) => {
        // Pell/WKWebView can emit bold/italic/underline as <span style="...">.
        // Convert those to semantic tags so our tag styles apply reliably.
        if (element.name !== 'span') return;
        const style = element.attribs?.style;
        if (!style) return;

        const styleLower = String(style).toLowerCase();
        const hasBold =
          /font-weight\s*:\s*(bold|[6-9]00)/.test(styleLower) ||
          /font-weight\s*:\s*[6-9]\d{2}/.test(styleLower);
        const hasItalic = /font-style\s*:\s*italic/.test(styleLower);
        const hasUnderline = /text-decoration\s*:\s*underline/.test(styleLower);

        if (!hasBold && !hasItalic && !hasUnderline) return;

        // Prefer strong > em > u if multiple are present.
        element.name = hasBold ? 'strong' : hasItalic ? 'em' : 'u';

        // Remove the formatting declarations we just encoded via the tag.
        const nextStyle = String(style)
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => {
            const k = part.split(':')[0]?.trim()?.toLowerCase();
            if (!k) return false;
            if (hasBold && k === 'font-weight') return false;
            if (hasItalic && k === 'font-style') return false;
            if (hasUnderline && k === 'text-decoration') return false;
            return true;
          })
          .join('; ');

        if (nextStyle) {
          element.attribs.style = nextStyle;
        } else {
          delete element.attribs.style;
        }
      },
    }),
    []
  );

  const baseStyle = useMemo(
    () => ({
      ...(typography.bodySm as any),
      color: colors.textPrimary,
    }),
    []
  );

  const tagsStyles = useMemo(
    () => ({
      p: {
        marginTop: 0,
        // `react-native-render-html` lays out block elements on their own lines.
        // Even with margin 0, consecutive paragraphs can feel like a full extra line break.
        // Pull paragraphs slightly closer to better match the in-editor rhythm.
        marginBottom: -10,
      },
      div: {
        marginTop: 0,
        marginBottom: 0,
      },
      strong: {
        // With custom fonts, `fontWeight: 'bold'` often won't render unless
        // we switch to the actual bold face.
        fontFamily: fonts.semibold,
      },
      b: {
        fontFamily: fonts.semibold,
      },
      em: {
        fontStyle: 'italic' as const,
      },
      i: {
        fontStyle: 'italic' as const,
      },
      u: {
        textDecorationLine: 'underline' as const,
      },
      a: {
        color: colors.accent,
        textDecorationLine: 'underline' as const,
      },
      ul: {
        marginTop: 0,
        marginBottom: 0,
        paddingLeft: 18,
      },
      ol: {
        marginTop: 0,
        marginBottom: 0,
        paddingLeft: 18,
      },
      li: {
        marginTop: 0,
        marginBottom: 0,
      },
    }),
    []
  );

  const renderersProps = useMemo(
    () => ({
      a: { onPress: onLinkPress },
    }),
    [onLinkPress]
  );

  const source = useMemo(() => ({ html: `<div>${html}</div>` }), [html]);

  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={source}
      // `react-native-render-html` will drop unknown fonts unless we register them.
      // We want rich text in the read surface to match the app's Inter typography.
      systemFonts={systemFonts}
      domVisitors={domVisitors}
      baseStyle={baseStyle}
      tagsStyles={tagsStyles}
      renderersProps={renderersProps}
    />
  );
}



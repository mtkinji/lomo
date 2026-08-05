import * as WebBrowser from 'expo-web-browser';
import { Linking, NativeModules, Platform } from 'react-native';

type NativeAttachmentPreview = {
  previewRemoteURL: (url: string, fileName: string) => Promise<boolean>;
};

type AttachmentPreviewDependencies = {
  platformOS: string;
  nativePreview: NativeAttachmentPreview | null;
  openBrowser: (url: string) => Promise<unknown>;
  openExternal: (url: string) => Promise<unknown>;
};

const defaultDependencies: AttachmentPreviewDependencies = {
  platformOS: Platform.OS,
  nativePreview: ((NativeModules as any)?.KwiltAttachmentPreview as NativeAttachmentPreview | undefined) ?? null,
  openBrowser: (url) => WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  }),
  openExternal: (url) => Linking.openURL(url),
};

export async function previewRemoteAttachment(
  params: { url: string; fileName: string },
  dependencies: AttachmentPreviewDependencies = defaultDependencies,
): Promise<'quick-look' | 'browser' | 'external'> {
  if (dependencies.platformOS === 'ios' && dependencies.nativePreview) {
    try {
      await dependencies.nativePreview.previewRemoteURL(params.url, params.fileName);
      return 'quick-look';
    } catch {
      // Continue through the same safe preview fallbacks used by non-native builds.
    }
  }

  try {
    await dependencies.openBrowser(params.url);
    return 'browser';
  } catch {
    await dependencies.openExternal(params.url);
    return 'external';
  }
}

import { Platform, Share } from 'react-native';

/**
 * iOS share sheets build their rich preview ("LinkPresentation" card) from the primary item.
 * React Native's core Share API can end up prioritizing `message` over `url`, which yields a
 * generic preview. To reliably get an Airbnb-style preview, share the URL as the primary item
 * on iOS (and put any copy in the subject / Android message).
 */
export async function shareUrlWithPreview(params: {
  url: string;
  message?: string;
  subject?: string;
  androidDialogTitle?: string;
  androidAppendUrl?: boolean;
}): Promise<void> {
  const url = params.url.trim();
  if (!url) return;

  if (Platform.OS === 'ios') {
    // URL-first for rich previews. (Most targets let the user add message copy manually.)
    await Share.share({ url }, { subject: params.subject });
    return;
  }

  const message = (params.message ?? '').trim();
  const appendUrl = params.androidAppendUrl ?? true;
  const fullMessage = message ? (appendUrl ? `${message}\n\n${url}` : message) : url;
  await Share.share(
    { message: fullMessage, title: params.subject },
    params.androidDialogTitle ? { dialogTitle: params.androidDialogTitle } : undefined,
  );
}



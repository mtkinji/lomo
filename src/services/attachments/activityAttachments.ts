import * as FileSystem from 'expo-file-system/legacy';
// NOTE: `expo-av` is deprecated (will be removed in a future Expo SDK).
// Lazy-load it so the deprecation warning does not spam on app launch.
type ExpoAvAudio = (typeof import('expo-av'))['Audio'];
let Audio: ExpoAvAudio | null = null;

async function getAudio(): Promise<ExpoAvAudio> {
  if (Audio) return Audio;
  const mod = await import('expo-av');
  Audio = mod.Audio;
  return Audio;
}
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import type { Activity, ActivityAttachment, ActivityAttachmentKind } from '../../domain/types';
import { getSupabasePublishableKey, getAiProxyBaseUrl } from '../../utils/getEnv';
import { getInstallId } from '../installId';
import { ensureSignedInWithPrompt, getAccessToken } from '../backend/auth';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useToastStore } from '../../store/useToastStore';
import { useAppStore } from '../../store/useAppStore';
import { openPaywallInterstitial } from '../paywall';

const BUCKET = 'activity_attachments';

const AI_PROXY_BASE_URL_RAW = getAiProxyBaseUrl();
const AI_PROXY_BASE_URL =
  typeof AI_PROXY_BASE_URL_RAW === 'string' ? AI_PROXY_BASE_URL_RAW.trim().replace(/\/+$/, '') : undefined;

function getFunctionBaseUrl(functionName: string): string | null {
  if (!AI_PROXY_BASE_URL) return null;
  // aiProxyBaseUrl is expected to end with `/ai-chat` (edge function name).
  // Derive sibling function URL.
  if (AI_PROXY_BASE_URL.endsWith('/ai-chat')) {
    return `${AI_PROXY_BASE_URL.slice(0, -'/ai-chat'.length)}/${functionName}`;
  }
  return null;
}

async function buildEdgeHeaders(requireAuth: boolean): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  try {
    const installId = await getInstallId();
    headers.set('x-kwilt-install-id', installId);
  } catch {
    // best-effort
  }

  // Server-side enforcement prefers `kwilt_pro_entitlements`, but some environments
  // optionally allow trusting this header. Keep it consistent with AI proxy requests.
  const isPro = Boolean(useEntitlementsStore.getState().isPro);
  headers.set('x-kwilt-is-pro', isPro ? 'true' : 'false');

  if (requireAuth) {
    const token = (await getAccessToken())?.trim();
    if (!token) {
      throw new Error('Missing access token (not signed in)');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

function parseAttachmentRow(row: any): ActivityAttachment | null {
  const id = typeof row?.id === 'string' ? row.id : '';
  const kind = typeof row?.kind === 'string' ? row.kind : '';
  const fileName = typeof row?.file_name === 'string' ? row.file_name : '';
  const storagePath = typeof row?.storage_path === 'string' ? row.storage_path : '';
  if (!id || !kind || !fileName || !storagePath) return null;

  return {
    id,
    kind: kind as ActivityAttachmentKind,
    fileName,
    mimeType: typeof row?.mime_type === 'string' ? row.mime_type : null,
    sizeBytes: typeof row?.size_bytes === 'number' ? row.size_bytes : null,
    durationSeconds: typeof row?.duration_seconds === 'number' ? row.duration_seconds : null,
    storagePath,
    sharedWithGoalMembers: Boolean(row?.shared_with_goal_members),
    uploadStatus: 'uploaded',
    uploadError: null,
    createdAt: typeof row?.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

async function ensureSignedIn(): Promise<void> {
  await ensureSignedInWithPrompt('upload_attachment');
}

async function initUpload(params: {
  activityId: string;
  goalId: string | null;
  kind: ActivityAttachmentKind;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
}): Promise<{ attachment: ActivityAttachment; uploadSignedUrl: string }> {
  const base = getFunctionBaseUrl('attachments-init-upload');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({
      activityId: params.activityId,
      goalId: params.goalId,
      kind: params.kind,
      fileName: params.fileName,
      mimeType: params.mimeType ?? null,
      sizeBytes: params.sizeBytes ?? null,
      durationSeconds: params.durationSeconds ?? null,
      sharedWithGoalMembers: false,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to init upload';
    throw new Error(msg);
  }

  const attachment = parseAttachmentRow(data?.attachment);
  const signedUrl = typeof data?.upload?.signedUrl === 'string' ? data.upload.signedUrl : '';
  if (!attachment || !signedUrl) {
    throw new Error('Invalid upload response');
  }

  return { attachment, uploadSignedUrl: signedUrl };
}

async function uploadFileToSignedUrl(params: { signedUrl: string; fileUri: string; mimeType?: string | null }) {
  const result = await FileSystem.uploadAsync(params.signedUrl, params.fileUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': params.mimeType?.trim() ? params.mimeType.trim() : 'application/octet-stream',
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (status ${result.status})`);
  }
}

export async function addPhotoOrVideoToActivity(activity: Activity): Promise<void> {
  const ent = useEntitlementsStore.getState();
  const canUseAttachments = Boolean(ent.isPro || ent.isProToolsTrial);
  if (!canUseAttachments) {
    openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
    return;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
  if (!permission?.granted) {
    Alert.alert('Permission required', 'Please allow photo library access to add attachments.');
    return;
  }

  const pick = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 1,
  });
  if (pick.canceled) return;

  const asset = pick.assets?.[0];
  const uri = typeof asset?.uri === 'string' ? asset.uri : '';
  if (!uri) return;

  const mimeType = typeof asset?.mimeType === 'string' ? asset.mimeType : null;
  const fileName =
    typeof asset?.fileName === 'string' && asset.fileName.trim()
      ? asset.fileName.trim()
      : `attachment-${Date.now()}`;
  const sizeBytes = typeof asset?.fileSize === 'number' ? asset.fileSize : null;
  const kind: ActivityAttachmentKind = asset?.type === 'video' ? 'video' : 'photo';

  const toast = useToastStore.getState().showToast;

  // Create server row + get signed upload URL.
  let serverAttachment: ActivityAttachment;
  let uploadSignedUrl: string;
  try {
    const init = await initUpload({
      activityId: activity.id,
      goalId: activity.goalId ?? null,
      kind,
      fileName,
      mimeType,
      sizeBytes,
      durationSeconds: null,
    });
    serverAttachment = init.attachment;
    uploadSignedUrl = init.uploadSignedUrl;
  } catch (e: any) {
    toast({ message: e?.message ?? 'Unable to add attachment', variant: 'danger' });
    return;
  }

  // Optimistically add to local store in uploading state.
  const nowIso = new Date().toISOString();
  useAppStore.getState().updateActivity(activity.id, (prev) => ({
    ...prev,
    attachments: [
      ...(prev.attachments ?? []),
      { ...serverAttachment, uploadStatus: 'uploading', updatedAt: nowIso },
    ],
    updatedAt: nowIso,
  }));

  try {
    await uploadFileToSignedUrl({ signedUrl: uploadSignedUrl, fileUri: uri, mimeType });
    const finishedIso = new Date().toISOString();
    useAppStore.getState().updateActivity(activity.id, (prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).map((a) =>
        a.id === serverAttachment.id ? { ...a, uploadStatus: 'uploaded', uploadError: null, updatedAt: finishedIso } : a,
      ),
      updatedAt: finishedIso,
    }));
    toast({ message: 'Attachment added', variant: 'success', durationMs: 1800 });
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Upload failed';
    const failedIso = new Date().toISOString();
    useAppStore.getState().updateActivity(activity.id, (prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).map((a) =>
        a.id === serverAttachment.id ? { ...a, uploadStatus: 'failed', uploadError: msg, updatedAt: failedIso } : a,
      ),
      updatedAt: failedIso,
    }));
    toast({ message: msg, variant: 'danger' });
  }
}

export async function addDocumentToActivity(activity: Activity): Promise<void> {
  const ent = useEntitlementsStore.getState();
  const canUseAttachments = Boolean(ent.isPro || ent.isProToolsTrial);
  if (!canUseAttachments) {
    openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
    return;
  }

  // Dynamic require to keep the app compiling even if the dependency isn't installed yet.
  let DocumentPicker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    DocumentPicker = require('expo-document-picker');
  } catch {
    DocumentPicker = null;
  }
  if (!DocumentPicker?.getDocumentAsync) {
    Alert.alert('Unavailable', 'Document picker is not available in this build.');
    return;
  }

  const pick = await DocumentPicker.getDocumentAsync({
    multiple: false,
    copyToCacheDirectory: true,
  }).catch(() => null);
  if (!pick || pick.canceled) return;

  const asset = Array.isArray(pick.assets) ? pick.assets[0] : null;
  const uri = typeof asset?.uri === 'string' ? asset.uri : '';
  if (!uri) return;

  const mimeType = typeof asset?.mimeType === 'string' ? asset.mimeType : null;
  const fileName =
    typeof asset?.name === 'string' && asset.name.trim()
      ? asset.name.trim()
      : `document-${Date.now()}`;
  const sizeBytes = typeof asset?.size === 'number' ? asset.size : null;

  const toast = useToastStore.getState().showToast;

  let serverAttachment: ActivityAttachment;
  let uploadSignedUrl: string;
  try {
    const init = await initUpload({
      activityId: activity.id,
      goalId: activity.goalId ?? null,
      kind: 'document',
      fileName,
      mimeType,
      sizeBytes,
      durationSeconds: null,
    });
    serverAttachment = init.attachment;
    uploadSignedUrl = init.uploadSignedUrl;
  } catch (e: any) {
    toast({ message: e?.message ?? 'Unable to add attachment', variant: 'danger' });
    return;
  }

  const nowIso = new Date().toISOString();
  useAppStore.getState().updateActivity(activity.id, (prev) => ({
    ...prev,
    attachments: [
      ...(prev.attachments ?? []),
      { ...serverAttachment, uploadStatus: 'uploading', updatedAt: nowIso },
    ],
    updatedAt: nowIso,
  }));

  try {
    await uploadFileToSignedUrl({ signedUrl: uploadSignedUrl, fileUri: uri, mimeType });
    const finishedIso = new Date().toISOString();
    useAppStore.getState().updateActivity(activity.id, (prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).map((a) =>
        a.id === serverAttachment.id ? { ...a, uploadStatus: 'uploaded', uploadError: null, updatedAt: finishedIso } : a,
      ),
      updatedAt: finishedIso,
    }));
    toast({ message: 'Attachment added', variant: 'success', durationMs: 1800 });
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Upload failed';
    const failedIso = new Date().toISOString();
    useAppStore.getState().updateActivity(activity.id, (prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).map((a) =>
        a.id === serverAttachment.id ? { ...a, uploadStatus: 'failed', uploadError: msg, updatedAt: failedIso } : a,
      ),
      updatedAt: failedIso,
    }));
    toast({ message: msg, variant: 'danger' });
  }
}

let activeRecording: any | null = null;

export async function startAudioRecording(): Promise<void> {
  const ent = useEntitlementsStore.getState();
  const canUseAttachments = Boolean(ent.isPro || (ent as any).isProToolsTrial);
  if (!canUseAttachments) {
    openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
    return;
  }

  const Audio = await getAudio();
  const permission = await Audio.requestPermissionsAsync().catch(() => null);
  if (!permission?.granted) {
    Alert.alert('Permission required', 'Please allow microphone access to record audio.');
    return;
  }

  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  } catch {
    // ignore
  }

  // Avoid double-record.
  if (activeRecording) {
    try {
      await activeRecording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    activeRecording = null;
  }

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  activeRecording = recording;
}

export async function cancelAudioRecording(): Promise<void> {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // ignore
  }
}

export async function stopAudioRecordingAndAttachToActivity(activity: Activity): Promise<void> {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) return;

  try {
    await recording.stopAndUnloadAsync();
  } catch {
    return;
  }

  const uri = recording.getURI();
  if (!uri) return;

  // Best-effort size.
  let sizeBytes: number | null = null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    sizeBytes = info?.exists && 'size' in info && typeof info.size === 'number' ? info.size : null;
  } catch {
    sizeBytes = null;
  }

  const toast = useToastStore.getState().showToast;

  let serverAttachment: ActivityAttachment;
  let uploadSignedUrl: string;
  try {
    const init = await initUpload({
      activityId: activity.id,
      goalId: activity.goalId ?? null,
      kind: 'audio',
      fileName: `recording-${Date.now()}.m4a`,
      mimeType: 'audio/m4a',
      sizeBytes,
      durationSeconds: null,
    });
    serverAttachment = init.attachment;
    uploadSignedUrl = init.uploadSignedUrl;
  } catch (e: any) {
    toast({ message: e?.message ?? 'Unable to add recording', variant: 'danger' });
    return;
  }

  const nowIso = new Date().toISOString();
  useAppStore.getState().updateActivity(activity.id, (prev) => ({
    ...prev,
    attachments: [
      ...(prev.attachments ?? []),
      { ...serverAttachment, uploadStatus: 'uploading', updatedAt: nowIso },
    ],
    updatedAt: nowIso,
  }));

  try {
    await uploadFileToSignedUrl({ signedUrl: uploadSignedUrl, fileUri: uri, mimeType: 'audio/m4a' });
    const finishedIso = new Date().toISOString();
    useAppStore.getState().updateActivity(activity.id, (prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).map((a) =>
        a.id === serverAttachment.id ? { ...a, uploadStatus: 'uploaded', uploadError: null, updatedAt: finishedIso } : a,
      ),
      updatedAt: finishedIso,
    }));
    toast({ message: 'Recording added', variant: 'success', durationMs: 1800 });
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Upload failed';
    const failedIso = new Date().toISOString();
    useAppStore.getState().updateActivity(activity.id, (prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).map((a) =>
        a.id === serverAttachment.id ? { ...a, uploadStatus: 'failed', uploadError: msg, updatedAt: failedIso } : a,
      ),
      updatedAt: failedIso,
    }));
    toast({ message: msg, variant: 'danger' });
  }
}

export async function openAttachment(attachmentId: string): Promise<void> {
  const ent = useEntitlementsStore.getState();
  const canUseAttachments = Boolean(ent.isPro || ent.isProToolsTrial);
  if (!canUseAttachments) {
    openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
    return;
  }
  const base = getFunctionBaseUrl('attachments-get-download-url');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({ attachmentId }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to open attachment';
    throw new Error(msg);
  }

  const url = typeof data?.url === 'string' ? data.url : '';
  if (!url) throw new Error('Missing download URL');

  await Linking.openURL(url);
}

export async function deleteAttachment(params: { activityId: string; attachmentId: string }): Promise<void> {
  const ent = useEntitlementsStore.getState();
  const canUseAttachments = Boolean(ent.isPro || ent.isProToolsTrial);
  if (!canUseAttachments) {
    openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
    return;
  }
  const base = getFunctionBaseUrl('attachments-delete');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({ attachmentId: params.attachmentId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to delete attachment';
    throw new Error(msg);
  }

  const nowIso = new Date().toISOString();
  useAppStore.getState().updateActivity(params.activityId, (prev) => ({
    ...prev,
    attachments: (prev.attachments ?? []).filter((a) => a.id !== params.attachmentId),
    updatedAt: nowIso,
  }));
}

export async function setAttachmentSharedWithGoalMembers(params: {
  activityId: string;
  attachmentId: string;
  sharedWithGoalMembers: boolean;
}): Promise<void> {
  const ent = useEntitlementsStore.getState();
  const canUseAttachments = Boolean(ent.isPro || ent.isProToolsTrial);
  if (!canUseAttachments) {
    openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
    return;
  }
  const base = getFunctionBaseUrl('attachments-set-share');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({
      attachmentId: params.attachmentId,
      sharedWithGoalMembers: params.sharedWithGoalMembers,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to update share state';
    throw new Error(msg);
  }

  const next = Boolean(data?.sharedWithGoalMembers);
  const nowIso = new Date().toISOString();
  useAppStore.getState().updateActivity(params.activityId, (prev) => ({
    ...prev,
    attachments: (prev.attachments ?? []).map((a) => (a.id === params.attachmentId ? { ...a, sharedWithGoalMembers: next } : a)),
    updatedAt: nowIso,
  }));
}

export function hasAnyAttachments(activity: Activity | null | undefined): boolean {
  return Array.isArray(activity?.attachments) && activity!.attachments!.length > 0;
}

export function getAttachmentsBucket(): string {
  return BUCKET;
}



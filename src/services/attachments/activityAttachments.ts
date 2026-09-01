import { File as ExpoFile } from 'expo-file-system';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import type { Activity, ActivityAttachment, ActivityAttachmentKind } from '../../domain/types';
import { getAiProxyBaseUrl, getSupabasePublishableKey, getSupabaseUrl } from '../../utils/getEnv';
import { getImagePickerMediaTypesAll } from '../../utils/imagePickerMediaTypes';
import { getInstallId } from '../installId';
import { ensureSignedInWithPrompt, getAccessToken } from '../backend/auth';
import { useToastStore } from '../../store/useToastStore';
import { useAppStore } from '../../store/useAppStore';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from '../edgeFunctions';
import { createPreparedAudioRecorder } from '../audioRecorder';
import { uploadFileToSignedUrl } from '../files/uploadFileToSignedUrl';

const BUCKET = 'activity_attachments';

function logAttachmentsDebug(message: string, extra?: Record<string, unknown>) {
  // Keep logs dev-focused; the toast message will still surface the key debug fields.
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.warn(`[attachments] ${message}`, extra ?? {});
}

async function buildEdgeHeaders(requireAuth: boolean): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (!supabaseKey) {
    // Without an anon/publishable key, Supabase Edge Functions may reject requests
    // (often with a non-JSON body), which can surface as confusing generic errors.
    throw new Error(
      'Missing Supabase publishable key (set extra.supabasePublishableKey / SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
    );
  }
  headers.set('apikey', supabaseKey);

  try {
    const installId = await getInstallId();
    headers.set('x-kwilt-install-id', installId);
  } catch {
    // best-effort
  }

  if (requireAuth) {
    const token = (await getAccessToken())?.trim();
    if (!token) {
      throw new Error('Missing access token (not signed in)');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function readJsonOrText(res: Response): Promise<{ json: any | null; text: string }> {
  const text = await res.text().catch(() => '');
  if (!text) return { json: null, text: '' };
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

function pickErrorMessage(params: { fallback: string; status: number; json: any | null; text: string }): string {
  const msg = typeof params.json?.error?.message === 'string' ? params.json.error.message : '';
  const details =
    typeof params.json?.error?.details === 'string'
      ? params.json.error.details
      : typeof params.json?.error?.detail === 'string'
        ? params.json.error.detail
        : '';

  if (msg.trim()) return msg.trim();
  if (details.trim()) return details.trim();
  if (params.text.trim()) return `${params.fallback} (status ${params.status}): ${params.text.trim().slice(0, 280)}`;
  return `${params.fallback} (status ${params.status})`;
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
  const candidates = getEdgeFunctionUrlCandidates('attachments-init-upload');
  const base = candidates[0] ?? getEdgeFunctionUrl('attachments-init-upload');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const payload = JSON.stringify({
    activityId: params.activityId,
    goalId: params.goalId,
    kind: params.kind,
    fileName: params.fileName,
    mimeType: params.mimeType ?? null,
    sizeBytes: params.sizeBytes ?? null,
    durationSeconds: params.durationSeconds ?? null,
    sharedWithGoalMembers: false,
  });

  let lastError: Error | null = null;
  for (const url of candidates.length > 0 ? candidates : [base]) {
    const res = await fetch(url, {
      method: 'POST',
      headers: await buildEdgeHeaders(true),
      body: payload,
    });

    const { json: data, text } = await readJsonOrText(res);
    if (res.ok) {
      const attachment = parseAttachmentRow(data?.attachment);
      const signedUrl = typeof data?.upload?.signedUrl === 'string' ? data.upload.signedUrl : '';
      if (!attachment || !signedUrl) {
        throw new Error('Invalid upload response');
      }
      return { attachment, uploadSignedUrl: signedUrl };
    }

    logAttachmentsDebug('initUpload failed', {
      url,
      status: res.status,
      supabaseUrl: getSupabaseUrl() ?? null,
      aiProxyBaseUrl: getAiProxyBaseUrl() ?? null,
      bodyPreview: text ? text.slice(0, 500) : '',
    });

    const msg = pickErrorMessage({
      fallback: 'Unable to init upload',
      status: res.status,
      json: data,
      text,
    });

    // If the function simply doesn't exist on this host/project, try the next candidate.
    const code = typeof data?.code === 'string' ? data.code : typeof data?.error?.code === 'string' ? data.error.code : '';
    const isNotFound = res.status === 404 && (code === 'NOT_FOUND' || /not found/i.test(msg));
    if (isNotFound) {
      lastError = new Error(`${msg}\nfnUrl=${url}`);
      continue;
    }

    throw new Error(`${msg}\nfnUrl=${url}`);
  }

  // If we exhausted candidates, surface the most actionable info (all attempted URLs).
  const attempted = (candidates.length > 0 ? candidates : [base]).join(', ');
  throw new Error(
    `${lastError?.message ?? 'Unable to init upload (function not found)'}\ntried=${attempted}`,
  );

  // unreachable
}

export async function addPhotoOrVideoToActivity(activity: Activity): Promise<void> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to add attachments.');
      return;
    }

    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: getImagePickerMediaTypesAll(),
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
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Photo picker failed';
    useToastStore.getState().showToast({
      message: `Photo picker failed: ${msg}`,
      variant: 'danger',
      durationMs: 3500,
      behaviorDuringSuppression: 'show',
    });
    logAttachmentsDebug('addPhotoOrVideoToActivity crashed', { message: msg });
  }
}

export async function addDocumentToActivity(activity: Activity): Promise<void> {
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

let activeRecording: AudioRecorder | null = null;

export function audioRecordingDurationSeconds(durationMillis: unknown): number | null {
  if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis) || durationMillis < 0) {
    return null;
  }
  if (durationMillis === 0) return 0;
  return Math.max(1, Math.round(durationMillis / 1000));
}

export async function startAudioRecording(): Promise<void> {
  const permission = await requestRecordingPermissionsAsync().catch(() => null);
  if (!permission?.granted) {
    Alert.alert('Permission required', 'Please allow microphone access to record audio.');
    return;
  }

  try {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  } catch {
    // ignore
  }

  // Avoid double-record.
  if (activeRecording) {
    try {
      await activeRecording.stop();
    } catch {
      // ignore
    }
    activeRecording.release();
    activeRecording = null;
  }

  const recording = await createPreparedAudioRecorder(RecordingPresets.HIGH_QUALITY);
  try {
    recording.record();
    activeRecording = recording;
  } catch (error) {
    await recording.stop().catch(() => undefined);
    recording.release();
    throw error;
  }
}

export async function cancelAudioRecording(): Promise<void> {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) return;
  try {
    await recording.stop();
  } catch {
    // ignore
  } finally {
    recording.release();
  }
}

export async function stopAudioRecordingAndAttachToActivity(activity: Activity): Promise<void> {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) return;

  let uri: string | null = null;
  let durationSeconds: number | null = null;
  try {
    await recording.stop();
    durationSeconds = audioRecordingDurationSeconds(recording.getStatus().durationMillis);
    uri = recording.uri;
  } catch {
    return;
  } finally {
    recording.release();
  }

  if (!uri) return;

  // Best-effort size.
  let sizeBytes: number | null = null;
  try {
    const file = new ExpoFile(uri);
    sizeBytes = file.exists && Number.isFinite(file.size) ? file.size : null;
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
      durationSeconds,
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
  const base = getEdgeFunctionUrl('attachments-get-download-url');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({ attachmentId }),
  });

  const { json: data, text } = await readJsonOrText(res);
  if (!res.ok) {
    throw new Error(
      pickErrorMessage({
        fallback: 'Unable to open attachment',
        status: res.status,
        json: data,
        text,
      }),
    );
  }

  const url = typeof data?.url === 'string' ? data.url : '';
  if (!url) throw new Error('Missing download URL');

  await Linking.openURL(url);
}

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<string> {
  const base = getEdgeFunctionUrl('attachments-get-download-url');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({ attachmentId }),
  });

  const { json: data, text } = await readJsonOrText(res);
  if (!res.ok) {
    throw new Error(
      pickErrorMessage({
        fallback: 'Unable to load attachment',
        status: res.status,
        json: data,
        text,
      }),
    );
  }

  const url = typeof data?.url === 'string' ? data.url : '';
  if (!url) throw new Error('Missing download URL');
  return url;
}

export async function deleteAttachment(params: { activityId: string; attachmentId: string }): Promise<void> {
  const base = getEdgeFunctionUrl('attachments-delete');
  if (!base) throw new Error('Attachments service not configured');

  await ensureSignedIn();

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(true),
    body: JSON.stringify({ attachmentId: params.attachmentId }),
  });
  const { json: data, text } = await readJsonOrText(res);
  if (!res.ok) {
    throw new Error(
      pickErrorMessage({
        fallback: 'Unable to delete attachment',
        status: res.status,
        json: data,
        text,
      }),
    );
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
  const base = getEdgeFunctionUrl('attachments-set-share');
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
  const { json: data, text } = await readJsonOrText(res);
  if (!res.ok) {
    throw new Error(
      pickErrorMessage({
        fallback: 'Unable to update share state',
        status: res.status,
        json: data,
        text,
      }),
    );
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

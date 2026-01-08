import * as ImagePicker from 'expo-image-picker';

type MediaTypesParam = any;

/**
 * `expo-image-picker` has changed its `mediaTypes` API over time.
 *
 * - Newer: `mediaTypes: ImagePicker.MediaType[]`
 * - Older (still common in SDK 54): `mediaTypes: ImagePicker.MediaTypeOptions`
 *
 * Some builds may show types for `ImagePicker.MediaType` but not have it at runtime.
 * Use this helper to avoid runtime crashes like "Cannot read property 'Images' of undefined".
 */
export function getImagePickerMediaTypesImages(): MediaTypesParam {
  const anyPicker = ImagePicker as any;
  if (anyPicker?.MediaType?.Images) {
    return [anyPicker.MediaType.Images];
  }
  return anyPicker?.MediaTypeOptions?.Images ?? ImagePicker.MediaTypeOptions.Images;
}

export function getImagePickerMediaTypesAll(): MediaTypesParam {
  const anyPicker = ImagePicker as any;
  if (anyPicker?.MediaType?.Images && anyPicker?.MediaType?.Videos) {
    return [anyPicker.MediaType.Images, anyPicker.MediaType.Videos];
  }
  return anyPicker?.MediaTypeOptions?.All ?? ImagePicker.MediaTypeOptions.All;
}



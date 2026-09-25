import { File, UploadType } from 'expo-file-system';

type ProfilePhotoUploadParams = {
  assetUri: string;
  email: string;
  mimeType?: string | null;
  uploadUrl: string;
};

type ProfilePhotoUploadResponse = {
  detail?: string;
  url?: string;
};

const parseResponseBody = (body: string): ProfilePhotoUploadResponse => {
  if (!body) return {};

  try {
    return JSON.parse(body) as ProfilePhotoUploadResponse;
  } catch {
    return {};
  }
};

export async function uploadProfilePhoto({
  assetUri,
  email,
  mimeType,
  uploadUrl,
}: ProfilePhotoUploadParams): Promise<string> {
  const file = new File(assetUri);
  const result = await file.upload(uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: mimeType || file.type || 'image/jpeg',
    parameters: {
      email,
      kind: 'selfie',
    },
  });
  const payload = parseResponseBody(result.body);

  if (result.status < 200 || result.status >= 300) {
    throw new Error(payload.detail || 'The profile photo could not be uploaded. Please try again.');
  }

  if (!payload.url) {
    throw new Error('The uploaded photo could not be saved. Please try again.');
  }

  return payload.url;
}

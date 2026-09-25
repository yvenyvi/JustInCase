const mockUpload = jest.fn();
const mockFileConstructor = jest.fn();

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    type = 'image/jpeg';
    upload = mockUpload;

    constructor(uri: string) {
      mockFileConstructor(uri);
    }
  },
  UploadType: { MULTIPART: 1 },
}));

import { uploadProfilePhoto } from '../src/shared/profilePhotoUpload';

describe('uploadProfilePhoto', () => {
  beforeEach(() => {
    mockFileConstructor.mockClear();
    mockUpload.mockReset();
  });

  it('uploads a local image as a native multipart file', async () => {
    mockUpload.mockResolvedValue({
      body: JSON.stringify({ url: 'https://example.com/avatar.jpg' }),
      headers: {},
      status: 200,
    });

    await expect(uploadProfilePhoto({
      assetUri: 'file:///photos/avatar.jpg',
      email: 'citizen@example.com',
      mimeType: 'image/jpeg',
      uploadUrl: 'http://localhost/upload-proof',
    })).resolves.toBe('https://example.com/avatar.jpg');

    expect(mockFileConstructor).toHaveBeenCalledWith('file:///photos/avatar.jpg');
    expect(mockUpload).toHaveBeenCalledWith('http://localhost/upload-proof', {
      fieldName: 'file',
      httpMethod: 'POST',
      mimeType: 'image/jpeg',
      parameters: {
        email: 'citizen@example.com',
        kind: 'selfie',
      },
      uploadType: 1,
    });
  });

  it('uses the server error message for a failed upload', async () => {
    mockUpload.mockResolvedValue({
      body: JSON.stringify({ detail: 'Only image files are allowed.' }),
      headers: {},
      status: 400,
    });

    await expect(uploadProfilePhoto({
      assetUri: 'file:///photos/avatar.txt',
      email: 'citizen@example.com',
      uploadUrl: 'http://localhost/upload-proof',
    })).rejects.toThrow('Only image files are allowed.');
  });

  it('rejects a successful response that has no uploaded URL', async () => {
    mockUpload.mockResolvedValue({ body: '{}', headers: {}, status: 200 });

    await expect(uploadProfilePhoto({
      assetUri: 'file:///photos/avatar.jpg',
      email: 'citizen@example.com',
      uploadUrl: 'http://localhost/upload-proof',
    })).rejects.toThrow('The uploaded photo could not be saved. Please try again.');
  });
});

import * as FileSystem from 'expo-file-system';
import { persistImageUri } from './persistImageUri';

jest.mock('expo-file-system', () => {
  const createDirectory = jest.fn();
  const copyFile = jest.fn();
  const join = (parts: unknown[]) => parts
    .map((part) => typeof part === 'string' ? part : (part as { uri: string }).uri)
    .reduce((path, part) => path ? `${path.replace(/\/$/, '')}/${part.replace(/^\//, '')}` : part, '');

  class MockDirectory {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = `${join(parts).replace(/\/$/, '')}/`; }
    create(options: unknown) { createDirectory(this.uri, options); }
  }

  class MockFile {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(parts); }
    copy(destination: MockFile) { copyFile(this.uri, destination.uri); }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: { uri: 'file:///documents' } },
    __createDirectory: createDirectory,
    __copyFile: copyFile,
  };
});

type FileSystemMock = typeof FileSystem & {
  __createDirectory: jest.Mock;
  __copyFile: jest.Mock;
};
const fileSystemMock = FileSystem as FileSystemMock;

describe('persistImageUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1234);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('copies a transient image into app-owned document storage', async () => {
    await expect(persistImageUri({
      uri: 'file:///tmp/photo.heic?edited=1',
      subdir: '/hero-images/',
      namePrefix: 'goal-42',
    })).resolves.toBe('file:///documents/hero-images/goal-42-1234.heic');

    expect(fileSystemMock.__createDirectory).toHaveBeenCalledWith(
      'file:///documents/hero-images/',
      { intermediates: true, idempotent: true },
    );
    expect(fileSystemMock.__copyFile).toHaveBeenCalledWith(
      'file:///tmp/photo.heic?edited=1',
      'file:///documents/hero-images/goal-42-1234.heic',
    );
  });

  it('preserves the original URI when copying is unsupported', async () => {
    fileSystemMock.__copyFile.mockImplementationOnce(() => { throw new Error('unsupported URI'); });
    await expect(persistImageUri({
      uri: 'ph://asset-id',
      subdir: 'hero-images',
      namePrefix: 'arc-7',
    })).resolves.toBe('ph://asset-id');
  });
});

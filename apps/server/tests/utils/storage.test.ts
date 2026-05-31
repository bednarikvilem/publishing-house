import { test, expect, describe, beforeEach, mock } from "bun:test";

// Set env vars before importing the module under test (they're read at module load)
process.env.MINIO_ENDPOINT = "http://minio:9000";
process.env.MINIO_BUCKET = "test-bucket";
process.env.PUBLIC_IMAGES_BASE_URL = "http://localhost:9000";
process.env.MINIO_ROOT_USER = "test-user";
process.env.MINIO_ROOT_PASSWORD = "test-pass";

const sendSpy = mock(async () => ({}));

class FakePutObjectCommand {
  constructor(public input: unknown) {}
}
class FakeDeleteObjectCommand {
  constructor(public input: unknown) {}
}

mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = sendSpy;
  },
  PutObjectCommand: FakePutObjectCommand,
  DeleteObjectCommand: FakeDeleteObjectCommand,
}));

const sharpResultBuffer = Buffer.from("resized-bytes");
mock.module("sharp", () => ({
  default: () => ({
    resize: () => ({
      webp: () => ({
        toBuffer: async () => sharpResultBuffer,
      }),
    }),
  }),
}));

const { uploadImage, deleteImage, isManagedUrl } = await import("../../src/utils/storage");

describe("storage", () => {
  beforeEach(() => {
    sendSpy.mockClear();
  });

  test("uploadImage rejects unsupported mime types", async () => {
    await expect(
      uploadImage(Buffer.from("x"), "image/gif", "articles"),
    ).rejects.toThrow(/Unsupported image type/);
  });

  test("uploadImage uploads to the correct bucket with a folder/uuid.webp key", async () => {
    await uploadImage(Buffer.from("x"), "image/jpeg", "articles");

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const command = sendSpy.mock.calls[0]![0] as FakePutObjectCommand;
    expect(command).toBeInstanceOf(FakePutObjectCommand);
    const input = command.input as { Bucket: string; Key: string; ContentType: string };
    expect(input.Bucket).toBe("test-bucket");
    expect(input.Key).toMatch(/^articles\/[0-9a-f-]{36}\.webp$/);
    expect(input.ContentType).toBe("image/webp");
  });

  test("uploadImage returns the public URL", async () => {
    const url = await uploadImage(Buffer.from("x"), "image/png", "profiles");
    expect(url).toMatch(/^http:\/\/localhost:9000\/test-bucket\/profiles\/[0-9a-f-]{36}\.webp$/);
  });

  test("isManagedUrl distinguishes MinIO URLs from other sources", () => {
    expect(isManagedUrl("http://localhost:9000/test-bucket/articles/abc.webp")).toBe(true);
    expect(isManagedUrl("https://res.cloudinary.com/x/image/upload/v1/articles/abc.jpg")).toBe(false);
    expect(isManagedUrl("https://example.com/some-image.png")).toBe(false);
  });

  test("deleteImage calls DeleteObjectCommand only for managed URLs", async () => {
    await deleteImage("https://res.cloudinary.com/x/image/upload/v1/articles/abc.jpg");
    expect(sendSpy).not.toHaveBeenCalled();

    await deleteImage("http://localhost:9000/test-bucket/articles/abc.webp");
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const command = sendSpy.mock.calls[0]![0] as FakeDeleteObjectCommand;
    expect(command).toBeInstanceOf(FakeDeleteObjectCommand);
    const input = command.input as { Bucket: string; Key: string };
    expect(input.Bucket).toBe("test-bucket");
    expect(input.Key).toBe("articles/abc.webp");
  });
});

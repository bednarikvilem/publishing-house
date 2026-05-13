# MinIO Image Storage

**Date:** 2026-05-06
**Status:** Approved

## Overview

Replace Cloudinary as the destination for new image uploads with a self-hosted MinIO container. The DB schema is unchanged — the existing `url` columns continue to store full URLs, which lets MinIO-managed images, legacy Cloudinary images, and externally-supplied URLs coexist transparently.

## Scope & Migration Stance

- **All new uploads** (article cover images, profile pictures) go to MinIO.
- **Existing Cloudinary URLs** in the DB are left untouched. Cloudinary continues to serve them. No migration script.
- The `cloudinary` SDK and config are removed from the codebase. The `CLOUDINARY_*` env vars stay in `.env` and the legacy URLs continue to load over HTTPS without authentication.

## Infrastructure

### `docker-compose.yml`

Add two services:

```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  ports: ["9000:9000", "9001:9001"]
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  volumes: [minio_data:/data]
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 5s
    timeout: 3s
    retries: 5

minio-init:
  image: minio/mc
  depends_on:
    minio:
      condition: service_healthy
  entrypoint: >
    sh -c "
      mc alias set local http://minio:9000 $$MINIO_ROOT_USER $$MINIO_ROOT_PASSWORD &&
      mc mb -p local/${MINIO_BUCKET} &&
      mc anonymous set download local/${MINIO_BUCKET}
    "
```

The `minio-init` sidecar creates the bucket and sets it to public-read on first boot, so `<img src>` works without auth or presigned URLs.

Add `minio_data:` to the top-level `volumes:` block.

### Environment Variables

Add to `.env`:

```
MINIO_ROOT_USER=...
MINIO_ROOT_PASSWORD=...
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET=pb138-images
PUBLIC_IMAGES_BASE_URL=http://localhost:9000
```

`MINIO_ENDPOINT` is the internal Docker network address used by the server when uploading. `PUBLIC_IMAGES_BASE_URL` is the host-exposed address baked into the stored URL so browsers can fetch the image. They differ because dockerized server cannot reach `localhost` from inside its container.

## Storage Wrapper

New file `apps/server/src/utils/storage.ts` exposes:

```ts
uploadImage(buffer: Buffer, mimeType: string, folder: "articles" | "profiles"): Promise<string>
deleteImage(url: string): Promise<void>
isManagedUrl(url: string): boolean
```

### `uploadImage`

1. Validates `mimeType` is one of `image/jpeg`, `image/png`, `image/webp`.
2. Resizes via `sharp`:
   - `articles`: `1200x800`, `cover`, output WebP.
   - `profiles`: `512x512`, `cover`, output WebP.
3. Generates a key: `<folder>/<uuid>.webp`.
4. Uploads via `@aws-sdk/client-s3`'s `PutObjectCommand` to `MINIO_ENDPOINT` / `MINIO_BUCKET`.
5. Returns `${PUBLIC_IMAGES_BASE_URL}/${MINIO_BUCKET}/${key}`.

### `isManagedUrl(url)`

Returns `true` only when the URL starts with `${PUBLIC_IMAGES_BASE_URL}/${MINIO_BUCKET}/`. This is the discriminator that lets MinIO-managed images, legacy Cloudinary URLs, and externally-supplied URLs coexist.

### `deleteImage(url)`

If `isManagedUrl(url)` is `true`, derive the key by stripping the prefix and call `DeleteObjectCommand`. Otherwise, no-op — the URL points at Cloudinary or an external host that we don't own.

## Call Site Changes

Three replacements:

**`apps/server/src/routes/articles.ts` (article cover upload, ~line 684)** — replace the dataUri + `cloudinary.uploader.upload(...)` block with:

```ts
const buffer = Buffer.from(arrayBuffer);
imageUrl = await uploadImage(buffer, blob.type, "articles");
```

**`apps/server/src/routes/articles.ts` (article image delete, ~line 765-768)** — replace the regex + `cloudinary.uploader.destroy(...)` block with:

```ts
await deleteImage(image.url).catch(() => {});
```

The `isManagedUrl` check inside `deleteImage` ensures legacy Cloudinary URLs are not touched.

**`apps/server/src/routes/users.ts` (profile picture upload, ~line 151)** — same shape as the article upload, folder `"profiles"`.

## Cleanup

- Remove `import { v2 as cloudinary } from "cloudinary"` from `routes/articles.ts` and `routes/users.ts`.
- Remove any `cloudinary.config({...})` call (likely at server bootstrap).
- Remove `cloudinary` from `apps/server/package.json` dependencies.
- Leave `CLOUDINARY_*` env vars in `.env` so legacy DB URLs continue to load.

## Dependencies

Add to `apps/server/package.json`:

- `@aws-sdk/client-s3` (S3-compatible upload/delete)
- `sharp` (image resize)

## Testing

### Unit Tests

`apps/server/tests/utils/storage.test.ts`:

1. `uploadImage` rejects unsupported mime types.
2. `uploadImage` calls `PutObjectCommand` with the correct bucket and a key matching `<folder>/<uuid>.webp`.
3. `uploadImage` returns a URL of the form `${PUBLIC_IMAGES_BASE_URL}/${BUCKET}/<folder>/<uuid>.webp`.
4. `isManagedUrl` returns `true` for MinIO URLs and `false` for Cloudinary / external URLs.
5. `deleteImage` calls `DeleteObjectCommand` for managed URLs only; no-ops for unmanaged URLs.

Mock `@aws-sdk/client-s3` and `sharp` with `mock.module()`.

### Manual Smoke Test

1. `docker compose up`.
2. Log in as Emma, upload an article cover image — verify it renders and the DB `url` starts with the MinIO base.
3. Upload a profile picture — verify the same.
4. Delete an uploaded article image — verify the DB row is gone and the object is no longer in MinIO (`mc ls local/pb138-images/articles`).
5. Verify a pre-existing Cloudinary article image still renders.

### E2E

Existing Playwright author tests (`create-article`, `edit-article`) exercise the upload path indirectly. No new E2E tests are required for this change.

## Out of Scope

- Migration of existing Cloudinary images to MinIO.
- Multiple image variants (thumb / medium / full). Single canonical size per image type.
- Production deployment concerns (TLS, reverse proxy, MinIO clustering, backup).
- Image format conversion beyond WebP output.
- Direct browser → MinIO uploads (presigned PUT URLs). All uploads go through the server.

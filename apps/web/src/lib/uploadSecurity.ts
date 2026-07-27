import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const MIME_EXTENSIONS = new Map<string, readonly string[]>([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

export const UPLOAD_LIMITS = Object.freeze({
  productImageBytes: 8 * 1024 * 1024,
  avatarBytes: 5 * 1024 * 1024,
  verificationImageBytes: 8 * 1024 * 1024,
});

export class InvalidUploadError extends Error {}

function hasExpectedMagic(buffer: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") {
    const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return buffer.length >= magic.length && magic.every((byte, index) => buffer[index] === byte);
  }
  if (mime === "image/webp") {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

export function requireMultipart(req: Request): void {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data;")) {
    throw new InvalidUploadError("Expected multipart/form-data");
  }
}

export async function validateImage(file: File, maxBytes: number): Promise<{ buffer: Buffer; extension: string }> {
  if (file.size <= 0) throw new InvalidUploadError("Image file is empty");
  if (file.size > maxBytes) throw new InvalidUploadError(`Image exceeds the ${maxBytes}-byte limit`);
  const mime = file.type.toLowerCase();
  const allowedExtensions = MIME_EXTENSIONS.get(mime);
  if (!allowedExtensions) throw new InvalidUploadError("Only JPEG, PNG, and WebP images are allowed");
  const suppliedExtension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.includes(suppliedExtension)) {
    throw new InvalidUploadError("Image extension does not match its MIME type");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength !== file.size || !hasExpectedMagic(buffer, mime)) {
    throw new InvalidUploadError("Image content does not match its declared type");
  }
  return { buffer, extension: allowedExtensions[0]! };
}

export async function writeImage(
  file: File,
  directory: string,
  prefix: string,
  maxBytes: number,
): Promise<{ filename: string; bytes: number }> {
  const { buffer, extension } = await validateImage(file, maxBytes);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${prefix}_${randomUUID()}${extension}`;
  const destination = path.resolve(directory, filename);
  const root = path.resolve(directory);
  if (path.dirname(destination) !== root) throw new InvalidUploadError("Unsafe upload destination");
  await fs.writeFile(destination, buffer, { flag: "wx", mode: 0o600 });
  return { filename, bytes: buffer.byteLength };
}

function configuredPublicOrigin(): string | null {
  const configured = process.env.HOST_BASE_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

function storedValues(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // A legacy record may store a single path instead of a JSON array.
  }
  return [value];
}

export function resolveStoredPublicFile(
  storedValue: string,
  allowedPrefixes: readonly string[],
): string | null {
  let pathname = storedValue.trim();
  if (!pathname) return null;
  try {
    if (/^https?:\/\//i.test(pathname)) {
      const url = new URL(pathname);
      const publicOrigin = configuredPublicOrigin();
      if (!publicOrigin || url.origin !== publicOrigin) return null;
      pathname = url.pathname;
    }
    pathname = decodeURIComponent(pathname).replaceAll("\\", "/");
  } catch {
    return null;
  }
  const relative = pathname.replace(/^\/+/, "");
  const segments = relative.split("/");
  if (!relative || segments.some((segment) => segment === ".." || segment === "." || segment.includes("\0"))) return null;
  if (!allowedPrefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) return null;
  const publicRoot = path.resolve(process.cwd(), "public");
  const destination = path.resolve(publicRoot, relative);
  if (!destination.startsWith(`${publicRoot}${path.sep}`)) return null;
  return destination;
}

export async function deleteStoredPublicFiles(
  storedValue: string | null | undefined,
  allowedPrefixes: readonly string[],
): Promise<void> {
  if (!storedValue) return;
  const paths = new Set(storedValues(storedValue)
    .map((value) => resolveStoredPublicFile(value, allowedPrefixes))
    .filter((value): value is string => Boolean(value)));
  await Promise.all([...paths].map((filePath) => fs.unlink(filePath).catch(() => undefined)));
}

export function resolveStoredPrivateFile(
  storedValue: string,
  allowedPrefixes: readonly string[],
): string | null {
  let relative = storedValue.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (!relative || /^https?:\/\//i.test(relative)) return null;
  try {
    relative = decodeURIComponent(relative);
  } catch {
    return null;
  }
  const segments = relative.split("/");
  if (segments.some((segment) => segment === ".." || segment === "." || segment.includes("\0"))) return null;
  if (!allowedPrefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) return null;
  const configuredRoot = process.env.PRIVATE_UPLOAD_ROOT?.trim();
  const privateRoot = path.resolve(configuredRoot || path.join(process.cwd(), ".data"));
  const destination = path.resolve(privateRoot, relative);
  if (!destination.startsWith(`${privateRoot}${path.sep}`)) return null;
  return destination;
}

export async function deleteStoredPrivateFiles(
  storedValue: string | null | undefined,
  allowedPrefixes: readonly string[],
): Promise<void> {
  if (!storedValue) return;
  const paths = new Set(storedValues(storedValue)
    .map((value) => resolveStoredPrivateFile(value, allowedPrefixes))
    .filter((value): value is string => Boolean(value)));
  await Promise.all([...paths].map((filePath) => fs.unlink(filePath).catch(() => undefined)));
}

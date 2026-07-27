import type { Prisma } from "@prisma/client";

export class InvalidProductInputError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidProductInputError("Invalid request body");
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, maxLength: number, required = false): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw new InvalidProductInputError(`${name} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw new InvalidProductInputError(`${name} must be a string`);
  const normalized = value.trim();
  if (!normalized && required) throw new InvalidProductInputError(`${name} is required`);
  if (normalized.length > maxLength) throw new InvalidProductInputError(`${name} is too long`);
  return normalized || undefined;
}

function jsonRange(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new InvalidProductInputError("range must be valid JSON");
    }
  }
  if (!Array.isArray(parsed) || parsed.length > 100 || parsed.some((item) => typeof item !== "string" || item.length > 100)) {
    throw new InvalidProductInputError("range must be an array of at most 100 short strings");
  }
  return parsed as Prisma.InputJsonArray;
}

export interface ProductCreateInput {
  claimedUserId?: number;
  name: string;
  description?: string;
  images: string;
  category: string;
  contact: string;
  isbn?: string;
  price: number;
  position?: string;
  way?: string;
  range?: Prisma.InputJsonValue;
}

export function parseProductCreateInput(value: unknown): ProductCreateInput {
  const body = record(value);
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || price > 100_000_000) {
    throw new InvalidProductInputError("price must be a finite non-negative number");
  }
  const claimedUserId = body.userId === undefined ? undefined : Number(body.userId);
  if (claimedUserId !== undefined && (!Number.isSafeInteger(claimedUserId) || claimedUserId <= 0)) {
    throw new InvalidProductInputError("Invalid userId");
  }
  return {
    claimedUserId,
    name: text(body.name, "name", 200, true)!,
    description: text(body.description, "description", 5_000),
    images: text(body.images, "images", 20_000, true)!,
    category: text(body.category, "category", 100, true)!,
    contact: text(body.contact, "contact", 200, true)!,
    isbn: text(body.isbn, "isbn", 32),
    price,
    position: text(body.position, "position", 100),
    way: text(body.way, "way", 50),
    range: jsonRange(body.range),
  };
}

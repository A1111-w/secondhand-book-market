export function withoutPassword<T extends object>(record: T): Omit<T, "password"> {
  const copy = { ...record } as Record<string, unknown>;
  delete copy.password;
  return copy as Omit<T, "password">;
}

export function withoutContact<T extends object>(record: T): Omit<T, "contact"> {
  const copy = { ...record } as Record<string, unknown>;
  delete copy.contact;
  return copy as Omit<T, "contact">;
}

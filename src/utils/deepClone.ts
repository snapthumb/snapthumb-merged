// src/utils/deepClone.ts
export function deepClone<T>(obj: T): T {
  // Prefer native structuredClone when available
  try {
    // @ts-ignore – not always in TS lib
    if (typeof structuredClone === "function") return structuredClone(obj);
  } catch {}
  // Safe JSON fallback for plain data
  return JSON.parse(JSON.stringify(obj));
}

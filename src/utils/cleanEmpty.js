export function cleanEmpty(obj) {
  // Preserve Date objects and other built-in types
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Error) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.filter((v) => v !== "" && v != null).map(cleanEmpty);
  } else if (obj && typeof obj === "object") {
    // Check if it's a plain object (not Date, RegExp, etc.)
    if (Object.prototype.toString.call(obj) === "[object Object]") {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== "" && v != null)
          .map(([k, v]) => [k, cleanEmpty(v)])
      );
    }
    // For other object types (like Date), return as is
    return obj;
  }
  return obj;
}

export const normalizeText = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .trim();

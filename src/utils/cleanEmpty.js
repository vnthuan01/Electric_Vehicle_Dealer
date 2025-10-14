export function cleanEmpty(obj) {
  if (Array.isArray(obj)) {
    return obj.filter((v) => v !== "" && v != null).map(cleanEmpty);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== "" && v != null)
        .map(([k, v]) => [k, cleanEmpty(v)])
    );
  }
  return obj;
}

export const normalizeText = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .trim();

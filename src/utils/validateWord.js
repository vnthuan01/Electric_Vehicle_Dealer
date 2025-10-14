export function capitalizeVietnamese(str) {
  if (!str) return "";
  return str
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const firstChar = word.charAt(0);
      const upperFirst = firstChar === "đ" ? "Đ" : firstChar.toUpperCase();
      return upperFirst + word.slice(1).toLowerCase();
    })
    .join(" ");
}

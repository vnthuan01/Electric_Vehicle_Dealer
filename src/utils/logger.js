import morgan from "morgan";

export const httpLogger = morgan("dev");

export function logInfo(...args) {
  console.log(...args);
}
export function logError(...args) {
  console.error(...args);
}

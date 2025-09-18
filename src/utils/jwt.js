import jwt from "jsonwebtoken";

const jwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

export function signToken(payload, expiresIn = "30m") {
  return jwt.sign(payload, jwtSecret(), {expiresIn});
}

export function signRefreshToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, jwtSecret(), {expiresIn});
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret());
}

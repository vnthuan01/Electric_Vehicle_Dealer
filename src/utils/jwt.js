import jwt from "jsonwebtoken";

const getSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

// Tạo Access Token
export function signToken(payload, expiresIn = "2h") {
  return jwt.sign(payload, getSecret(), {expiresIn, algorithm: "HS256"});
}

// Tạo Refresh Token
export function signRefreshToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, getSecret(), {expiresIn, algorithm: "HS256"});
}

// Verify token
export function verifyToken(token) {
  return jwt.verify(token, getSecret(), {algorithms: ["HS256"]});
}

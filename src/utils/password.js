import bcrypt from "bcrypt";

export async function hashPassword(plain) {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}

export async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

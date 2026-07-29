import bcrypt from "bcryptjs";

// Password hashing with bcrypt (cost factor 10). Kept in its own module so the choice of
// algorithm is easy to audit and change.

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

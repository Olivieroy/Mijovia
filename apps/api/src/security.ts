import { randomBytes, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
const scrypt = (
  password: string,
  salt: string,
  length: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    rawScrypt(
      password,
      salt,
      length,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
export const token = () => randomBytes(32).toString("hex");
export async function hashPassword(password: string) {
  const salt = token();
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function checkPassword(password: string, hash: string) {
  const [, salt, key] = hash.split(":");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function canRemove(remaining: number) {
  return remaining > 0;
}

export function validMutation(
  expectedOrigin: string,
  requestOrigin: unknown,
  expectedCsrf: string,
  requestCsrf: unknown,
) {
  return (
    requestOrigin === expectedOrigin &&
    typeof requestCsrf === "string" &&
    requestCsrf === expectedCsrf
  );
}

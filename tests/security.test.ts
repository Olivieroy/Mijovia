import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  checkPassword,
  canRemove,
  token,
} from "../apps/api/src/security.js";
test("hachage salé et vérification du mot de passe", async () => {
  const password = "Une phrase de passe sûre";
  const first = await hashPassword(password);
  assert.notEqual(first, await hashPassword(password));
  assert.equal(await checkPassword(password, first), true);
  assert.equal(await checkPassword("autre mot de passe", first), false);
});
test("la dernière méthode ne peut pas être retirée", () => {
  assert.equal(canRemove(0), false);
  assert.equal(canRemove(-1), false);
  assert.equal(canRemove(1), true);
});
test("jetons aléatoires de 256 bits", () => {
  assert.match(token(), /^[a-f0-9]{64}$/);
  assert.notEqual(token(), token());
});

test("CSRF : origine exacte et jeton tous deux obligatoires", async () => {
  const { validMutation } = await import("../apps/api/src/security.js");
  const origin = "https://mijovia.example";
  assert.equal(validMutation(origin, origin, "secret", "secret"), true);
  assert.equal(
    validMutation(origin, "https://evil.example", "secret", "secret"),
    false,
  );
  assert.equal(validMutation(origin, origin, "secret", undefined), false);
  assert.equal(validMutation(origin, origin, "secret", "autre"), false);
  assert.equal(validMutation(origin, undefined, "secret", "secret"), false);
});

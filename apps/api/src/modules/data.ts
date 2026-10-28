import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  type Kind,
  type RecordData,
  kinds,
  privateKinds,
  parseRecord,
  references,
} from "@mijovia/shared";
import { db, query, sql } from "../db.js";
export const fail = (message = "Opération refusée", status = 400) =>
  Object.assign(new Error(message), { status });
export function json(value: any) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
export async function membership(
  userId: string,
  householdId: string,
  tx: any = db,
) {
  const [rows]: any = await tx.execute(
    sql`SELECT h.* FROM households h INNER JOIN household_members m ON m.household_id=h.id WHERE m.user_id=${userId} AND h.id=${householdId}`,
  );
  if (!rows[0]) throw fail("Foyer inaccessible", 403);
  return rows[0];
}
export async function list(
  userId: string,
  householdId: string | null = null,
  tx: any = db,
): Promise<RecordData[]> {
  if (householdId) await membership(userId, householdId, tx);
  const [rows]: any = await tx.execute(
    householdId
      ? sql`SELECT * FROM records WHERE household_id=${householdId} ORDER BY created_at,id`
      : sql`SELECT * FROM records WHERE user_id=${userId} AND household_id IS NULL ORDER BY created_at,id`,
  );
  return rows.map((r: any) => ({
    id: r.id,
    kind: r.kind,
    data: json(r.data),
    revision: r.revision,
    householdId: r.household_id,
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}
export async function audit(userId: string, event: string, tx: any = db) {
  await tx.execute(
    sql`INSERT INTO audit_logs(id,user_id,event) VALUES(${randomUUID()},${userId},${event})`,
  );
}
export async function save(
  userId: string,
  kind: Kind,
  input: any,
  householdId: string | null,
  recordId?: string,
  revision?: number,
  connection?: any,
): Promise<string> {
  const data = parseRecord(kind, input);
  if (kind === "meals" && data.members.length)
    data.servings = data.members.length + data.guests;
  if (householdId && privateKinds.includes(kind))
    throw fail("Ces données restent personnelles", 403);
  const operation = async (tx: any) => {
    if (householdId) {
      await membership(userId, householdId, tx);
      await tx.execute(
        sql`SELECT id FROM households WHERE id=${householdId} FOR UPDATE`,
      );
    } else
      await tx.execute(sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
    const all = await list(userId, householdId, tx);
    const existing = recordId
      ? all.find((r) => r.id === recordId && r.kind === kind)
      : undefined;
    if (recordId && !existing) throw fail("Élément introuvable", 404);
    if (existing && existing.revision !== revision)
      throw fail("Cet élément a changé. Actualisez avant de réessayer.", 409);
    if (
      kind === "profiles" &&
      data.currency !== (existing?.data.currency || "EUR") &&
      all.some((r) =>
        ["prices", "expenses", "budgets", "shoppingItems"].includes(r.kind),
      )
    )
      throw fail(
        "Ce périmètre contient déjà des montants. Le changement de devise nécessite une migration explicite, sans conversion automatique.",
      );
    if (
      kind === "profiles" &&
      !existing &&
      all.some((r) => r.kind === "profiles")
    )
      throw fail("Profil déjà créé", 409);
    if (
      ["weights", "measurements"].includes(kind) &&
      !all.find((r) => r.kind === "profiles")?.data.healthConsent
    )
      throw fail(
        "Votre consentement explicite est requis dans le profil avant de saisir ces données.",
        403,
      );
    const refs = references(kind, data);
    for (const ref of refs) {
      if (!all.some((r) => r.id === ref.id && r.kind === ref.kind))
        throw fail("Référence hors du périmètre autorisé", 403);
    }
    if (kind === "recipes") {
      for (const i of data.ingredients) {
        const food = all.find((r) => r.id === i.foodId)!.data;
        const families: Record<string, string> = {
          g: "m",
          kg: "m",
          ml: "v",
          l: "v",
          pièce: "c",
        };
        if (families[food.unit] !== families[i.unit])
          throw fail("Unité incompatible avec cet aliment");
      }
    }
    if (kind === "meals" && data.members.length) {
      if (!householdId) throw fail("Les convives membres nécessitent un foyer");
      const [members]: any = await tx.execute(
        sql`SELECT user_id FROM household_members WHERE household_id=${householdId}`,
      );
      if (
        data.members.some(
          (id: string) => !members.some((m: any) => m.user_id === id),
        )
      )
        throw fail("Convive absent du foyer");
    }
    const id = recordId || randomUUID();
    if (existing)
      await tx.execute(
        sql`UPDATE records SET data=${JSON.stringify(data)},revision=revision+1 WHERE id=${id}`,
      );
    else
      await tx.execute(
        sql`INSERT INTO records(id,kind,user_id,household_id,data) VALUES(${id},${kind},${userId},${householdId},${JSON.stringify(data)})`,
      );
    await tx.execute(sql`DELETE FROM record_links WHERE source_id=${id}`);
    for (const ref of new Set(refs.map((r) => r.id)))
      await tx.execute(
        sql`INSERT INTO record_links(source_id,target_id) VALUES(${id},${ref})`,
      );
    if (kind === "profiles")
      await tx.execute(
        sql`UPDATE users SET name=${data.name} WHERE id=${userId}`,
      );
    await audit(userId, `${existing ? "update" : "create"}:${kind}`, tx);
    return id;
  };
  return connection ? operation(connection) : db.transaction(operation);
}
export async function remove(
  userId: string,
  id: string,
  householdId: string | null,
  revision: number,
  expectedKind?: Kind,
) {
  await db.transaction(async (tx) => {
    if (householdId) {
      await membership(userId, householdId, tx);
      await tx.execute(
        sql`SELECT id FROM households WHERE id=${householdId} FOR UPDATE`,
      );
    } else
      await tx.execute(sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
    const all = await list(userId, householdId, tx);
    const record = all.find((r) => r.id === id);
    if (!record || (expectedKind && record.kind !== expectedKind))
      throw fail("Élément introuvable", 404);
    if (record.revision !== revision) throw fail("Version périmée", 409);
    const [links]: any = await tx.execute(
      sql`SELECT source_id FROM record_links WHERE target_id=${id} LIMIT 1`,
    );
    if (links.length)
      throw fail(
        "Cet élément est encore utilisé. Retirez ses associations avant de le supprimer.",
        409,
      );
    await tx.execute(sql`DELETE FROM records WHERE id=${id}`);
    await audit(userId, `delete:${record.kind}`, tx);
  });
}
export const kindSchema = z.enum(kinds as [Kind, ...Kind[]]);

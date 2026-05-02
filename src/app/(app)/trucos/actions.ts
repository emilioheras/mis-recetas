"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";
import { uploadTrickImage } from "@/lib/tricks/image-storage";

type ActionResult = { ok: true; trickId: string } | { ok: false; error: string };
type UploadResult =
  | { ok: true; path: string; signedUrl: string }
  | { ok: false; error: string };

function normalizeCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

async function findOrCreateTrickCategory(
  name: string,
  householdId: string,
): Promise<string> {
  const supabase = await createClient();
  const normalized = normalizeCategory(name);

  const { data: existing } = await supabase
    .from("trick_categories")
    .select("id")
    .eq("household_id", householdId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("trick_categories")
    .insert({
      name: name.trim(),
      normalized_name: normalized,
      household_id: householdId,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`No se pudo crear la categoría "${name}": ${error?.message ?? ""}`);
  }
  return created.id;
}

async function cleanupOrphanedTrickCategories(householdId: string): Promise<void> {
  const supabase = await createClient();
  const { data: cats } = await supabase
    .from("trick_categories")
    .select("id")
    .eq("household_id", householdId);
  if (!cats || cats.length === 0) return;

  const ids = cats.map((c) => c.id);
  const { data: used } = await supabase
    .from("trick_category_links")
    .select("category_id")
    .in("category_id", ids);

  const usedIds = new Set((used ?? []).map((r) => r.category_id));
  const orphans = ids.filter((id) => !usedIds.has(id));
  if (orphans.length === 0) return;

  await supabase.from("trick_categories").delete().in("id", orphans);
}

export async function uploadTrickImageAction(
  formData: FormData,
): Promise<UploadResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "Archivo no recibido." };
    }
    const { path } = await uploadTrickImage(file);
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("recipe-images")
      .createSignedUrl(path, 60 * 60);
    if (error || !data) {
      return { ok: false, error: error?.message ?? "No se pudo firmar la URL." };
    }
    return { ok: true, path, signedUrl: data.signedUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function saveTrickAction(
  trickId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const notes = String(formData.get("notes") ?? "");
  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  const source_url = String(formData.get("source_url") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim() || null;

  let categories: string[] = [];
  try {
    const raw = String(formData.get("categories") ?? "[]");
    const parsed = JSON.parse(raw) as unknown[];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const norm = normalizeCategory(trimmed);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      categories.push(trimmed);
    }
  } catch {
    return { ok: false, error: "Lista de categorías inválida." };
  }

  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();

    let id: string;
    if (trickId) {
      const { error } = await supabase
        .from("tricks")
        .update({ title, notes, video_url, source_url, image_url })
        .eq("id", trickId);
      if (error) throw new Error(error.message);
      id = trickId;
    } else {
      const { data, error } = await supabase
        .from("tricks")
        .insert({
          household_id: householdId,
          title,
          notes,
          video_url,
          source_url,
          image_url,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No se pudo crear el truco");
      id = data.id;
    }

    if (trickId) {
      await supabase.from("trick_category_links").delete().eq("trick_id", id);
    }
    if (categories.length > 0) {
      const rows: Array<{ trick_id: string; category_id: string; position: number }> = [];
      for (let i = 0; i < categories.length; i++) {
        const categoryId = await findOrCreateTrickCategory(categories[i], householdId);
        rows.push({ trick_id: id, category_id: categoryId, position: i });
      }
      const { error } = await supabase.from("trick_category_links").insert(rows);
      if (error) throw new Error(error.message);
    }

    await cleanupOrphanedTrickCategories(householdId);

    revalidatePath("/trucos");
    revalidatePath(`/trucos/${id}`);
    return { ok: true, trickId: id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function deleteTrickAction(trickId: string): Promise<void> {
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  const { error } = await supabase.from("tricks").delete().eq("id", trickId);
  if (error) throw new Error(error.message);
  await cleanupOrphanedTrickCategories(householdId);
  revalidatePath("/trucos");
  redirect("/trucos");
}

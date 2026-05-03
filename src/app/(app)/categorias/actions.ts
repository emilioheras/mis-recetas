"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";

type Result = { ok: true } | { ok: false; error: string };

function normalizeCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

async function renameCategoryGeneric(
  table: "categories" | "trick_categories",
  categoryId: string,
  rawName: string,
): Promise<Result> {
  const name = rawName.trim();
  if (!name) return { ok: false, error: "El nombre no puede estar vacío." };

  const normalized = normalizeCategory(name);
  if (!normalized) {
    return { ok: false, error: "El nombre no es válido." };
  }

  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();

    const { data: collision, error: collisionError } = await supabase
      .from(table)
      .select("id")
      .eq("household_id", householdId)
      .eq("normalized_name", normalized)
      .neq("id", categoryId)
      .maybeSingle();

    if (collisionError) return { ok: false, error: collisionError.message };
    if (collision) {
      return {
        ok: false,
        error: `Ya existe otra categoría con el nombre "${name}".`,
      };
    }

    const { error } = await supabase
      .from(table)
      .update({ name, normalized_name: normalized })
      .eq("id", categoryId)
      .eq("household_id", householdId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

async function createCategoryGeneric(
  table: "categories" | "trick_categories",
  rawName: string,
): Promise<Result> {
  const name = rawName.trim();
  if (!name) return { ok: false, error: "El nombre no puede estar vacío." };

  const normalized = normalizeCategory(name);
  if (!normalized) {
    return { ok: false, error: "El nombre no es válido." };
  }

  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();

    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select("id")
      .eq("household_id", householdId)
      .eq("normalized_name", normalized)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (existing) {
      return {
        ok: false,
        error: `Ya existe una categoría con el nombre "${name}".`,
      };
    }

    const { error } = await supabase.from(table).insert({
      household_id: householdId,
      name,
      normalized_name: normalized,
    });
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

async function deleteCategoryGeneric(
  table: "categories" | "trick_categories",
  linkTable: "recipe_categories" | "trick_category_links",
  categoryId: string,
): Promise<Result> {
  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();

    const { error: linkError } = await supabase
      .from(linkTable)
      .delete()
      .eq("category_id", categoryId);
    if (linkError) return { ok: false, error: linkError.message };

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", categoryId)
      .eq("household_id", householdId);
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function createRecipeCategoryAction(
  name: string,
): Promise<Result> {
  const res = await createCategoryGeneric("categories", name);
  if (res.ok) {
    revalidatePath("/categorias");
    revalidatePath("/recetas");
  }
  return res;
}

export async function createTrickCategoryAction(
  name: string,
): Promise<Result> {
  const res = await createCategoryGeneric("trick_categories", name);
  if (res.ok) {
    revalidatePath("/categorias");
    revalidatePath("/trucos");
  }
  return res;
}

export async function renameRecipeCategoryAction(
  categoryId: string,
  newName: string,
): Promise<Result> {
  const res = await renameCategoryGeneric("categories", categoryId, newName);
  if (res.ok) {
    revalidatePath("/categorias");
    revalidatePath("/recetas");
  }
  return res;
}

export async function deleteRecipeCategoryAction(
  categoryId: string,
): Promise<Result> {
  const res = await deleteCategoryGeneric(
    "categories",
    "recipe_categories",
    categoryId,
  );
  if (res.ok) {
    revalidatePath("/categorias");
    revalidatePath("/recetas");
  }
  return res;
}

export async function renameTrickCategoryAction(
  categoryId: string,
  newName: string,
): Promise<Result> {
  const res = await renameCategoryGeneric(
    "trick_categories",
    categoryId,
    newName,
  );
  if (res.ok) {
    revalidatePath("/categorias");
    revalidatePath("/trucos");
  }
  return res;
}

export async function deleteTrickCategoryAction(
  categoryId: string,
): Promise<Result> {
  const res = await deleteCategoryGeneric(
    "trick_categories",
    "trick_category_links",
    categoryId,
  );
  if (res.ok) {
    revalidatePath("/categorias");
    revalidatePath("/trucos");
  }
  return res;
}

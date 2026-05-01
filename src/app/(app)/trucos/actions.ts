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
  const supabase = await createClient();
  const { error } = await supabase.from("tricks").delete().eq("id", trickId);
  if (error) throw new Error(error.message);
  revalidatePath("/trucos");
  redirect("/trucos");
}

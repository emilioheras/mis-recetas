import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";

const BUCKET = "recipe-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function uploadTrickImage(file: File): Promise<{ path: string }> {
  if (file.size === 0) throw new Error("La imagen está vacía.");
  if (file.size > MAX_BYTES) throw new Error("La imagen supera el límite de 5 MB.");
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    throw new Error("Formato no soportado. Usa JPG, PNG, WebP, AVIF o GIF.");
  }

  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();

  const ext = EXT_BY_MIME[file.type] ?? "jpg";
  const random = crypto.randomUUID();
  // Mantenemos household_id como primer nivel del path para que la
  // política RLS del bucket "recipe-images" siga aceptando la subida.
  const path = `${householdId}/tricks/${random}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(`Error subiendo la imagen: ${error.message}`);
  return { path };
}

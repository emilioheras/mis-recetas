import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "./queries";

const BUCKET = "recipe-pdfs";
const SIGNED_URL_EXPIRES = 60 * 60; // 1 hora

export async function uploadRecipePdf(file: File): Promise<{ path: string }> {
  if (file.type && file.type !== "application/pdf") {
    throw new Error("El archivo debe ser un PDF.");
  }
  if (file.size === 0) {
    throw new Error("El archivo está vacío.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El PDF supera el límite de 10 MB.");
  }

  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();

  const ext = "pdf";
  const random = crypto.randomUUID();
  const path = `${householdId}/${random}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Error subiendo el PDF: ${error.message}`);
  }

  return { path };
}

export async function getSignedPdfUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES);
  if (error || !data) return null;
  return data.signedUrl;
}

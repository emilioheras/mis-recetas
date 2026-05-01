import { createClient } from "@/lib/supabase/server";
import type { Trick, TrickListItem } from "./types";

export async function listTricks(search?: string): Promise<TrickListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tricks")
    .select("id, title, image_url, video_url")
    .order("title", { ascending: true });

  if (search && search.trim().length > 0) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    has_image: !!t.image_url,
    has_video: !!t.video_url,
  }));
}

export async function getTrick(id: string): Promise<Trick | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tricks")
    .select(
      "id, title, notes, image_url, video_url, source_url, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Trick | null;
}

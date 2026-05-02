import { createClient } from "@/lib/supabase/server";
import type { Trick, TrickCategory, TrickListItem } from "./types";

type TrickCategoryJoin = {
  position: number | null;
  category: TrickCategory | null;
};

function flattenCategories(
  rows: TrickCategoryJoin[] | null | undefined,
): TrickCategory[] {
  if (!rows) return [];
  return rows
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((r) => r.category)
    .filter((c): c is TrickCategory => c !== null);
}

export async function listTricks(search?: string): Promise<TrickListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tricks")
    .select(
      `id, title, image_url, video_url,
       category_links:trick_category_links (
         position,
         category:trick_categories (id, name, normalized_name)
       )`,
    )
    .order("title", { ascending: true });

  if (search && search.trim().length > 0) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((t) => {
    const row = t as unknown as {
      id: string;
      title: string;
      image_url: string | null;
      video_url: string | null;
      category_links?: TrickCategoryJoin[];
    };
    return {
      id: row.id,
      title: row.title,
      has_image: !!row.image_url,
      has_video: !!row.video_url,
      categories: flattenCategories(row.category_links),
    };
  });
}

export async function getTrick(id: string): Promise<Trick | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tricks")
    .select(
      `id, title, notes, image_url, video_url, source_url, created_at, updated_at,
       category_links:trick_category_links (
         position,
         category:trick_categories (id, name, normalized_name)
       )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Trick & { category_links?: TrickCategoryJoin[] };
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    image_url: row.image_url,
    video_url: row.video_url,
    source_url: row.source_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    categories: flattenCategories(row.category_links),
  };
}

export async function listTrickCategories(): Promise<TrickCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trick_categories")
    .select("id, name, normalized_name")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TrickCategory[];
}

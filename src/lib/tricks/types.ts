export type Trick = {
  id: string;
  title: string;
  notes: string | null;
  image_url: string | null;
  video_url: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TrickListItem = {
  id: string;
  title: string;
  has_image: boolean;
  has_video: boolean;
};

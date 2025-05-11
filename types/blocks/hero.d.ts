import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface HeroVideo {
  src: string;
  type?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title?: string;
  highlight_text?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  video?: HeroVideo;
  tip?: string;
  show_happy_users?: boolean;
  show_badge?: boolean;
}

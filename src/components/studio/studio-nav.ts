import {
  Activity,
  BarChart3,
  BookImage,
  FolderPlus,
  HeartHandshake,
  Images,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

export const studioNavItems = [
  { href: "/studio", labelKey: "studioNav.dashboard", icon: LayoutDashboard },
  { href: "/studio/albums", labelKey: "studioNav.albums", icon: BookImage },
  { href: "/studio/media", labelKey: "studioNav.media", icon: Images },
  { href: "/studio/uploads", labelKey: "studioNav.uploads", icon: UploadCloud },
  { href: "/studio/comments", labelKey: "studioNav.comments", icon: MessageSquareText },
  { href: "/studio/analytics", labelKey: "studioNav.analytics", icon: BarChart3 },
  { href: "/studio/settings", labelKey: "studioNav.settings", icon: Settings },
  { href: "/studio/security", labelKey: "studioNav.security", icon: ShieldCheck },
  { href: "/studio/system", labelKey: "studioNav.system", icon: Activity },
] as const;

export const studioQuickActions = [
  { href: "/studio/albums/new", labelKey: "studioNav.createAlbum", icon: FolderPlus },
  { href: "/studio/uploads", labelKey: "studioNav.uploadMedia", icon: UploadCloud },
  { href: "/studio/comments", labelKey: "studioNav.moderateComments", icon: HeartHandshake },
] as const;

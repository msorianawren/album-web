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
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/albums", label: "Albums", icon: BookImage },
  { href: "/studio/access-requests", label: "Access Requests", icon: ShieldCheck },
  { href: "/studio/media", label: "Media Library", icon: Images },
  { href: "/studio/uploads", label: "Uploads", icon: UploadCloud },
  { href: "/studio/comments", label: "Comments", icon: MessageSquareText },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/settings", label: "Settings", icon: Settings },
  { href: "/studio/security", label: "Security", icon: ShieldCheck },
  { href: "/studio/system", label: "System Health", icon: Activity },
] as const;

export const studioQuickActions = [
  { href: "/studio/albums/new", label: "Create album", icon: FolderPlus },
  { href: "/studio/uploads", label: "Upload media", icon: UploadCloud },
  { href: "/studio/comments", label: "Moderate comments", icon: HeartHandshake },
] as const;

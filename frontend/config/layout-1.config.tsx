import { FileText, FolderOpen, LayoutDashboard, ScrollText } from 'lucide-react';
import { MenuConfig } from '@/config/types';

export const MENU_SIDEBAR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  { heading: 'Knowledge Base' },
  {
    title: 'Ingestion',
    icon: FileText,
    path: '/ingest',
  },
  {
    title: 'Sessions',
    icon: ScrollText,
    path: '/sessions',
  },
  {
    title: 'Collections',
    icon: FolderOpen,
    path: '/collections',
  },
];

// Simplified mega menu (not used in KMS-RAG, kept for compatibility)
export const MENU_MEGA: MenuConfig = [
  { title: 'Dashboard', path: '/dashboard' },
];

// Simplified mobile mega menu (not used in KMS-RAG, kept for compatibility)
export const MENU_MEGA_MOBILE: MenuConfig = [
  { title: 'Dashboard', path: '/dashboard' },
];

import { Bot, FileText, FolderOpen, LayoutDashboard, MessageCircle, ScrollText, Settings } from 'lucide-react';
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
  {
    title: 'Chat',
    icon: MessageCircle,
    path: '/chat',
  },
  { heading: 'Configuration' },
  {
    title: 'System Prompts',
    icon: Settings,
    path: '/settings/prompts',
  },
  {
    title: 'Agent Model',
    icon: Bot,
    path: '/settings/agent',
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

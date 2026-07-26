import {
  LayoutDashboard,
  Briefcase,
  HeartHandshake,
  Users,
  MessageSquare,
  User as UserIcon,
  ClipboardList,
  FileSignature,
  BookOpen,
  Settings,
  Gavel,
  Clock,
  Bell,
  Scale,
  FolderOpen,
  BarChart2,
  ScrollText,
} from 'lucide-react';
import { NavigationSection } from '../types';

export const legalNavigation: NavigationSection[] = [
  {
    section: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/legal/dashboard' },
      { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/legal/messages' },
    ]
  },
  {
    section: 'Case Management',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/legal/notifications' },
      { id: 'cases', label: 'My Cases', icon: Briefcase, path: '/legal/cases' },
      { id: 'clients', label: 'Clients', icon: Users, path: '/legal/clients' },
      { id: 'probono', label: 'Pro-Bono Hub', icon: HeartHandshake, path: '/legal/probono' },
      { id: 'service-logs', label: 'Service Logs', icon: Clock, path: '/legal/service-logs' },
    ]
  },
  {
    section: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: UserIcon, path: '/legal/profile' },
      { id: 'terms', label: 'Terms & Conditions', icon: ScrollText, path: '/legal/terms' },
    ]
  }
];

export const publicNavigation: NavigationSection[] = [
  {
    section: 'Overview',
    items: [
      { id: 'home', label: 'Home', icon: LayoutDashboard, path: '/public/dashboard' },
      { id: 'messages', label: 'My Chats', icon: MessageSquare, path: '/public/messages' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/public/notifications' },
    ]
  },
  {
    section: 'Legal Support',
    items: [
      { id: 'triage', label: 'Get Help', icon: ClipboardList, path: '/public/triage' },
      { id: 'cases', label: 'My Cases', icon: FolderOpen, path: '/public/cases' },
      { id: 'documents', label: 'Document Maker', icon: FileSignature, path: '/public/documents' },
    ]
  },
  {
    section: 'Resources',
    items: [
      { id: 'guides', label: 'Rights Library', icon: BookOpen, path: '/public/rights' },
    ]
  },
  {
    section: 'Account',
    items: [
      { id: 'profile', label: 'My Profile', icon: UserIcon, path: '/public/profile' },
      { id: 'terms', label: 'Terms & Conditions', icon: ScrollText, path: '/public/terms' },
    ]
  }
];

export const adminNavigation: NavigationSection[] = [
  {
    section: 'Administration',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { id: 'accounts', label: 'Accounts', icon: Users, path: '/admin/accounts' },
      { id: 'attorney-verifications', label: 'Attorney Verifications', icon: Gavel, path: '/admin/attorney-verifications' },
      { id: 'cases', label: 'Case Management', icon: Scale, path: '/admin/cases' },
    ]
  },
  {
    section: 'System',
    items: [
      { id: 'logs', label: 'Activity Logs', icon: ClipboardList, path: '/admin/logs' },
      { id: 'feedback', label: 'Feedback & Resolution', icon: BarChart2, path: '/admin/feedback' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
      { id: 'terms', label: 'Terms & Conditions', icon: ScrollText, path: '/admin/terms' },
    ]
  }
];

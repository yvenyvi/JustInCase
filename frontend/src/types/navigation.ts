import { ComponentType } from 'react';

export type NavigationItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: number;
};

export type NavigationSection = {
  section: string;
  items: NavigationItem[];
};

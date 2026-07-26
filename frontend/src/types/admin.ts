import { ReactNode } from 'react';

export interface AdminActivity {
  id: number;
  type: string;
  user: string;
  detail: string;
  time: string;
  icon: ReactNode;
  color: string;
}

export interface KPIStats {
  value: string;
  label: string;
  trend: string;
  trendDirection: 'up' | 'down';
  dataPoints: number[];
}

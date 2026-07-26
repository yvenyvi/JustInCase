import React from 'react';
import { Globe, ShieldCheck, Users, Activity } from 'lucide-react';
import { AdminActivity } from '../types';

export const trafficData = [45, 52, 48, 70, 65, 85, 80];

export const userGrowth = [120, 150, 180, 210, 240, 280, 320];

export const recentAuditActivity: AdminActivity[] = [
  { id: 1, type: 'Login', user: 'Juan Dela Cruz', detail: 'Successful login from Tondo, Manila', time: '2 mins ago', icon: React.createElement(Globe, { size: 16 }), color: '#3B82F6' },
  { id: 2, type: 'Security', user: 'System', detail: 'Blocked 4 suspicious login attempts from unknown IP', time: '15 mins ago', icon: React.createElement(ShieldCheck, { size: 16 }), color: '#EF4444' },
  { id: 3, type: 'User', user: 'Admin Root', detail: 'Promoted Atty. Maria Santos to Lead Advocate', time: '45 mins ago', icon: React.createElement(Users, { size: 16 }), color: '#8B5CF6' },
  { id: 4, type: 'Action', user: 'Elena Guerrero', detail: 'Submitted 3 new triage documents', time: '1 hour ago', icon: React.createElement(Activity, { size: 16 }), color: '#10B981' },
];

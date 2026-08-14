import { MessageThread, ActiveUser } from '../types';

export const legalThreads: MessageThread[] = [
  { id: 1, name: 'Juan Dela Cruz', handle: '@juan', preview: 'Salamat po, Atty. Kailan po ang hearing sa Barangay?', unread: true, time: '10:42 AM', caseName: 'Eviction Defense (Tondo)' },
  { id: 2, name: 'Maria Clara Santos', handle: '@mclara', preview: 'Atty, na-send ko na po ang payslips for the DOLE claim.', unread: false, time: 'Yesterday' },
  { id: 3, name: 'LAYA Support', handle: '@support', preview: 'Your pro-bono hours for Q1 have been verified.', unread: false, time: 'Mar 15' },
];

export const legalActiveUsers: ActiveUser[] = [
  { name: 'Juan', status: 'online' },
  { name: 'Maria', status: 'online' },
  { name: 'Pedro', status: 'offline' },
  { name: 'Elena', status: 'online' },
];

export const publicThreads: MessageThread[] = [
  { id: 1, name: 'Atty. Maria Santos', handle: '@maria', preview: 'Kumusta, Alex. I have reviewed your case documents...', unread: true, time: '10:45 AM' },
  { id: 2, name: 'LAYA Support', handle: '@support', preview: 'Welcome! Kumusta po ang experience niyo sa platform?', unread: false, time: 'Yesterday' },
];

export const publicActiveUsers: ActiveUser[] = [
  { name: 'Atty. Maria', status: 'online' },
  { name: 'Support', status: 'online' },
  { name: 'Atty. Sarah', status: 'offline' },
  { name: 'Atty. John', status: 'online' },
];

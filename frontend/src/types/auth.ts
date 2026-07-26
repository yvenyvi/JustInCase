export type UserRole = 'Volunteer Attorney' | 'Citizen' | 'Super Administrator';

export interface User {
  name: string;
  role: string | UserRole;
}

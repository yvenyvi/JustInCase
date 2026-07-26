export interface CaseActivity {
  title: string;
  status: string;
  date: string;
  color: string;
}

export interface TriageAlert {
  type: string;
  match: string;
}

export interface MessageThread {
  id: number;
  name: string;
  handle: string;
  preview: string;
  unread: boolean;
  time: string;
  caseName?: string;
}

export interface ActiveUser {
  name: string;
  status: 'online' | 'offline';
}

export interface CaseStudy {
  title: string;
  description: string;
  outcomes: string[];
  tag: string;
}

export type RootStackParamList = {
  Auth: undefined;
  PublicHome: undefined;
  PublicTriage: undefined;
  PublicDocumentGenerator: undefined;
  PublicDocumentForm: { template: any };
  PublicDocumentResult: { result: any };
  PublicRightsLibrary: undefined;
  PublicNotifications: undefined;
  ChatThread: { threadId: string; threadName: string };
  CaseDetails: { caseId: string };
  LegalCaseDetails: { caseId: string };
  PersonalInfo: undefined;
  Security: undefined;
  Settings: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  NotificationSettings: undefined;
  LegalHome: undefined;
  AdminHome: undefined;
};

export type Role = 'public' | 'legal' | 'admin';
export type RootStackParamList = {
  Auth: undefined;
  PublicHome: undefined;
  PublicCases: undefined;
  PublicMessages: undefined;
  PublicProfile: undefined;
  PublicTriage: undefined;
  PublicTriageResult: { result: any };
  PublicTriageLawyerSelection: { result: any };
  PublicDocumentGenerator: undefined;
  PublicDocumentForm: { templateSlug: string; templateTitle: string };
  PublicDocumentResult: { result: any };
  PublicMyDocuments: undefined;
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
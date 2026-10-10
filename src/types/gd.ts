export type GDFormat = 'standard' | 'case_study' | 'abstract' | 'controversial' | 'fishbowl';

export type LanguageMode = 'english' | 'hinglish' | 'formal';

export type GDStage = 'intro' | 'discussion' | 'summary' | 'completed';

export interface GDTopic {
  id: string;
  title: string;
  category: 'Tech & AI' | 'Business & Economy' | 'Case Study' | 'Abstract' | 'Ethics & Society';
  description: string;
  backgroundBrief: string;
  keyDebateAxes: string[];
  suggestedFrameworks: string[];
  difficulty: 'Campus Standard' | 'IIM / Tier-1 MBA' | 'High Intensity';
  defaultFormat: GDFormat;
}

export interface Participant {
  id: string;
  name: string;
  role: 'moderator' | 'candidate';
  archetype: string;
  avatarColor: string;
  gender: 'male' | 'female';
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  persona: string;
  speakingStyle: string;
  airtimeTarget: number; // percentage benchmark
  avatarInitial: string;
  title: string;
}

export interface TranscriptTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  role: 'moderator' | 'candidate' | 'user';
  text: string;
  timestamp: string;
  timeSeconds: number;
  isUser: boolean;
  emotion?: string;
  directReplyTo?: string | null;
  thoughtProcess?: string;
}

export interface RoomConfig {
  topic: GDTopic;
  format: GDFormat;
  panelSize: number; // 3 to 5 AI peers (+ 1 moderator)
  durationMinutes: number;
  languageMode: LanguageMode;
  patienceDelaySeconds: number; // 1.5 to 5.0
  userName: string;
  targetRole: string;
  fishbowlInitialState?: 'spectator' | 'active';
}

export interface SpeakingMetrics {
  userTurnsCount: number;
  userSpokenDuration: number; // seconds
  interruptionsCount: number;
  userAirtimePercentage: number;
  totalDiscussionDuration: number;
  speakerDurations: Record<string, number>;
}

export interface CriteriaScore {
  score: number;
  feedback: string;
  quotedEvidence?: string;
  frameworksIdentified?: string[];
}

export interface MissedOpportunity {
  timestamp: string;
  roomContext: string;
  missedOpening: string;
  suggestedIntervention: string;
  strategicRationale: string;
}

export interface GDReport {
  overallScore: number;
  percentile: number;
  verdict: 'Selected for Personal Interview' | 'Borderline / Waitlist' | 'Not Selected';
  summaryAssessment: string;
  criteriaScores: {
    initiation: CriteriaScore;
    contentDepth: CriteriaScore;
    activeListening: CriteriaScore;
    assertiveness: CriteriaScore;
    articulation: CriteriaScore;
    synthesisAndConclusion: CriteriaScore;
  };
  keyStrengths: Array<{
    title: string;
    analysis: string;
    quote: string;
    timestamp?: string;
  }>;
  criticalImprovements: Array<{
    title: string;
    critique: string;
    quote: string;
    timestamp?: string;
  }>;
  missedOpportunitiesReplay: MissedOpportunity[];
  interviewerNote: string;
  generatedAt: string;
  speakingMetrics: SpeakingMetrics;
}

export interface SessionHistoryItem {
  id: string;
  date: string;
  topicTitle: string;
  category: string;
  overallScore: number;
  verdict: string;
  userAirtimePercentage: number;
  report: GDReport;
}

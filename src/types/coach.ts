export type CognitiveLoad = 'high' | 'medium' | 'low';

export type UserLocation = 'transit' | 'home';

export type ActiveTab = 'prototype' | 'flow' | 'specs' | 'pitch';

export interface AcademicTask {
  id: string;
  title: string;
  course: string;
  dueIso: string; // ISO 8601 con zona horaria -05:00
  dueLabel: string;
  cognitiveLoad: CognitiveLoad;
  estimatedMinutes: number;
  completed: boolean;
}

export interface StudentContextState {
  currentEnergyLevel: number; // 1 - 10
  availableMinutes: number;
  userLocation: UserLocation;
  currentTimeHHMM: string; // e.g. "20:30"
  referenceDateISO: string; // e.g. "2026-11-16"
}

export interface CoachPayload {
  user_profile: {
    role: string;
    work_schedule: string;
    commute_origin: string;
    timezone: string;
    sleep_cutoff_local: string;
  };
  current_state: {
    current_energy_level: number;
    available_minutes: number;
    user_location: UserLocation;
    current_timestamp_iso: string;
  };
  pending_tasks: Array<{
    id: string;
    title: string;
    course: string;
    due_iso: string;
    cognitive_load_type: CognitiveLoad;
    estimated_minutes: number;
  }>;
  user_message: string;
}

export interface DiscardedTaskReason {
  taskId: string;
  title: string;
  cognitiveLoad: CognitiveLoad;
  reason: string;
}

export interface CoachDecision {
  selectedTaskId: string | null;
  selectedTaskTitle: string | null;
  selectedCourse: string | null;
  selectedLoad: CognitiveLoad | null;
  blockStart: string;
  blockEnd: string;
  assignedMinutes: number;
  breakMinutes: number;
  cutoffProtected: boolean;
  ruleApplied: string;
  instructionMessage: string;
  discardedTasks: DiscardedTaskReason[];
  source: 'rules-engine' | 'gemini-ai';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach' | 'error';
  timestamp: string;
  text: string;
  decision?: CoachDecision;
}

export interface TestCaseEvidence {
  id: string;
  label: string;
  scenarioSummary: string;
  userPrompt: string;
  contextSnapshot: StudentContextState;
  expectedDecision: CoachDecision;
}

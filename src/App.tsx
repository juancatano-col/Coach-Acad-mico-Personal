import { useEffect, useMemo, useState } from 'react';
import { ArchitectureFlowView } from './components/ArchitectureFlowView';
import { HeaderBar } from './components/HeaderBar';
import { LivePrototypeView } from './components/LivePrototypeView';
import { PitchAndGovernanceView } from './components/PitchAndGovernanceView';
import { UiSpecAndPromptView } from './components/UiSpecAndPromptView';
import {
  DEFAULT_CONTEXT_STATE,
  INITIAL_TASKS,
  TEST_CASES_EVIDENCE,
} from './data/seedData';
import type {
  AcademicTask,
  ActiveTab,
  ChatMessage,
  CoachDecision,
  StudentContextState,
  TestCaseEvidence,
} from './types/coach';
import {
  buildCoachPayload,
  evaluateDeterministicPlan,
  formatTime12h,
} from './utils/prioritizer';

const STORAGE_TASKS_KEY = 'coach_academico_tasks_v1';
const STORAGE_STATE_KEY = 'coach_academico_state_v1';

function loadSavedTasks(): AcademicTask[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_TASKS_KEY);
    if (!raw) return INITIAL_TASKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
}

function loadSavedState(): StudentContextState {
  try {
    const raw = window.localStorage.getItem(STORAGE_STATE_KEY);
    if (!raw) return DEFAULT_CONTEXT_STATE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.currentEnergyLevel === 'number') {
      return parsed;
    }
    return DEFAULT_CONTEXT_STATE;
  } catch {
    return DEFAULT_CONTEXT_STATE;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('prototype');
  const [tasks, setTasks] = useState<AcademicTask[]>(loadSavedTasks);
  const [contextState, setContextState] = useState<StudentContextState>(loadSavedState);

  const initialDecision = useMemo(
    () => evaluateDeterministicPlan(contextState, tasks),
    // Solo para inicialización del primer render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [activeDecision, setActiveDecision] = useState<CoachDecision>(initialDecision);
  const [lastUserMessage, setLastUserMessage] = useState<string>(
    TEST_CASES_EVIDENCE[0].userPrompt
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'seed-user-1',
      sender: 'user',
      timestamp: formatTime12h(DEFAULT_CONTEXT_STATE.currentTimeHHMM),
      text: TEST_CASES_EVIDENCE[0].userPrompt,
    },
    {
      id: 'seed-coach-1',
      sender: 'coach',
      timestamp: formatTime12h(DEFAULT_CONTEXT_STATE.currentTimeHHMM),
      text: initialDecision.instructionMessage,
      decision: initialDecision,
    },
  ]);

  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // Ignorar errores de cuota de almacenamiento
    }
  }, [tasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(contextState));
    } catch {
      // Ignorar errores de cuota de almacenamiento
    }
  }, [contextState]);

  const livePayload = useMemo(
    () => buildCoachPayload(contextState, tasks, lastUserMessage),
    [contextState, tasks, lastUserMessage]
  );

  const handleEvaluateLocally = (
    overrideState?: StudentContextState,
    overrideTasks?: AcademicTask[],
    optionalMessage?: string
  ) => {
    const nextState = overrideState ?? contextState;
    const nextTasks = overrideTasks ?? tasks;
    const decision = evaluateDeterministicPlan(nextState, nextTasks);
    setActiveDecision(decision);

    if (optionalMessage) {
      setLastUserMessage(optionalMessage);
      const timeLabel = formatTime12h(nextState.currentTimeHHMM);
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: 'user',
          timestamp: timeLabel,
          text: optionalMessage,
        },
        {
          id: `c-${Date.now() + 1}`,
          sender: 'coach',
          timestamp: timeLabel,
          text: decision.instructionMessage,
          decision,
        },
      ]);
    }
  };

  const handleSendToGemini = async (messageText: string) => {
    const timeLabel = formatTime12h(contextState.currentTimeHHMM);
    setLastUserMessage(messageText);
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        timestamp: timeLabel,
        text: messageText,
      },
    ]);

    setIsSending(true);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          contextState,
          tasks,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.decision) {
        const errMsg =
          data?.error ||
          'No se pudo obtener respuesta de Gemini. Verifica la configuración del servidor.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'error',
            timestamp: timeLabel,
            text: errMsg,
          },
        ]);
        return;
      }

      const geminiDecision = data.decision as CoachDecision;
      setActiveDecision(geminiDecision);
      setMessages((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          sender: 'coach',
          timestamp: timeLabel,
          text: geminiDecision.instructionMessage,
          decision: geminiDecision,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'error',
          timestamp: timeLabel,
          text: 'Error de red al conectar con /api/coach. Puedes usar "Evaluar con Reglas Locales" mientras restableces la conexión.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleApplyPreset = (preset: {
    energy: number;
    minutes: number;
    location: 'home' | 'transit';
    timeHHMM: string;
    prompt: string;
  }) => {
    const nextState: StudentContextState = {
      ...contextState,
      currentEnergyLevel: preset.energy,
      availableMinutes: preset.minutes,
      userLocation: preset.location,
      currentTimeHHMM: preset.timeHHMM,
    };
    setContextState(nextState);
    handleEvaluateLocally(nextState, tasks, preset.prompt);
  };

  const handleLoadTestCase = (testCase: TestCaseEvidence) => {
    setContextState(testCase.contextSnapshot);
    handleEvaluateLocally(testCase.contextSnapshot, tasks, testCase.userPrompt);
    setActiveTab('prototype');
  };

  const handleAddTask = (newTask: AcademicTask) => {
    const updated = [newTask, ...tasks];
    setTasks(updated);
    setActiveDecision(evaluateDeterministicPlan(contextState, updated));
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    setActiveDecision(evaluateDeterministicPlan(contextState, updated));
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    setActiveDecision(evaluateDeterministicPlan(contextState, updated));
  };

  const handleResetTasks = () => {
    setTasks(INITIAL_TASKS);
    setActiveDecision(evaluateDeterministicPlan(contextState, INITIAL_TASKS));
  };

  const handleHeaderQuickAction = () => {
    setActiveTab('prototype');
    handleEvaluateLocally(contextState, tasks);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRunQuickCheck={handleHeaderQuickAction}
      />

      <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'prototype' && (
          <LivePrototypeView
            contextState={contextState}
            onUpdateContext={(next) => {
              setContextState(next);
              setActiveDecision(evaluateDeterministicPlan(next, tasks));
            }}
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onResetTasks={handleResetTasks}
            activeDecision={activeDecision}
            livePayload={livePayload}
            messages={messages}
            isSending={isSending}
            onSendToGemini={handleSendToGemini}
            onEvaluateLocally={() => handleEvaluateLocally()}
            onApplyPreset={handleApplyPreset}
          />
        )}

        {activeTab === 'flow' && (
          <ArchitectureFlowView
            livePayload={livePayload}
            onGoToPrototype={() => setActiveTab('prototype')}
          />
        )}

        {activeTab === 'specs' && (
          <UiSpecAndPromptView onLoadTestCase={handleLoadTestCase} />
        )}

        {activeTab === 'pitch' && <PitchAndGovernanceView />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span>Juan Fernando Cataño Higuita · Ingeniería de Software y Datos · 2026</span>
          <span>Actividad 2 · Prototipo Simulado de Solución con IA Generativa</span>
        </div>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  MapPin,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import type {
  AcademicTask,
  ChatMessage,
  CoachDecision,
  CoachPayload,
  CognitiveLoad,
  StudentContextState,
} from '../types/coach';
import { formatTime12h, validateNewTask } from '../utils/prioritizer';

interface LivePrototypeViewProps {
  contextState: StudentContextState;
  onUpdateContext: (next: StudentContextState) => void;
  tasks: AcademicTask[];
  onAddTask: (task: AcademicTask) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onResetTasks: () => void;
  activeDecision: CoachDecision;
  livePayload: CoachPayload;
  messages: ChatMessage[];
  isSending: boolean;
  onSendToGemini: (messageText: string) => void;
  onEvaluateLocally: (messageText?: string) => void;
  onApplyPreset: (preset: {
    energy: number;
    minutes: number;
    location: 'home' | 'transit';
    timeHHMM: string;
    prompt: string;
  }) => void;
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150];

function getEnergyDescriptor(energy: number): { label: string; colorClass: string } {
  if (energy <= 3) {
    return { label: 'Fatiga alta · Solo lectura o repaso', colorClass: 'text-red-700' };
  }
  if (energy <= 6) {
    return { label: 'Energía media · Tareas moderadas', colorClass: 'text-amber-700' };
  }
  return { label: 'Alta energía · Apto para código o diseño', colorClass: 'text-emerald-700' };
}

function getLoadText(load: CognitiveLoad): { label: string; colorClass: string } {
  if (load === 'high') return { label: 'Alta', colorClass: 'text-red-700 font-medium' };
  if (load === 'medium') return { label: 'Media', colorClass: 'text-amber-700 font-medium' };
  return { label: 'Baja', colorClass: 'text-emerald-700 font-medium' };
}

export function LivePrototypeView({
  contextState,
  onUpdateContext,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onResetTasks,
  activeDecision,
  livePayload,
  messages,
  isSending,
  onSendToGemini,
  onEvaluateLocally,
  onApplyPreset,
}: LivePrototypeViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoad>('low');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [dueDateLocal, setDueDateLocal] = useState('2026-11-20T18:00');
  const [formError, setFormError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [showJsonPayload, setShowJsonPayload] = useState(false);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const energyInfo = getEnergyDescriptor(contextState.currentEnergyLevel);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateNewTask({
      title,
      course,
      estimatedMinutes,
      dueDateLocal,
    });
    if (!check.valid) {
      setFormError(check.error ?? 'Revisa los campos del formulario.');
      return;
    }

    const formattedIso = `${dueDateLocal}:00-05:00`;
    const dateObj = new Date(formattedIso);
    const dueLabel = Number.isNaN(dateObj.getTime())
      ? dueDateLocal.replace('T', ' ')
      : dateObj.toLocaleDateString('es-CO', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

    onAddTask({
      id: `task-${Date.now()}`,
      title: title.trim(),
      course: course.trim(),
      dueIso: formattedIso,
      dueLabel,
      cognitiveLoad,
      estimatedMinutes,
      completed: false,
    });

    setTitle('');
    setCourse('');
    setCognitiveLoad('low');
    setEstimatedMinutes(30);
    setFormError(null);
    setShowAddForm(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    const text = chatInput.trim();
    setChatInput('');
    onSendToGemini(text);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del espacio de trabajo y banda de métricas */}
      <section className="space-y-4 border-b border-slate-200 pb-5">
        <div className="max-w-3xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
            Coach Académico Personal
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Prototipo funcional de priorización determinista para combatir la fatiga por decisión tras la jornada de soporte TI y el trayecto desde Girardota.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200/80 pt-4 sm:grid-cols-4 sm:gap-6">
          <div>
            <p className="text-xs text-slate-500">Tiempo de arranque</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
              45 min → &lt; 2 min
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Zona horaria</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
              UTC-5 (Bogotá)
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Límite nocturno</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
              22:30
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pendientes activos</p>
            <p
              data-testid="pending-tasks-count"
              className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums"
            >
              {pendingCount}
            </p>
          </div>
        </div>
      </section>

      {/* Grid principal de 2 columnas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Columna izquierda: Inputs (Estado + Inventario de Tareas) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Bloque 1: Check-in de Estado */}
          <section
            aria-labelledby="heading-context-state"
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="heading-context-state"
                className="font-display text-base font-semibold text-slate-900"
              >
                01. Check-in de Energía y Contexto
              </h2>
              <span className={`text-xs font-medium ${energyInfo.colorClass}`}>
                {energyInfo.label}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              {/* Nivel de Energía */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Nivel de energía actual
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {contextState.currentEnergyLevel}/10
                  </span>
                </div>
                <div
                  role="group"
                  aria-label="Seleccionar nivel de energía del 1 al 10"
                  className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-10"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                    const selected = contextState.currentEnergyLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          onUpdateContext({ ...contextState, currentEnergyLevel: level })
                        }
                        aria-pressed={selected}
                        aria-label={`Energía ${level} de 10`}
                        className={`h-10 rounded-lg border font-mono text-sm font-medium tabular-nums transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ubicación, Tiempo disponible y Hora local */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className="block text-sm font-medium text-slate-700">
                    Ubicación actual
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateContext({ ...contextState, userLocation: 'home' })
                      }
                      aria-pressed={contextState.userLocation === 'home'}
                      className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        contextState.userLocation === 'home'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      En casa
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateContext({ ...contextState, userLocation: 'transit' })
                      }
                      aria-pressed={contextState.userLocation === 'transit'}
                      className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        contextState.userLocation === 'transit'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      En el bus
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="available-minutes-select"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Tiempo libre
                  </label>
                  <select
                    id="available-minutes-select"
                    value={contextState.availableMinutes}
                    onChange={(e) =>
                      onUpdateContext({
                        ...contextState,
                        availableMinutes: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
                  >
                    {DURATION_OPTIONS.map((mins) => (
                      <option key={mins} value={mins}>
                        {mins} min ({(mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)} h)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="current-time-input"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Hora local (UTC-5)
                  </label>
                  <input
                    id="current-time-input"
                    type="time"
                    value={contextState.currentTimeHHMM}
                    onChange={(e) =>
                      onUpdateContext({
                        ...contextState,
                        currentTimeHHMM: e.target.value || '20:30',
                      })
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Perfil activo: Soporte TI (8 AM – 5 PM) · Trayecto Girardota (~2 h)
                </p>
                <button
                  type="button"
                  onClick={() => onEvaluateLocally()}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  Evaluar con Reglas Locales
                </button>
              </div>
            </div>
          </section>

          {/* Bloque 2: Inventario de Tareas */}
          <section
            aria-labelledby="heading-tasks-inventory"
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="heading-tasks-inventory"
                  className="font-display text-base font-semibold text-slate-900"
                >
                  02. Inventario Académico (Google Calendar / Sílabos)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pendientes sincronizados con fecha ISO 8601 (-05:00) y nivel de carga cognitiva.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tasks.length === 0 && (
                  <button
                    type="button"
                    onClick={onResetTasks}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Restaurar ejemplo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm((prev) => !prev);
                    setFormError(null);
                  }}
                  aria-expanded={showAddForm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Agregar tarea
                </button>
              </div>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreateTask}
                noValidate
                className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="new-task-title"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Nombre de la tarea
                    </label>
                    <input
                      id="new-task-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej. Resumen Bases de Datos"
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-task-course"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Materia o curso
                    </label>
                    <input
                      id="new-task-course"
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder="Ej. Bases de Datos II"
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-task-load"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Carga cognitiva
                    </label>
                    <select
                      id="new-task-load"
                      value={cognitiveLoad}
                      onChange={(e) => setCognitiveLoad(e.target.value as CognitiveLoad)}
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="low">Baja (Lectura / Esquema)</option>
                      <option value="medium">Media (Taller / Informe)</option>
                      <option value="high">Alta (Código / Arquitectura)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="new-task-minutes"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Minutos
                      </label>
                      <input
                        id="new-task-minutes"
                        type="number"
                        min={10}
                        max={300}
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="new-task-due"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Fecha límite
                      </label>
                      <input
                        id="new-task-due"
                        type="datetime-local"
                        value={dueDateLocal}
                        onChange={(e) => setDueDateLocal(e.target.value)}
                        className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <p role="alert" className="mt-2.5 text-xs font-medium text-red-700">
                    {formError}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormError(null);
                    }}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Guardar tarea
                  </button>
                </div>
              </form>
            )}

            {tasks.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-slate-300 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No hay tareas registradas en el calendario.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Agrega una entrega o restaura los datos de ejemplo del proyecto.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {tasks.map((task) => {
                  const loadMeta = getLoadText(task.cognitiveLoad);
                  const isRecommended = activeDecision.selectedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      data-testid="task-row"
                      className={`flex items-center justify-between gap-3 py-3 transition-colors ${
                        isRecommended ? 'bg-blue-50/50 -mx-2 px-2 rounded-lg' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          aria-label={
                            task.completed
                              ? `Marcar como pendiente ${task.title}`
                              : `Marcar como completada ${task.title}`
                          }
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            task.completed
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white hover:border-blue-500'
                          }`}
                        >
                          {task.completed && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-medium ${
                              task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            <span>{task.course}</span>
                            <span aria-hidden="true">·</span>
                            <span className={loadMeta.colorClass}>Carga {loadMeta.label}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{task.estimatedMinutes} min</span>
                            <span aria-hidden="true">·</span>
                            <span>Vence {task.dueLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {isRecommended && !task.completed && (
                          <span className="hidden text-xs font-semibold text-blue-700 sm:inline">
                            Asignada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`Eliminar ${task.title}`}
                          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Columna derecha: Salida Única + Simulador Telegram / AI Studio + Payload JSON */}
        <div className="space-y-6 lg:col-span-5">
          {/* Tarjeta de Decisión Única Cerrada (Output) */}
          <section
            aria-labelledby="heading-active-decision"
            data-testid="decision-panel"
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-active-decision"
                className="font-display text-base font-semibold text-slate-900"
              >
                03. Micro-Instrucción Única
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {activeDecision.source === 'gemini-ai'
                  ? 'Respuesta Gemini en vivo'
                  : 'Motor de reglas determinista'}
              </span>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {activeDecision.assignedMinutes > 0
                    ? `${formatTime12h(activeDecision.blockStart)} – ${formatTime12h(activeDecision.blockEnd)}`
                    : 'Descanso prioritario'}
                </p>
                {activeDecision.assignedMinutes > 0 && (
                  <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                    {activeDecision.assignedMinutes} min netos
                    {activeDecision.breakMinutes > 0
                      ? ` · Pausa ${activeDecision.breakMinutes} min`
                      : ''}
                  </span>
                )}
              </div>

              {activeDecision.selectedTaskTitle && (
                <p
                  data-testid="recommended-task-title"
                  className="mt-2 text-sm font-semibold text-blue-700"
                >
                  {activeDecision.selectedTaskTitle}
                  {activeDecision.selectedCourse ? ` · ${activeDecision.selectedCourse}` : ''}
                </p>
              )}

              <p
                data-testid="decision-instruction"
                className="mt-3 text-sm leading-relaxed text-slate-700"
              >
                {activeDecision.instructionMessage}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Regla aplicada: {activeDecision.ruleApplied}
              </p>

              {activeDecision.discardedTasks.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowDiscarded((prev) => !prev)}
                    aria-expanded={showDiscarded}
                    className="flex w-full items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    <span>
                      Tareas descartadas en este bloque ({activeDecision.discardedTasks.length})
                    </span>
                    {showDiscarded ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                  {showDiscarded && (
                    <ul className="mt-2.5 space-y-2 text-xs text-slate-600">
                      {activeDecision.discardedTasks.map((item) => (
                        <li
                          key={item.taskId}
                          className="rounded-md bg-slate-50 px-3 py-2"
                        >
                          <span className="font-medium text-slate-800">{item.title}</span>
                          {item.reason ? `: ${item.reason}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Simulador de Bot (Telegram / AI Studio) */}
          <section
            aria-labelledby="heading-chat-simulator"
            className="rounded-xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="heading-chat-simulator"
                  className="font-display text-base font-semibold text-slate-900"
                >
                  Simulador Conversacional (Bot Móvil)
                </h2>
                <span className="text-xs text-slate-500">Gemini API + Reglas</span>
              </div>

              {/* Escenarios rápidos */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onApplyPreset({
                      energy: 3,
                      minutes: 90,
                      location: 'home',
                      timeHHMM: '20:30',
                      prompt:
                        'Acabo de llegar de Girardota. Energía 3/10 y 1.5 horas libres antes de dormir.',
                    })
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Caso 1: Agotado 3/10
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onApplyPreset({
                      energy: 5,
                      minutes: 45,
                      location: 'transit',
                      timeHHMM: '18:15',
                      prompt:
                        'Voy en el bus hacia Girardota, energía 5/10 y 45 min de trayecto.',
                    })
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Caso 2: En el bus 5/10
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onApplyPreset({
                      energy: 8,
                      minutes: 120,
                      location: 'home',
                      timeHHMM: '09:00',
                      prompt:
                        'Sábado descansado en casa. Energía 8/10 y 2 horas seguidas libres.',
                    })
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Caso 3: Sábado 8/10
                </button>
              </div>
            </div>

            {/* Historial de mensajes */}
            <div
              data-testid="chat-history"
              className="max-h-72 space-y-3 overflow-y-auto bg-slate-50/70 p-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : msg.sender === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-800'
                        : 'border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div
                      className={`mt-1 flex items-center gap-1.5 font-mono text-[10px] tabular-nums ${
                        msg.sender === 'user'
                          ? 'text-blue-100'
                          : msg.sender === 'error'
                          ? 'text-red-600'
                          : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.decision && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {msg.decision.source === 'gemini-ai' ? 'Gemini' : 'Reglas'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-start">
                  <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500">
                    Analizando estado y fechas límite en Gemini...
                  </div>
                </div>
              )}
            </div>

            {/* Entrada de mensaje */}
            <form
              onSubmit={handleChatSubmit}
              className="border-t border-slate-200 p-3"
            >
              <div className="flex items-center gap-2">
                <label htmlFor="bot-chat-input" className="sr-only">
                  Mensaje para el Coach Académico
                </label>
                <input
                  id="bot-chat-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ej. Llegué cansado, tengo energía 3/10 y 1 hora..."
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !chatInput.trim()}
                  aria-label="Enviar mensaje a Gemini"
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Enviar
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {contextState.userLocation === 'home' ? 'En casa' : 'En el bus'}
                </span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {contextState.currentTimeHHMM} (-05:00)
                </span>
              </div>
            </form>
          </section>

          {/* Inspector de Payload JSON */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setShowJsonPayload((prev) => !prev)}
              aria-expanded={showJsonPayload}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-800"
            >
              <span className="inline-flex items-center gap-2">
                <Code2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Payload JSON enviado al modelo (ISO 8601 UTC-5)
              </span>
              {showJsonPayload ? (
                <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
              )}
            </button>
            {showJsonPayload && (
              <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(livePayload, null, 2)}
              </pre>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

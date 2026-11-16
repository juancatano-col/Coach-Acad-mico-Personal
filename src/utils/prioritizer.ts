import type {
  AcademicTask,
  CoachDecision,
  CoachPayload,
  CognitiveLoad,
  DiscardedTaskReason,
  StudentContextState,
} from '../types/coach';

const SLEEP_CUTOFF_MINUTES = 22 * 60 + 30; // 22:30 America/Bogota

export function parseTimeToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) {
    return 20 * 60 + 30;
  }
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return hours * 60 + minutes;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const clamped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(hhmm: string): string {
  const total = parseTimeToMinutes(hhmm);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function getHoursUntilDue(dueIso: string, referenceTimestampIso: string): number {
  const dueMs = Date.parse(dueIso);
  const refMs = Date.parse(referenceTimestampIso);
  if (Number.isNaN(dueMs) || Number.isNaN(refMs)) {
    return 999;
  }
  return (dueMs - refMs) / (1000 * 60 * 60);
}

export function buildCurrentTimestampIso(state: StudentContextState): string {
  const safeTime = /^\d{2}:\d{2}$/.test(state.currentTimeHHMM)
    ? state.currentTimeHHMM
    : '20:30';
  return `${state.referenceDateISO}T${safeTime}:00-05:00`;
}

export function buildCoachPayload(
  state: StudentContextState,
  tasks: AcademicTask[],
  userMessage: string
): CoachPayload {
  const pending = tasks.filter((t) => !t.completed);
  return {
    user_profile: {
      role: 'Estudiante último semestre Ingeniería de Software y Datos · Analista de Soporte TI',
      work_schedule: '08:00 - 17:00',
      commute_origin: 'Girardota (zona rural, ~2h de trayecto)',
      timezone: 'America/Bogota',
      sleep_cutoff_local: '22:30',
    },
    current_state: {
      current_energy_level: state.currentEnergyLevel,
      available_minutes: state.availableMinutes,
      user_location: state.userLocation,
      current_timestamp_iso: buildCurrentTimestampIso(state),
    },
    pending_tasks: pending.map((t) => ({
      id: t.id,
      title: t.title,
      course: t.course,
      due_iso: t.dueIso,
      cognitive_load_type: t.cognitiveLoad,
      estimated_minutes: t.estimatedMinutes,
    })),
    user_message: userMessage.trim(),
  };
}

function loadLabel(load: CognitiveLoad): string {
  if (load === 'high') return 'alta carga cognitiva';
  if (load === 'medium') return 'carga cognitiva media';
  return 'baja carga cognitiva';
}

export function evaluateDeterministicPlan(
  state: StudentContextState,
  tasks: AcademicTask[]
): CoachDecision {
  const pending = tasks.filter((t) => !t.completed);
  const currentIso = buildCurrentTimestampIso(state);
  const startMinutes = parseTimeToMinutes(state.currentTimeHHMM);

  // Calcular ventana real respetando límite nocturno 22:30 (solo si es horario nocturno >= 17:00)
  const isEvening = startMinutes >= 17 * 60;
  const minutesUntilCutoff = isEvening
    ? Math.max(0, SLEEP_CUTOFF_MINUTES - startMinutes)
    : state.availableMinutes;

  const effectiveAvailableMinutes = isEvening
    ? Math.min(state.availableMinutes, minutesUntilCutoff)
    : state.availableMinutes;

  const cutoffProtected =
    isEvening && startMinutes + state.availableMinutes > SLEEP_CUTOFF_MINUTES;

  if (pending.length === 0) {
    return {
      selectedTaskId: null,
      selectedTaskTitle: null,
      selectedCourse: null,
      selectedLoad: null,
      blockStart: formatMinutesToHHMM(startMinutes),
      blockEnd: formatMinutesToHHMM(startMinutes),
      assignedMinutes: 0,
      breakMinutes: 0,
      cutoffProtected,
      ruleApplied: 'Sin tareas pendientes registradas en el inventario.',
      instructionMessage:
        'No tienes tareas pendientes en tu inventario. Usa este bloque para descansar y recuperar energía.',
      discardedTasks: [],
      source: 'rules-engine',
    };
  }

  if (isEvening && minutesUntilCutoff < 15) {
    return {
      selectedTaskId: null,
      selectedTaskTitle: null,
      selectedCourse: null,
      selectedLoad: null,
      blockStart: formatMinutesToHHMM(startMinutes),
      blockEnd: '22:30',
      assignedMinutes: 0,
      breakMinutes: 0,
      cutoffProtected: true,
      ruleApplied: 'Protección estricta de descanso nocturno (límite 22:30 UTC-5).',
      instructionMessage:
        'Ya superaste o estás a menos de 15 minutos de tu límite nocturno de las 10:30 PM. Cierra pantallas y descansa ahora para no comprometer tu turno de soporte TI mañana.',
      discardedTasks: pending.map((t) => ({
        taskId: t.id,
        title: t.title,
        cognitiveLoad: t.cognitiveLoad,
        reason: 'Aplazada por horario límite de descanso (22:30).',
      })),
      source: 'rules-engine',
    };
  }

  const discarded: DiscardedTaskReason[] = [];
  const enriched = pending.map((task) => ({
    task,
    hoursLeft: getHoursUntilDue(task.dueIso, currentIso),
  }));

  // Orden base por urgencia (menor tiempo restante hasta la fecha de entrega)
  enriched.sort((a, b) => a.hoursLeft - b.hoursLeft);

  const isLowEnergy = state.currentEnergyLevel <= 3;
  const isModerateEnergy = state.currentEnergyLevel >= 4 && state.currentEnergyLevel <= 6;
  const inTransit = state.userLocation === 'transit';

  let ruleApplied = '';
  const eligible: typeof enriched = [];

  for (const item of enriched) {
    const { task, hoursLeft } = item;
    const isEmergency = hoursLeft <= 10;

    if (inTransit && task.cognitiveLoad === 'high') {
      discarded.push({
        taskId: task.id,
        title: task.title,
        cognitiveLoad: task.cognitiveLoad,
        reason: 'Descartada por ubicación en tránsito (bus desde Girardota): inviable programar o diseñar código complejo en desplazamiento.',
      });
      continue;
    }

    if (isLowEnergy && task.cognitiveLoad === 'high' && !isEmergency) {
      discarded.push({
        taskId: task.id,
        title: task.title,
        cognitiveLoad: task.cognitiveLoad,
        reason: `Descartada por fatiga (energía ${state.currentEnergyLevel}/10 < 4): requiere alta carga cognitiva.`,
      });
      continue;
    }

    if (isModerateEnergy && task.cognitiveLoad === 'high' && hoursLeft > 24) {
      discarded.push({
        taskId: task.id,
        title: task.title,
        cognitiveLoad: task.cognitiveLoad,
        reason: `Aplazada para bloque de alta energía (≥ 7/10): con energía ${state.currentEnergyLevel}/10 conviene proteger foco y evitar errores.`,
      });
      continue;
    }

    eligible.push(item);
  }

  // Ordenar elegibles según estado cognitivo
  if (state.currentEnergyLevel >= 7 && !inTransit) {
    ruleApplied =
      'Energía alta (≥ 7/10) en casa: priorizar tarea de alta carga cognitiva más urgente antes de que baje el foco.';
    eligible.sort((a, b) => {
      const weight = (load: CognitiveLoad) => (load === 'high' ? 0 : load === 'medium' ? 1 : 2);
      const diff = weight(a.task.cognitiveLoad) - weight(b.task.cognitiveLoad);
      return diff !== 0 ? diff : a.hoursLeft - b.hoursLeft;
    });
  } else if (inTransit) {
    ruleApplied =
      'Modo tránsito (bus): asignar micro-lectura o repaso ligero compatible con movilidad y conectividad intermitente.';
    eligible.sort((a, b) => {
      const weight = (load: CognitiveLoad) => (load === 'low' ? 0 : load === 'medium' ? 1 : 2);
      const diff = weight(a.task.cognitiveLoad) - weight(b.task.cognitiveLoad);
      return diff !== 0 ? diff : a.hoursLeft - b.hoursLeft;
    });
  } else if (isLowEnergy) {
    ruleApplied =
      'Energía baja (< 4/10): bloqueo de tareas complejas para eliminar parálisis por análisis; asignar una sola tarea ligera con hora de cierre.';
    eligible.sort((a, b) => {
      const weight = (load: CognitiveLoad) => (load === 'low' ? 0 : load === 'medium' ? 1 : 2);
      const diff = weight(a.task.cognitiveLoad) - weight(b.task.cognitiveLoad);
      return diff !== 0 ? diff : a.hoursLeft - b.hoursLeft;
    });
  } else {
    ruleApplied =
      'Energía moderada (4–6/10): priorizar entrega más cercana de carga baja o media dentro de la ventana disponible.';
  }

  // Si todas fueron descartadas (ej. solo queda una tarea high con entrega inminente o ninguna low)
  if (eligible.length === 0) {
    const fallback = enriched[0];
    const focusMinutes = Math.min(25, effectiveAvailableMinutes, fallback.task.estimatedMinutes);
    const endMinutes = startMinutes + focusMinutes;
    const blockStart = formatMinutesToHHMM(startMinutes);
    const blockEnd = formatMinutesToHHMM(endMinutes);
    return {
      selectedTaskId: fallback.task.id,
      selectedTaskTitle: fallback.task.title,
      selectedCourse: fallback.task.course,
      selectedLoad: fallback.task.cognitiveLoad,
      blockStart,
      blockEnd,
      assignedMinutes: focusMinutes,
      breakMinutes: 0,
      cutoffProtected,
      ruleApplied:
        'Excepción de inventario: solo quedan tareas pesadas; se reduce a micro-bloque de 25 min para evitar parálisis.',
      instructionMessage: `Tienes energía ${state.currentEnergyLevel}/10, pero todas tus tareas pendientes son de ${loadLabel(fallback.task.cognitiveLoad)}. Haz únicamente un micro-bloque de arranque de ${formatTime12h(blockStart)} a ${formatTime12h(blockEnd)} en "${fallback.task.title}" (${fallback.task.course}) y detente al terminar.`,
      discardedTasks: discarded.filter((d) => d.taskId !== fallback.task.id),
      source: 'rules-engine',
    };
  }

  const chosen = eligible[0].task;
  // Marcar las otras elegibles no elegidas como pospuestas para mantener UNA sola instrucción cerrada
  for (let i = 1; i < eligible.length; i++) {
    discarded.push({
      taskId: eligible[i].task.id,
      title: eligible[i].task.title,
      cognitiveLoad: eligible[i].task.cognitiveLoad,
      reason: 'Pospuesta en este bloque para garantizar una única instrucción cerrada sin opciones.',
    });
  }

  const maxSessionMinutes = isLowEnergy ? 45 : 75;
  const workMinutes = Math.min(
    chosen.estimatedMinutes,
    effectiveAvailableMinutes,
    maxSessionMinutes
  );
  const breakMinutes =
    workMinutes >= 40 && startMinutes + workMinutes + 5 <= SLEEP_CUTOFF_MINUTES ? 5 : 0;
  const endMinutes = startMinutes + workMinutes;

  const blockStart = formatMinutesToHHMM(startMinutes);
  const blockEnd = formatMinutesToHHMM(endMinutes);

  const discardedHeavy = discarded.find((d) => d.cognitiveLoad === 'high');
  const discardClause = discardedHeavy
    ? `Estás en nivel ${state.currentEnergyLevel}/10${inTransit ? ' y en trayecto' : ''}: aplaza "${discardedHeavy.title}" para un bloque de alta energía. `
    : '';
  const breakClause =
    breakMinutes > 0 ? ` Incluye una pausa de ${breakMinutes} minutos a mitad de bloque.` : '';
  const restClause = isEvening
    ? ` Al terminar a las ${formatTime12h(blockEnd)}, cierra el estudio y descansa.`
    : '';

  return {
    selectedTaskId: chosen.id,
    selectedTaskTitle: chosen.title,
    selectedCourse: chosen.course,
    selectedLoad: chosen.cognitiveLoad,
    blockStart,
    blockEnd,
    assignedMinutes: workMinutes,
    breakMinutes,
    cutoffProtected,
    ruleApplied,
    instructionMessage: `${discardClause}Hoy de ${formatTime12h(blockStart)} a ${formatTime12h(blockEnd)} ejecuta únicamente "${chosen.title}" (${chosen.course}).${breakClause}${restClause}`.trim(),
    discardedTasks: discarded,
    source: 'rules-engine',
  };
}

export interface TaskValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNewTask(input: {
  title: string;
  course: string;
  estimatedMinutes: number;
  dueDateLocal: string;
}): TaskValidationResult {
  if (!input.title.trim() || input.title.trim().length < 3) {
    return { valid: false, error: 'Ingresa un nombre de tarea válido (mínimo 3 caracteres).' };
  }
  if (!input.course.trim()) {
    return { valid: false, error: 'Indica la materia o curso correspondiente.' };
  }
  if (!Number.isFinite(input.estimatedMinutes) || input.estimatedMinutes < 10 || input.estimatedMinutes > 300) {
    return { valid: false, error: 'La duración estimada debe estar entre 10 y 300 minutos.' };
  }
  if (!input.dueDateLocal.trim()) {
    return { valid: false, error: 'Selecciona una fecha y hora límite de entrega.' };
  }
  return { valid: true };
}

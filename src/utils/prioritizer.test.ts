import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoachPayload,
  evaluateDeterministicPlan,
  validateNewTask,
} from './prioritizer';
import type { AcademicTask, StudentContextState } from '../types/coach';

const SAMPLE_TASKS: AcademicTask[] = [
  {
    id: 't1',
    title: 'Proyecto Arquitectura de Datos (Python ETL)',
    course: 'Arquitectura de Datos',
    dueIso: '2026-11-20T23:59:00-05:00',
    dueLabel: 'Viernes 23:59',
    cognitiveLoad: 'high',
    estimatedMinutes: 120,
    completed: false,
  },
  {
    id: 't2',
    title: 'Lectura de Ética Profesional (Cap. 4)',
    course: 'Ética y Ciudadanía',
    dueIso: '2026-11-17T18:00:00-05:00',
    dueLabel: 'Mañana 18:00',
    cognitiveLoad: 'low',
    estimatedMinutes: 45,
    completed: false,
  },
  {
    id: 't3',
    title: 'Taller SQL y Normalización',
    course: 'Bases de Datos II',
    dueIso: '2026-11-21T12:00:00-05:00',
    dueLabel: 'Sábado 12:00',
    cognitiveLoad: 'medium',
    estimatedMinutes: 60,
    completed: false,
  },
];

const BASE_STATE: StudentContextState = {
  currentEnergyLevel: 3,
  availableMinutes: 90,
  userLocation: 'home',
  currentTimeHHMM: '20:30',
  referenceDateISO: '2026-11-16',
};

test('discard high cognitive load task when energy is below 4 and select low load task', () => {
  const decision = evaluateDeterministicPlan(BASE_STATE, SAMPLE_TASKS);
  assert.equal(decision.selectedTaskId, 't2');
  assert.equal(decision.selectedLoad, 'low');
  assert.equal(decision.blockStart, '20:30');
  assert.equal(decision.blockEnd, '21:15');
  assert.ok(
    decision.discardedTasks.some((d) => d.taskId === 't1' && d.cognitiveLoad === 'high')
  );
});

test('prioritize high cognitive load task when energy is high and user is home', () => {
  const highEnergyState: StudentContextState = {
    ...BASE_STATE,
    currentEnergyLevel: 8,
    currentTimeHHMM: '09:00',
    availableMinutes: 120,
  };
  const decision = evaluateDeterministicPlan(highEnergyState, SAMPLE_TASKS);
  assert.equal(decision.selectedTaskId, 't1');
  assert.equal(decision.selectedLoad, 'high');
});

test('block high cognitive load tasks while in transit from Girardota', () => {
  const transitState: StudentContextState = {
    ...BASE_STATE,
    currentEnergyLevel: 6,
    userLocation: 'transit',
    currentTimeHHMM: '18:15',
    availableMinutes: 45,
  };
  const decision = evaluateDeterministicPlan(transitState, SAMPLE_TASKS);
  assert.equal(decision.selectedTaskId, 't2');
  assert.ok(decision.discardedTasks.some((d) => d.taskId === 't1'));
});

test('protect 22:30 sleep cutoff when evening block starts late', () => {
  const lateState: StudentContextState = {
    ...BASE_STATE,
    currentTimeHHMM: '22:20',
    availableMinutes: 90,
  };
  const decision = evaluateDeterministicPlan(lateState, SAMPLE_TASKS);
  assert.equal(decision.selectedTaskId, null);
  assert.equal(decision.cutoffProtected, true);
});

test('payload enforces full ISO 8601 format with America/Bogota -05:00 offset', () => {
  const payload = buildCoachPayload(BASE_STATE, SAMPLE_TASKS, 'Llegué cansado');
  assert.equal(payload.current_state.current_timestamp_iso, '2026-11-16T20:30:00-05:00');
  assert.equal(payload.user_profile.timezone, 'America/Bogota');
  assert.equal(payload.pending_tasks.length, 3);
});

test('task validator rejects empty titles and invalid durations', () => {
  assert.equal(
    validateNewTask({
      title: '  ',
      course: 'IA',
      estimatedMinutes: 30,
      dueDateLocal: '2026-11-20T18:00',
    }).valid,
    false
  );
  assert.equal(
    validateNewTask({
      title: 'Resumen de lectura',
      course: 'IA',
      estimatedMinutes: 5,
      dueDateLocal: '2026-11-20T18:00',
    }).valid,
    false
  );
  assert.equal(
    validateNewTask({
      title: 'Resumen de lectura',
      course: 'IA',
      estimatedMinutes: 35,
      dueDateLocal: '2026-11-20T18:00',
    }).valid,
    true
  );
});

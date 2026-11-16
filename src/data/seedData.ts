import type { AcademicTask, StudentContextState, TestCaseEvidence } from '../types/coach';

export const DEFAULT_CONTEXT_STATE: StudentContextState = {
  currentEnergyLevel: 3,
  availableMinutes: 90,
  userLocation: 'home',
  currentTimeHHMM: '20:30',
  referenceDateISO: '2026-11-16',
};

export const INITIAL_TASKS: AcademicTask[] = [
  {
    id: 'task-etl',
    title: 'Proyecto Arquitectura de Datos (Python ETL)',
    course: 'Arquitectura de Datos',
    dueIso: '2026-11-20T23:59:00-05:00',
    dueLabel: 'Viernes 23:59',
    cognitiveLoad: 'high',
    estimatedMinutes: 120,
    completed: false,
  },
  {
    id: 'task-etica',
    title: 'Lectura de Ética Profesional (Cap. 4)',
    course: 'Ética y Ciudadanía',
    dueIso: '2026-11-17T18:00:00-05:00',
    dueLabel: 'Mañana 18:00',
    cognitiveLoad: 'low',
    estimatedMinutes: 45,
    completed: false,
  },
  {
    id: 'task-humanidades',
    title: 'Texto de Humanidades y Sociedad',
    course: 'Humanidades',
    dueIso: '2026-11-19T20:00:00-05:00',
    dueLabel: 'Jueves 20:00',
    cognitiveLoad: 'low',
    estimatedMinutes: 30,
    completed: false,
  },
  {
    id: 'task-sql',
    title: 'Taller SQL y Normalización',
    course: 'Bases de Datos II',
    dueIso: '2026-11-21T12:00:00-05:00',
    dueLabel: 'Sábado 12:00',
    cognitiveLoad: 'medium',
    estimatedMinutes: 60,
    completed: false,
  },
  {
    id: 'task-alura',
    title: 'Módulo Alura LATAM: Python y APIs REST',
    course: 'ALURA LATAM · Backend',
    dueIso: '2026-11-22T20:00:00-05:00',
    dueLabel: 'Domingo 20:00',
    cognitiveLoad: 'medium',
    estimatedMinutes: 40,
    completed: false,
  },
];

export const SYSTEM_PROMPT_TEXT = `Eres "Coach Académico Personal", un motor determinista de toma de decisiones y coach de productividad estricto pero empático para un estudiante de último semestre de Ingeniería de Software y Datos que trabaja de 8:00 AM a 5:00 PM como analista de soporte TI, viaja ~2 horas diarias desde zona rural (Girardota) y gestiona 4 materias universitarias, módulos de ALURA LATAM y lecturas obligatorias.

OBJETIVO PRINCIPAL:
Eliminar la "fatiga por decisión" (parálisis por análisis). Nunca entregues listas largas de opciones ni consejos genéricos. Entrega UNA ÚNICA micro-instrucción cerrada, accionable y realista.

ENTRADAS QUE RECIBES EN CADA TURNO:
Recibirás un bloque JSON con:
- current_state.current_energy_level (entero 1 a 10)
- current_state.available_minutes (entero en minutos)
- current_state.user_location ("transit" | "home")
- current_state.current_timestamp_iso (formato ISO 8601 completo en America/Bogota, UTC-5)
- pending_tasks[] (título, curso, due_iso en -05:00, cognitive_load_type: "high" | "medium" | "low", estimated_minutes)
- user_message (mensaje natural del estudiante)

REGLAS ESTRICTAS DE DECISIÓN (NO NEGOCIABLES):
1. Cero positividad tóxica: Si current_energy_level < 4 o user_location == "transit", PROHIBIDO asignar tareas con cognitive_load_type == "high" (como programar ETL en Python o arquitecturas complejas), a menos que falten menos de 10 horas para la entrega. Difiere la programación compleja y prioriza tareas de baja carga cognitiva (ej. lecturas de 20 a 45 minutos).
2. Tope máximo de bloque: Ningún bloque de estudio continuo puede exceder 90 minutos.
3. Si current_energy_level >= 7 y user_location == "home", prioriza la tarea "high" más urgente para aprovechar el pico cognitivo (hasta 90 min máx.).
4. Protección de descanso y horario laboral: Nunca asignes bloques de madrugada (00:00–05:30) ni durante turno laboral (08:00–17:00 lun–vie). Ningún bloque nocturno puede superar las 22:30 (10:30 PM, America/Bogota). Si excede las 22:30, recórtalo o indica descanso inmediato.
5. Sin opciones múltiples: Selecciona solo UNA tarea. Explica brevemente qué tarea pesada se aplaza y para cuándo, fija hora exacta de inicio y fin (ej. 8:30 PM a 9:15 PM) y, si el bloque dura >= 40 minutos, incluye una pausa de 5 minutos.`;

export const TEST_CASES_EVIDENCE: TestCaseEvidence[] = [
  {
    id: 'case-1',
    label: 'Caso 1 · Llegada exhausto a Girardota',
    scenarioSummary: 'Energía 3/10 · En casa · 90 min libres · 20:30 UTC-5',
    userPrompt:
      'Acabo de llegar de Girardota después del turno de soporte TI. Tengo energía 3/10 y 1.5 horas libres antes de dormir.',
    contextSnapshot: {
      currentEnergyLevel: 3,
      availableMinutes: 90,
      userLocation: 'home',
      currentTimeHHMM: '20:30',
      referenceDateISO: '2026-11-16',
    },
    expectedDecision: {
      selectedTaskId: 'task-etica',
      selectedTaskTitle: 'Lectura de Ética Profesional (Cap. 4)',
      selectedCourse: 'Ética y Ciudadanía',
      selectedLoad: 'low',
      blockStart: '20:30',
      blockEnd: '21:15',
      assignedMinutes: 45,
      breakMinutes: 5,
      cutoffProtected: false,
      ruleApplied:
        'Energía baja (< 4/10): descarte automático de tarea high (Python ETL) y asignación única de lectura urgente.',
      instructionMessage:
        'Estás en nivel 3/10: aplaza "Proyecto Arquitectura de Datos (Python ETL)" para tu bloque de alta energía del sábado. Hoy de 8:30 PM a 9:15 PM ejecuta únicamente "Lectura de Ética Profesional (Cap. 4)" (Ética y Ciudadanía). Incluye una pausa de 5 minutos a mitad de bloque. Al terminar a las 9:15 PM, cierra el estudio y descansa.',
      discardedTasks: [
        {
          taskId: 'task-etl',
          title: 'Proyecto Arquitectura de Datos (Python ETL)',
          cognitiveLoad: 'high',
          reason: 'Descartada por fatiga (energía 3/10 < 4).',
        },
        {
          taskId: 'task-humanidades',
          title: 'Texto de Humanidades y Sociedad',
          cognitiveLoad: 'low',
          reason: 'Pospuesta para mantener una única instrucción cerrada (vence después).',
        },
      ],
      source: 'rules-engine',
    },
  },
  {
    id: 'case-2',
    label: 'Caso 2 · En el bus con trayecto largo',
    scenarioSummary: 'Energía 5/10 · En tránsito · 45 min libres · 18:15 UTC-5',
    userPrompt:
      'Voy saliendo en el bus hacia Girardota, tengo energía 5/10 y unos 45 minutos estables de trayecto.',
    contextSnapshot: {
      currentEnergyLevel: 5,
      availableMinutes: 45,
      userLocation: 'transit',
      currentTimeHHMM: '18:15',
      referenceDateISO: '2026-11-16',
    },
    expectedDecision: {
      selectedTaskId: 'task-etica',
      selectedTaskTitle: 'Lectura de Ética Profesional (Cap. 4)',
      selectedCourse: 'Ética y Ciudadanía',
      selectedLoad: 'low',
      blockStart: '18:15',
      blockEnd: '19:00',
      assignedMinutes: 45,
      breakMinutes: 5,
      cutoffProtected: false,
      ruleApplied:
        'Modo tránsito (bus): bloqueo de tareas de código pesado y aprovechamiento de lectura ligera.',
      instructionMessage:
        'Estás en nivel 5/10 y en trayecto: aplaza "Proyecto Arquitectura de Datos (Python ETL)" para un bloque estable en casa. Hoy de 6:15 PM a 7:00 PM ejecuta únicamente "Lectura de Ética Profesional (Cap. 4)" (Ética y Ciudadanía). Incluye una pausa de 5 minutos para descansar la vista.',
      discardedTasks: [
        {
          taskId: 'task-etl',
          title: 'Proyecto Arquitectura de Datos (Python ETL)',
          cognitiveLoad: 'high',
          reason: 'Inviable programar arquitectura ETL en bus interurbano.',
        },
        {
          taskId: 'task-sql',
          title: 'Taller SQL y Normalización',
          cognitiveLoad: 'medium',
          reason: 'Pospuesta: requiere entorno de base de datos en computador.',
        },
      ],
      source: 'rules-engine',
    },
  },
];

export const FLOW_MAPPING_STEPS = [
  {
    step: '01. Quién lo usa',
    title: 'Usuario Principal y Contexto Real',
    actor: 'Estudiante universitario que trabaja tiempo completo (Soporte TI, 8 AM – 5 PM) y enfrenta trayectos interurbanos de ~2 horas desde zona rural (Girardota).',
    painPoint: 'Sufre "fatiga por decisión" al llegar a casa: pierde hasta 45 minutos decidiendo por dónde empezar en una ventana libre de 2 horas.',
    dataConstraint: 'Uso inicialmente personal; si escala a compañeros de la universidad, aplica Ley 1581 de 2012 sobre datos sensibles (fatiga y rutinas de ubicación).',
  },
  {
    step: '02. Qué información entra (Inputs)',
    title: 'Captura Híbrida: Lenguaje Natural + Calendario',
    actor: 'Mensaje corto por bot de Telegram / interfaz web móvil ("Energía 3/10, 90 min libres, en casa") + inventario sincronizado de Google Calendar y sílabos.',
    painPoint: 'El usuario fatigado no quiere llenar formularios complejos; solo reporta 3 variables rápidas mientras la capa backend adjunta sus tareas pendientes.',
    dataConstraint: 'Payload JSON estructurado con zona horaria forzada America/Bogota (UTC-5) y formato ISO 8601 completo (YYYY-MM-DDTHH:MM:SS-05:00).',
  },
  {
    step: '03. Cómo interviene la IA (Procesamiento)',
    title: 'Motor de Descarte Determinista + Encuadre Estricto',
    actor: 'Pre-validación en backend (reglas duras de carga cognitiva y corte nocturno 22:30) + Gemini con System Prompt de Coach estricto y esquema JSON obligatorio.',
    painPoint: 'Evita el sesgo de "positividad tóxica" (que la IA mande a programar ETL complejo a las 9:00 PM con energía 3/10).',
    dataConstraint: 'Razonamiento acotado (ThinkingLevel.LOW) y validación post-respuesta para garantizar que nunca se agenden bloques durante turnos laborales ni de madrugada.',
  },
  {
    step: '04. Qué resultado entrega (Outputs)',
    title: 'Micro-Instrucción Única Cerrada (Sin Opciones)',
    actor: 'Un único bloque horario ejecutable (ej. 8:30 PM – 9:15 PM), tarea exacta, pausa Pomodoro de 5 min, explicación breve del descarte y hora límite de descanso.',
    painPoint: 'Elimina las listas de 5 opciones para que el estudiante arranque en menos de 2 minutos sin desgaste cognitivo adicional.',
    dataConstraint: 'Registro inmediato en el historial del chat y actualización visual del bloque activo.',
  },
];

export const FIGMA_SCREENS_SPEC = [
  {
    screenNumber: 'Pantalla 01',
    name: 'Check-in Rápido de Estado (Bot / Móvil)',
    goal: 'Capturar energía, tiempo libre y ubicación en menos de 15 segundos sin fricción.',
    elements: [
      'Encabezado limpio con hora local (America/Bogota UTC-5) y resumen de próxima entrega crítica.',
      'Selector numérico táctil de Energía Actual (1 al 10) con etiqueta descriptiva (ej. "3/10 · Fatiga alta").',
      'Botones segmentados de Ubicación ("En el bus · Girardota" / "En casa").',
      'Selector rápido de Tiempo Disponible (30, 45, 60, 90, 120 min) y caja de texto libre para mensaje natural.',
      'Botón primario único: "Decidir mi bloque ahora".',
    ],
  },
  {
    screenNumber: 'Pantalla 02',
    name: 'Micro-Instrucción Única Cerrada (Salida IA)',
    goal: 'Entregar una sola orden clara eliminando la parálisis por análisis.',
    elements: [
      'Tarjeta protagonista con horario exacto en tipografía tabular (ej. "20:30 — 21:15") y nombre de la única tarea asignada.',
      'Indicador explícito de pausa incluida ("Pausa de 5 min a la mitad") y alerta de límite nocturno ("Cierre obligatorio: 22:30").',
      'Bloque colapsable "Por qué descarté las demás" mostrando que la tarea de Python ETL se movió al sábado.',
      'Dos únicas acciones al pie: "Iniciar bloque" y "Ya terminé / Reevaluar".',
    ],
  },
  {
    screenNumber: 'Pantalla 03',
    name: 'Inventario de Tareas y Reglas de Carga Cognitiva',
    goal: 'Alimentar y auditar las variables que cruza el modelo (simulando Google Calendar + Sílabos).',
    elements: [
      'Tabla compacta con columnas: Tarea, Curso, Fecha límite (ISO -05:00), Carga cognitiva (Alta / Media / Baja) y Duración estimada.',
      'Formulario lateral o modal de "Agregar tarea" con validación estricta de campos.',
      'Interruptor de cumplimiento y aviso de privacidad (Ley 1581 de 2012) para datos de fatiga y ubicación.',
    ],
  },
];

export const PITCH_EXPOSURE_TEXT =
  'Para combatir la fatiga por decisión de los estudiantes que trabajamos tiempo completo y viajamos desde zonas rurales, diseñamos el Coach Académico Personal: un agente inteligente que cruza nuestro nivel de energía real, ubicación y calendario académico mediante un motor de descarte estricto con IA generativa. En lugar de listas abrumadoras o planes utópicos, entrega una única micro-instrucción horaria ejecutable en menos de dos minutos y protege el descanso nocturno. Así transformamos la incertidumbre de las noches agotadoras en entregas oportunas y estudio sostenible.';

export const GOVERNANCE_CHECKS = [
  {
    topic: 'Ley 1581 de 2012 (Protección de Datos)',
    detail:
      'Los niveles diarios de fatiga/salud mental y rutinas de ubicación (Girardota/ciudad) son datos sensibles. Si la herramienta escala más allá del uso personal, exige aviso de privacidad, consentimiento previo, expreso e informado, y mecanismos para ejercer derechos ARCO (Conocer, Actualizar, Rectificar y Suprimir).',
  },
  {
    topic: 'Control de Alucinaciones y Zona Horaria (ISO 8601)',
    detail:
      'Todos los timestamps se fuerzan a America/Bogota (YYYY-MM-DDTHH:MM:SS-05:00) antes y después de la llamada al LLM, evitando bloques en horarios de madrugada o durante turnos laborales.',
  },
  {
    topic: 'Control de Cuotas (Rate Limits) de APIs',
    detail:
      'El backend mantiene caché local del inventario de Google Calendar y solo invoca al modelo bajo demanda explícita del usuario en cada check-in.',
  },
];

export const USER_STORIES = [
  {
    role: 'Estudiante trabajador (Usuario principal)',
    story:
      'Como estudiante de último semestre que trabaja tiempo completo en soporte TI y viaja 2 horas desde Girardota, quiero reportar mi nivel de energía y tiempo libre en menos de 15 segundos para recibir una única tarea realista y acotada que elimine la fatiga por decisión.',
  },
  {
    role: 'Administrador / Estudiante configurando su agenda',
    story:
      'Como responsable de mis entregas académicas, quiero registrar mis tareas con fecha límite ISO 8601 y nivel de carga cognitiva (alta, media o baja) para garantizar que la IA nunca me asigne programación compleja cuando llego agotado en la noche.',
  },
];

export const DIPLOMADO_TECHNIQUES_TABLE = [
  {
    technique: 'Encuadre (Prompt Engineering) y asignación de rol',
    where: 'System Prompt del backend (/api/coach y Google AI Studio)',
    why: 'Asigna el rol de "Coach de productividad estricto y empático" con reglas explícitas que prohíben asignar tareas pesadas con energía < 4/10, evitando el sesgo de positividad tóxica.',
  },
  {
    technique: 'Control de parámetros y salida estructurada (Schema JSON)',
    where: 'Configuración de Gemini (ThinkingLevel.LOW + responseSchema)',
    why: 'Hace que el modelo actúe de forma determinista y lógica al calcular horarios exactos (20:30–21:15) y devuelva campos validados sin texto ornamental.',
  },
  {
    technique: 'Procesamiento de Lenguaje Natural (PLN) / Extracción de entidades',
    where: 'Simulador Conversacional (Bot Móvil) y parser de mensajes',
    why: 'Interpreta mensajes cortos escritos bajo cansancio ("llegué agotado, 3/10, 1.5h") para cruzarlos con las entidades estructuradas del calendario.',
  },
  {
    technique: 'Arquitectura Transformer y gestión de ventana de contexto',
    where: 'Payload JSON inyectado en cada turno',
    why: 'Mantiene presentes de forma permanente las restricciones fijas del usuario (horario laboral 8–5, trayecto Girardota, límite nocturno 22:30 UTC-5) durante toda la conversación.',
  },
];


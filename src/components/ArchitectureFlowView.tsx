import { useState } from 'react';
import { ArrowRight, GitBranch } from 'lucide-react';
import { FLOW_MAPPING_STEPS } from '../data/seedData';
import type { CoachPayload } from '../types/coach';

interface ArchitectureFlowViewProps {
  livePayload: CoachPayload;
  onGoToPrototype: () => void;
}

const STAGE_SUMMARIES = [
  {
    title: '1. Entrada del usuario',
    text: 'El estudiante reporta desde su celular o interfaz web su estado actual: nivel de energía (1–10), tiempo disponible, ubicación (en casa o en el bus desde Girardota) y un mensaje breve en lenguaje natural.',
  },
  {
    title: '2. Procesamiento de datos',
    text: 'El backend normaliza el mensaje junto con el inventario de tareas pendientes (fechas límite ISO 8601 en zona America/Bogota UTC-5, carga cognitiva y duración), aplicando filtros previos para proteger el límite nocturno de las 22:30.',
  },
  {
    title: '3. Intervención de la IA',
    text: 'El modelo de lenguaje grande (LLM) opera mediante Encuadre (System Prompt de coach estricto), Control de parámetros (razonamiento acotado) y esquema JSON obligatorio para descartar tareas pesadas bajo fatiga.',
  },
  {
    title: '4. Salida final, revisión humana y ruta alternativa',
    text: 'Entrega una única micro-instrucción horaria cerrada que el estudiante valida antes de ejecutar. Si la IA falla, no tiene conexión en zona rural o no encuentra tareas viables, se activa la ruta alternativa del motor determinista local o el aviso explícito de descanso.',
  },
];

export function ArchitectureFlowView({
  livePayload,
  onGoToPrototype,
}: ArchitectureFlowViewProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
            Paso 1 · Mapeo del Flujo del Usuario
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Arquitectura de decisión de extremo a extremo: quién opera el sistema, qué variables estructuradas ingresan, cómo actúa el encuadre de IA y qué resultado cerrado entrega.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToPrototype}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          Probar flujo en vivo
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </section>

      {/* Diagrama visual del flujo básico de funcionamiento */}
      <section
        aria-labelledby="heading-flow-diagram"
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="heading-flow-diagram"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Diagrama de Flujo Básico de Funcionamiento
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Entrada del usuario → Procesamiento → Intervención de la IA → Salida final (con revisión humana y ruta alternativa).
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">Diagrama del proyecto</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {!imgError ? (
            <img
              src="/src/assets/images/flujo_coach_final_1794859080211.jpg"
              alt="Diagrama de flujo del Coach Académico Personal con IA mostrando Entrada del Usuario, Procesamiento de Datos, Intervención de la IA con LLM, Encuadre y JSON, Salida Final, Revisión Humana y Ruta Alternativa"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-auto w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-600">
              <GitBranch className="h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="text-sm font-medium">
                Diagrama: Flujo del Coach Académico Personal con IA
              </p>
              <p className="text-xs text-slate-500">
                Entrada del Usuario → Procesamiento → Intervención IA (LLM) → Salida Final
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
          {STAGE_SUMMARIES.map((stage) => (
            <div key={stage.title} className="rounded-lg bg-slate-50 p-4">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                {stage.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {stage.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Los 4 pasos clave en grilla limpia */}
      <section
        aria-label="Las 4 etapas del flujo del usuario"
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        {FLOW_MAPPING_STEPS.map((item) => (
          <article
            key={item.step}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <p className="text-xs font-semibold text-blue-700">{item.step}</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-slate-900">
              {item.title}
            </h2>
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Mecanismo: </span>
                {item.actor}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Problema que resuelve: </span>
                {item.painPoint}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Regla técnica / datos: </span>
                {item.dataConstraint}
              </p>
            </div>
          </article>
        ))}
      </section>

      {/* Esquema de datos en vivo */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Contrato JSON de Entrada (Actualizado con tu estado actual)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Implementación corregida respecto a la Actividad 1: fechas completas ISO 8601 con zona horaria America/Bogota (-05:00).
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500">application/json · UTC-5</span>
        </div>

        <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
          {JSON.stringify(livePayload, null, 2)}
        </pre>
      </section>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ClientCommunicationAssistantProps {
  technicalNotes: string;
  onApplyExplanation?: (explanation: string) => void;
  className?: string;
}

export const ClientCommunicationAssistant: React.FC<ClientCommunicationAssistantProps> = ({
  technicalNotes,
  onApplyExplanation,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!technicalNotes || !technicalNotes.trim()) {
      toast.warning('Ingresa un detalle o nota técnica para generar la explicación al cliente.');
      return;
    }

    setLoading(true);
    setExplanation('');
    try {
      const { streamDiagnosis } = await import('@/lib/diagnosis');
      const prompt = `Actúa como un Asesor de Servicio de un taller mecánico profesional. Convierte esta nota técnica de inspección en una explicación comercial, empática, clara y persuasiva para el cliente final (sin modismos médicos ni tecnicismos complejos), explicando el motivo y el riesgo de no reparar. Nota técnica: "${technicalNotes}"`;
      
      let resultText = '';
      await streamDiagnosis(prompt, (chunk) => {
        resultText = chunk;
        setExplanation(chunk);
      });

      if (onApplyExplanation && resultText) {
        onApplyExplanation(resultText);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Error al generar la explicación: ' + (e.message || 'Desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    toast.success('Explicación copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border p-4 bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344] light:bg-white light:border-[#D8E1E8] light:text-[#17202A] ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
            Asistente de Explicación al Cliente (Gemini AI)
          </h4>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <span>Redactando...</span>
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Generar Explicación</span>
            </>
          )}
        </button>
      </div>

      {explanation && (
        <div className="mt-3 pt-3 border-t border-slate-800 dark:border-slate-800 light:border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed italic bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 p-3 rounded-lg border border-slate-800/80 light:border-slate-200">
              "{explanation}"
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
              title="Copiar texto"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Send, X, Star } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const BetaFeedbackModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<'suggestion' | 'bug' | 'praise'>('suggestion');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, userProfile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.warning('Por favor escribe tu comentario o sugerencia.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'N/A',
        workshopId: userProfile?.workshopId || 'demo-workshop',
        category,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        pageUrl: typeof window !== 'undefined' ? window.location.pathname : '',
      });

      toast.success('¡Gracias por tus comentarios! Nos ayudan a mejorar SGA.');
      setComment('');
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al enviar comentarios: ' + (err.message || 'Desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Botón flotante discreto */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 px-3.5 py-2 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 transition-transform hover:scale-105"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span>Feedback Beta</span>
      </button>

      {/* Modal Interactivo */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344] light:bg-white light:border-[#D8E1E8] light:text-[#17202A]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
              Sugerencia o Comentario Beta
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 mt-1">
              Tu opinión es muy importante para hacer crecer SGA Garage OS.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Categoría */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tipo de Comentario
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('suggestion')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      category === 'suggestion'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    💡 Sugerencia
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('bug')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      category === 'bug'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    🐛 Reportar Falla
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('praise')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      category === 'praise'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⭐ Felicitación
                  </button>
                </div>
              </div>

              {/* Calificación por estrellas */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Calificación de la Experiencia
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 rounded transition-transform hover:scale-110 ${
                        star <= rating ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comentario */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tu Mensaje *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Qué te gustaría ver en SGA? ¿Encontraste algún detalle?"
                  rows={4}
                  className="w-full rounded-lg border p-3 text-xs bg-slate-900 border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Enviando...' : 'Enviar Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

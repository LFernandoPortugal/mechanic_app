"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PenLine, Trash2, CheckCircle2 } from "lucide-react";

interface SignatureCanvasProps {
  /** Called with the base-64 PNG data URL when the user confirms. */
  onConfirm: (dataUrl: string) => void;
  /** Called when the signature is cleared. */
  onClear?: () => void;
  /** Already-confirmed signature URL (for display mode). */
  confirmedUrl?: string;
}

export function SignatureCanvas({ onConfirm, onClear, confirmedUrl }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing]     = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [confirmed, setConfirmed] = useState(!!confirmedUrl);

  // ── Canvas setup ───────────────────────────────────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match display resolution for crisp rendering on HiDPI
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#10b981"; // emerald-500
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

  // ── Pointer helpers ────────────────────────────────────────
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (confirmed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || confirmed) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const onPointerUp = () => setDrawing(false);

  // ── Actions ────────────────────────────────────────────────
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    setConfirmed(false);
    onClear?.();
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    const dataUrl = canvas.toDataURL("image/png");
    setConfirmed(true);
    onConfirm(dataUrl);
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${confirmed
            ? "border-emerald-500 bg-emerald-950/20"
            : hasStrokes
              ? "border-emerald-600/70 bg-zinc-950/40"
              : "border-border bg-zinc-950/20 hover:border-muted-foreground"
          }`}
        style={{ height: 140 }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ cursor: confirmed ? "default" : "crosshair" }}
        />

        {/* Placeholder text */}
        {!hasStrokes && !confirmed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 select-none">
            <PenLine className="w-6 h-6 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground/60">
              Firme aquí (toque o mouse)
            </span>
          </div>
        )}

        {/* Confirmed overlay */}
        {confirmed && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 text-xs font-semibold rounded-full px-2.5 py-1 pointer-events-none">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Firma confirmada
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {!confirmed ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clear}
              disabled={!hasStrokes}
              className="gap-1.5 border-border text-muted-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirm}
              disabled={!hasStrokes}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmar Firma
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clear}
            className="gap-1.5 border-border text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Volver a firmar
          </Button>
        )}
      </div>
    </div>
  );
}

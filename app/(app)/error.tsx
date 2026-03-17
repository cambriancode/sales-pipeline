'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-rose-600">Algo salió mal / Something went wrong</p>
      <h2 className="text-2xl font-semibold text-slate-900">No pudimos completar esa acción.</h2>
      <p className="text-sm text-slate-600">
        Intenta nuevamente. Si el problema persiste, vuelve al dashboard y repite el flujo. / Try again. If the problem persists, go back to the dashboard and retry the flow.
      </p>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
          Reintentar / Retry
        </button>
        <a href="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">
          Ir al dashboard / Go to dashboard
        </a>
      </div>
      {error.digest ? <p className="text-xs text-slate-400">Digest: {error.digest}</p> : null}
    </div>
  );
}

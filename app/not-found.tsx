import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">404</p>
      <h1 className="text-3xl font-semibold text-slate-900">No encontramos esa página</h1>
      <p className="text-sm text-slate-600">
        La ruta no existe o el contenido ya no está disponible. Vuelve al dashboard para continuar trabajando.
      </p>
      <Link href="/dashboard" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
        Ir al dashboard
      </Link>
    </div>
  );
}

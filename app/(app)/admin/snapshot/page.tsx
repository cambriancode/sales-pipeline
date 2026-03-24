import { PageHeader } from '@/components/page-header';
import { requireAdminProfile } from '@/components/admin/admin-guard';
import { Card, SectionTitle } from '@/components/ui';
import { getI18n } from '@/lib/i18n';

export default async function AdminSnapshotPage() {
  await requireAdminProfile();
  const { locale, t } = await getI18n();

  const labels = locale === 'es'
    ? {
        what: 'Qué incluye',
        whatDescription: 'Snapshot administrativo descargable para conservar el estado operativo antes de limpiar datos o mover de entorno.',
        includes: [
          'Todas las tablas operativas y de catálogo en archivos JSON separados.',
          'Usuarios de Supabase Auth exportados desde el lado servidor.',
          'Manifiesto de archivos/documentos para saber qué existe en Storage.',
        ],
        limitations: 'Limitaciones importantes',
        limitationsDescription: 'Este snapshot está pensado como exportación operativa rápida, no como sustituto perfecto de backups gestionados por plataforma.',
        limits: [
          'No incluye los binarios reales de Storage; solo el manifiesto y la metadata documental.',
          'Debe descargarse y resguardarse fuera del sistema.',
          'La restauración debe respetar el orden de tablas indicado en el manifest.',
        ],
        button: 'Descargar snapshot (.zip)',
        caution: 'Solo administración puede generar este archivo. Contiene datos sensibles del CRM.',
      }
    : {
        what: 'What is included',
        whatDescription: 'Downloadable admin snapshot to preserve the current operational state before wiping data or moving environments.',
        includes: [
          'All operational and catalog tables in separate JSON files.',
          'Supabase Auth users exported server-side.',
          'A document/file manifest so you know what exists in Storage.',
        ],
        limitations: 'Important limitations',
        limitationsDescription: 'This snapshot is designed as a practical operational export, not a perfect replacement for managed platform backups.',
        limits: [
          'It does not include Storage binaries; only the manifest and document metadata.',
          'It should be downloaded and stored outside the system.',
          'Any restore must follow the table order listed in the manifest.',
        ],
        button: 'Download snapshot (.zip)',
        caution: 'Only admins can generate this archive. It contains sensitive CRM data.',
      };

  return (
    <div className="space-y-8">
      <PageHeader title={t.admin.snapshot.title} description={t.admin.snapshot.description} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title={labels.what} description={labels.whatDescription} />
          <ul className="space-y-2 text-sm text-slate-700">
            {labels.includes.map((item) => (
              <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">• {item}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <SectionTitle title={labels.limitations} description={labels.limitationsDescription} />
          <ul className="space-y-2 text-sm text-slate-700">
            {labels.limits.map((item) => (
              <li key={item} className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">• {item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t.admin.snapshot.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{labels.caution}</p>
          </div>
          <a
            href="/api/admin/export-snapshot"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            {labels.button}
          </a>
        </div>
      </Card>
    </div>
  );
}

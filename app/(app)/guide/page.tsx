import { Card, Pill, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { getCurrentProfile } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';

function Bullet({ children }: { children: React.ReactNode }) {
  return <li className="text-sm leading-6 text-slate-700">{children}</li>;
}

export default async function GuidePage() {
  const { locale } = await getI18n();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === 'admin';

  const copy = locale === 'es'
    ? {
        title: 'Guía de uso',
        description: 'Reglas operativas y buenas prácticas para mantener el pipeline útil, confiable y accionable.',
        whoFor: 'Pensado para gerentes de cuenta, finanzas y administración.',
        openRules: 'Cómo mantener oportunidades abiertas',
        timelineRules: 'Cómo usar el timeline comercial',
        closeRules: 'Cómo cerrar correctamente',
        adminRules: 'Facultades de administración',
        principle1: 'Toda oportunidad abierta debe tener una próxima acción y una fecha compromiso.',
        principle2: 'El valor esperado debe actualizarse conforme avance la negociación.',
        principle3: 'La etapa y probabilidad deben reflejar la realidad comercial actual, no una aspiración.',
        timeline1: 'Las actividades registran lo que ya ocurrió: llamada, reunión, correo, cotización, nota interna, etc.',
        timeline2: 'Los gerentes de cuenta pueden agregar actividades, pero no deben editar ni borrar el historial.',
        timeline3: 'Si una actividad requiere seguimiento futuro, captura “siguiente paso” y fecha para generar tarea.',
        close1: 'Ganada, perdida o en pausa son estados de cierre operativo; no se eliminan oportunidades.',
        close2: 'Una oportunidad ganada o perdida queda cerrada para gerentes de cuenta y ya no debe reclasificarse.',
        close3: 'Una oportunidad en pausa puede reactivarse con una nueva próxima acción y fecha.',
        admin1: 'Administración puede corregir capturas erróneas, gestionar accesos y mantener catálogo y configuración.',
        admin2: 'Solo administración puede eliminar actividades registradas por error y corregir cierres finales.',
        tips: 'Buenas prácticas diarias',
        tip1: 'Revisa Tareas al inicio del día y limpia vencidos antes de abrir nuevas oportunidades.',
        tip2: 'Usa valores realistas. Un pipeline confiable es más útil que uno inflado.',
        tip3: 'Vincula productos/servicios desde etapas avanzadas para mejorar forecast y handoff.',
        adminBadge: 'Admin con corrección total',
        userBadge: 'Historial comercial con trazabilidad',
      }
    : {
        title: 'How to use the system',
        description: 'Operating rules and practical guidance to keep the pipeline useful, trustworthy and actionable.',
        whoFor: 'Designed for account managers, finance supervisors and administrators.',
        openRules: 'How to maintain open opportunities',
        timelineRules: 'How to use the commercial timeline',
        closeRules: 'How to close correctly',
        adminRules: 'Administrator authority',
        principle1: 'Every open opportunity must always have a next action and due date.',
        principle2: 'Expected value must be updated as negotiation evolves.',
        principle3: 'Stage and probability should reflect current commercial reality, not wishful thinking.',
        timeline1: 'Activities record what already happened: call, meeting, email, quote, internal note, etc.',
        timeline2: 'Account managers may add activities, but should not edit or delete historical records.',
        timeline3: 'If an activity creates future follow-up, capture “next step” and due date so a task is created.',
        close1: 'Won, lost and on hold are operational close states; opportunities are not deleted.',
        close2: 'Won or lost opportunities become closed for account managers and should not be reclassified later.',
        close3: 'An on-hold opportunity may be reactivated with a new next action and due date.',
        admin1: 'Admins can correct bad captures, manage access, and maintain catalog and configuration.',
        admin2: 'Only admins should delete mistaken activities or correct final close outcomes.',
        tips: 'Daily good practice',
        tip1: 'Start the day from Tasks and clear overdue follow-up before opening new opportunities.',
        tip2: 'Use realistic values. A trustworthy pipeline beats an inflated one.',
        tip3: 'Link products/services from later stages onward to improve forecast and handoff quality.',
        adminBadge: 'Admin with full correction rights',
        userBadge: 'Commercial history with accountability',
      };

  return (
    <div className="space-y-8">
      <PageHeader title={copy.title} description={copy.description} />
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone={isAdmin ? 'emerald' : 'sky'}>{isAdmin ? copy.adminBadge : copy.userBadge}</Pill>
          <p className="text-sm text-slate-600">{copy.whoFor}</p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title={copy.openRules} />
          <ul className="mt-4 space-y-2">
            <Bullet>{copy.principle1}</Bullet>
            <Bullet>{copy.principle2}</Bullet>
            <Bullet>{copy.principle3}</Bullet>
          </ul>
        </Card>

        <Card className="p-6">
          <SectionTitle title={copy.timelineRules} />
          <ul className="mt-4 space-y-2">
            <Bullet>{copy.timeline1}</Bullet>
            <Bullet>{copy.timeline2}</Bullet>
            <Bullet>{copy.timeline3}</Bullet>
          </ul>
        </Card>

        <Card className="p-6">
          <SectionTitle title={copy.closeRules} />
          <ul className="mt-4 space-y-2">
            <Bullet>{copy.close1}</Bullet>
            <Bullet>{copy.close2}</Bullet>
            <Bullet>{copy.close3}</Bullet>
          </ul>
        </Card>

        <Card className="p-6">
          <SectionTitle title={copy.adminRules} />
          <ul className="mt-4 space-y-2">
            <Bullet>{copy.admin1}</Bullet>
            <Bullet>{copy.admin2}</Bullet>
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle title={copy.tips} />
        <ul className="mt-4 grid gap-2 lg:grid-cols-3">
          <Bullet>{copy.tip1}</Bullet>
          <Bullet>{copy.tip2}</Bullet>
          <Bullet>{copy.tip3}</Bullet>
        </ul>
      </Card>
    </div>
  );
}

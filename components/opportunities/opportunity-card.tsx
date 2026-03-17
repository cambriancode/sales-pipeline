import Link from 'next/link';
import { Card, Pill } from '@/components/ui';

function stageTone(probability: number) {
  if (probability >= 80) return 'emerald';
  if (probability >= 60) return 'sky';
  if (probability >= 30) return 'amber';
  return 'slate';
}

export function OpportunityCard({
  item,
  labels,
}: {
  item: {
    id: string;
    title: string;
    account: string;
    stage: string;
    probability: number;
    annualValue: number;
    weightedValue: number;
    nextActionDate: string | null;
    nextAction?: string | null;
  };
  labels: {
    annualValue: string;
    weighted: string;
    nextAction: string;
    view: string;
  };
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{item.account}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.title}</h3>
        </div>
        <Pill tone={stageTone(item.probability)}>{item.stage}</Pill>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">{labels.annualValue}</p>
          <p className="text-sm font-semibold">{item.annualValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{labels.weighted}</p>
          <p className="text-sm font-semibold">{item.weightedValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{labels.nextAction}</p>
          <p className="text-sm font-semibold">{item.nextActionDate ?? '—'}</p>
        </div>
      </div>
      {item.nextAction ? <p className="mt-3 text-sm text-slate-600">{item.nextAction}</p> : null}
      <div className="mt-4">
        <Link href={`/opportunities/${item.id}`} className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline">
          {labels.view}
        </Link>
      </div>
    </Card>
  );
}

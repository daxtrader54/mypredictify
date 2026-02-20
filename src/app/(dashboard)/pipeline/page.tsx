import { PipelineStatus } from '@/components/pipeline/pipeline-status';
import { Workflow } from 'lucide-react';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Pipeline | MyPredictify',
  description: 'Prediction pipeline status and performance metrics',
};

export default async function PipelinePage() {
  const session = await getSession();
  if (!isAdmin(session?.user?.email)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <Workflow className="h-5 w-5 text-cyan-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            Automated prediction pipeline status and performance metrics
          </p>
        </div>
      </div>
      <PipelineStatus />
    </div>
  );
}

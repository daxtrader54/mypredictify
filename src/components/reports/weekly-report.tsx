import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WeeklyReportProps {
  content: string;
}

export function WeeklyReport({ content }: WeeklyReportProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-table:text-sm prose-th:text-left prose-td:py-1.5 prose-th:py-2 prose-th:px-3 prose-td:px-3 prose-table:border prose-th:border prose-td:border prose-th:bg-muted/50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}

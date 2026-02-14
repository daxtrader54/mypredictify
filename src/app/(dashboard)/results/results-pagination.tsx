'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResultsPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ResultsPagination({ currentPage, totalPages }: ResultsPaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      {currentPage > 1 ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/results?page=${currentPage - 1}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
      )}

      <span className="text-sm text-muted-foreground px-3">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/results?page=${currentPage + 1}`}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

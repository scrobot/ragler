'use client';

import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Session</ToolbarPageTitle>
          <ToolbarDescription>Edit chunks for session {id}</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Link href={`/sessions/${id}/preview`}>
            <Button>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </Link>
        </ToolbarActions>
      </Toolbar>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Session chunk editor will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

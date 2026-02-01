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
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function SourcesPage() {
  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Sources</ToolbarPageTitle>
          <ToolbarDescription>View and manage ingested sources</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Link href="/sources/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Source
            </Button>
          </Link>
        </ToolbarActions>
      </Toolbar>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            No sources yet. Create your first source to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

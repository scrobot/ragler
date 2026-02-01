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
import { Trash2 } from 'lucide-react';
import { use } from 'react';

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Collection</ToolbarPageTitle>
          <ToolbarDescription>Browse chunks in collection {id}</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </ToolbarActions>
      </Toolbar>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Collection chunks will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

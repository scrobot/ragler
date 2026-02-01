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

export default function CollectionsPage() {
  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Collections</ToolbarPageTitle>
          <ToolbarDescription>Manage knowledge collections</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Link href="/collections/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </Link>
        </ToolbarActions>
      </Toolbar>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            No collections yet. Create your first collection to organize
            knowledge.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

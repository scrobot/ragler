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
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function SessionPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Preview</ToolbarPageTitle>
          <ToolbarDescription>
            Review changes before publishing
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Link href={`/sessions/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
          </Link>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </ToolbarActions>
      </Toolbar>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Preview of chunks will be displayed here before publishing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

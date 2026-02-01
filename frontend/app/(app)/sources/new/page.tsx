'use client';

import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-1/components/toolbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Globe, Link2 } from 'lucide-react';

export default function NewSourcePage() {
  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>New Source</ToolbarPageTitle>
          <ToolbarDescription>
            Choose a source type to ingest content
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <FileText className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Manual</CardTitle>
            <CardDescription>
              Enter text content directly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Paste or type content manually for chunking and enrichment.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <Link2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Confluence</CardTitle>
            <CardDescription>
              Import from Confluence page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enter a Confluence page URL or page ID to import content.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <Globe className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Web URL</CardTitle>
            <CardDescription>
              Fetch content from a URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Provide a web URL to fetch and process content.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

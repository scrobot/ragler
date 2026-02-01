'use client';

import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-1/components/toolbar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewCollectionPage() {
  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>New Collection</ToolbarPageTitle>
          <ToolbarDescription>
            Create a new knowledge collection
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
          <CardDescription>
            Define the name and purpose of your collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Product Documentation"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose and audience of this collection..."
              maxLength={500}
              rows={4}
            />
          </div>
          <Button className="w-full">Create Collection</Button>
        </CardContent>
      </Card>
    </div>
  );
}

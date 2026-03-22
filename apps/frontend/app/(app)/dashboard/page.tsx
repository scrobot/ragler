'use client';

import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/api/collections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, FileText, Plus, Server } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-1/components/toolbar';

export default function DashboardPage() {
  // Fetch collections to get the count
  const {
    data: collectionsData,
    isLoading: isLoadingCollections,
    isError: isCollectionsError,
  } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  });

  // Calculate stats
  const totalCollections = collectionsData?.total || 0;
  const systemStatus = isCollectionsError ? 'Error' : 'Operational';
  const statusColor = isCollectionsError ? 'text-red-500' : 'text-green-500';

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Dashboard</ToolbarPageTitle>
          <ToolbarDescription>
            Overview of your Knowledge Management System.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Collections Stat */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingCollections ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{totalCollections}</div>
            )}
            <p className="text-xs text-muted-foreground">Managed knowledge bases</p>
          </CardContent>
        </Card>

        {/* System Status Stat */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statusColor}`}>{systemStatus}</div>
            <p className="text-xs text-muted-foreground">Backend connection</p>
          </CardContent>
        </Card>

        {/* Placeholder for Sessions */}
        <Card className="hover:shadow-md transition-shadow opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Metrics unavailable</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/ingest" className="block">
              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg hover:border-primary hover:text-primary transition-colors"
              >
                <FileText className="h-8 w-8" />
                Ingest New Content
              </Button>
            </Link>
            <Link href="/collections" className="block">
              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-8 w-8" />
                Manage Collections
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

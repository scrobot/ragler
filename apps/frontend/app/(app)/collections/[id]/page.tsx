"use client";

import { use } from "react";
import { CollectionEditor } from "@/components/features/collection/editor/CollectionEditor";

interface CollectionEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function CollectionEditorPage({ params }: CollectionEditorPageProps) {
  const { id } = use(params);
  return <CollectionEditor collectionId={id} />;
}

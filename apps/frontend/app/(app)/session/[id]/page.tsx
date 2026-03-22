"use client";

import { use } from "react";
import { SessionEditor } from "@/components/features/session/SessionEditor";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);

    return (
        <SessionEditor sessionId={resolvedParams.id} />
    );
}

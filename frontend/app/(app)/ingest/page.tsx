import { IngestWizard } from "@/components/features/ingest/IngestWizard";

export default function IngestPage() {
    return (
        <div className="container mx-auto py-10 flex justify-center items-start min-h-[calc(100vh-80px)]">
            <IngestWizard />
        </div>
    );
}

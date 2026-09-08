import type { Metadata } from "next";

import { ProtokollForm } from "@/components/mobile/protokoll-form";

export const metadata: Metadata = { title: "Serviceprotokoll" };
export const dynamic = "force-dynamic";

/**
 * Serviceprotokoll vor Ort. `jobId` ist entweder ein bestehender
 * Wartungsauftrag oder "neu" fuer einen spontanen Serviceeinsatz - dann kommt
 * die Anlage aus dem Query-Parameter `installation`.
 */
export default async function ProtokollPage({
  params,
  searchParams,
}: PageProps<"/protokoll/[jobId]">) {
  const { jobId } = await params;
  const { installation } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Serviceprotokoll</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {jobId === "neu" ? "Spontaner Serviceeinsatz" : `Auftrag ${jobId}`}
        </p>
      </div>

      <ProtokollForm
        jobId={jobId === "neu" ? null : jobId}
        installationId={typeof installation === "string" ? installation : null}
      />
    </div>
  );
}

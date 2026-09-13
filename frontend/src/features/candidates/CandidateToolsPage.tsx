import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { GitCompare, CopyX } from "lucide-react";

interface Cand { _id: string; fullName: string; email?: string; phone?: string; skills?: string[]; totalExperienceYears?: number; currentCity?: string }

export const CandidateToolsPage = () => {
  const qc = useQueryClient();
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates", "tools"],
    queryFn: async () => (await client.get("/candidates")).data.data?.candidates ?? [],
  });

  const { data: dupes, refetch } = useQuery({
    queryKey: ["duplicates"],
    queryFn: async () => (await client.post("/candidates/detect-duplicates")).data.data as { groups: { key: string; candidateIds: string[] }[] },
  });

  const merge = useMutation({
    mutationFn: async ({ primaryId, duplicateIds }: { primaryId: string; duplicateIds: string[] }) =>
      (await client.post("/candidates/merge", { primaryId, duplicateIds })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      refetch();
    },
  });

  const byId = (id: string) => (candidates as Cand[]).find((c) => c._id === id);
  const toggleCompare = (id: string) =>
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 5 ? ids : [...ids, id]));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar />
      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2"><CopyX className="h-5 w-5 text-primary" />Duplicates & comparison</h2>
        <p className="text-sm text-[#6B7280]">Merge duplicate candidates and compare up to 5 side by side.</p>
      </div>

      <section className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-6">
        <h3 className="text-sm font-semibold text-ink mb-3">Detected duplicate groups</h3>
        {(dupes?.groups?.length ?? 0) === 0 ? (
          <p className="text-sm text-[#6B7280]">No duplicates detected (matched by same email, or same name + phone).</p>
        ) : (
          <div className="space-y-3">
            {dupes!.groups.map((g) => (
              <div key={g.key} className="flex flex-wrap items-center gap-2 bg-slate/50 rounded-xl px-4 py-3">
                <Badge className="bg-orange-100 text-orange-800 border-0 rounded-pill">{g.candidateIds.length} candidates</Badge>
                {g.candidateIds.map((id) => (
                  <span key={id} className="text-sm text-[#374151]">{byId(id)?.fullName ?? id}</span>
                ))}
                <Button size="sm" variant="outline" className="ml-auto rounded-pill"
                  disabled={merge.isPending}
                  onClick={() => merge.mutate({ primaryId: g.candidateIds[0], duplicateIds: g.candidateIds.slice(1) })}>
                  Merge into {byId(g.candidateIds[0])?.fullName ?? "first"}
                </Button>
              </div>
            ))}
          </div>
        )}
        {merge.isSuccess && <p className="text-xs text-green-600 mt-2">Merged. The kept profile is primary; others were soft-deleted.</p>}
      </section>

      <section className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-6">
        <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2"><GitCompare className="h-4 w-4 text-primary" />Compare candidates (pick up to 5)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {(candidates as Cand[]).map((c) => (
            <button key={c._id} onClick={() => toggleCompare(c._id)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium border ${compareIds.includes(c._id) ? "bg-primary text-ink border-primary" : "bg-white border-border text-[#6B7280]"}`}>
              {c.fullName}
            </button>
          ))}
        </div>
        {compareIds.length >= 2 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#6B7280] border-b border-border">
                  <th className="text-left py-2 pr-4">Field</th>
                  {compareIds.map((id) => <th key={id} className="text-left py-2 pr-4">{byId(id)?.fullName}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {([
                  ["Designation", (c: Cand) => c.currentDesignation ?? "—"],
                  ["Experience", (c: Cand) => (c.totalExperienceYears !== undefined ? `${c.totalExperienceYears} yrs` : "—")],
                  ["Location", (c: Cand) => c.currentCity ?? "—"],
                  ["Email", (c: Cand) => c.email ?? "—"],
                  ["Skills", (c: Cand) => (c.skills ?? []).slice(0, 5).join(", ") || "—"],
                ] as [string, (c: Cand) => string][]).map(([label, get]) => (
                  <tr key={label}>
                    <td className="py-3 pr-4 text-[#6B7280] font-medium">{label}</td>
                    {compareIds.map((id) => <td key={id} className="py-3 pr-4 text-[#374151]">{get(byId(id)!)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

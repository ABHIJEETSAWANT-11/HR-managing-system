import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TopBar } from "../../components/layout/TopBar";
import { CandidateSummaryModal, type CandidateSummaryData } from "../../components/shared/CandidateSummaryModal";
import { useJobApplications, useUpdateApplicationStage, PIPELINE_STAGES, type PipelineCandidate } from "./pipeline";
import { Badge } from "../../components/ui/badge";
import { client } from "../../lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Sparkles } from "lucide-react";

// Section 3.4 — real Fit Score from GET /applications/:id/score
export function useApplicationScore(applicationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["application-score", applicationId],
    queryFn: async () => (await client.get(`/applications/${applicationId}/score`)).data.data?.score,
    enabled: !!applicationId && enabled,
    retry: false,
  });
}

function GenerateScoreButton({ applicationId }: { applicationId: string }) {
  const qc = useQueryClient();
  const gen = useMutation({
    mutationFn: async () => (await client.post(`/applications/${applicationId}/score/generate`)).data.data?.score,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-score", applicationId] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        gen.mutate();
      }}
      disabled={gen.isPending}
      className="ml-auto text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
      title="Generate deterministic Fit Score for this candidate"
    >
      <Sparkles className="h-3 w-3" />
      {gen.isPending ? "Scoring…" : gen.isError ? "Retry score" : "Generate score"}
    </button>
  );
}

function ScoreDetail({ applicationId }: { applicationId: string }) {
  const { data: score, isLoading } = useApplicationScore(applicationId, true);
  if (isLoading) return <p className="text-[11px] text-[#6B7280] mt-2">Loading score…</p>;
  if (!score) return null;
  return (
    <div className="mt-2 border-t border-[#E5E7EB] pt-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-ink">Fit Score: {score.overallScore}/100{score.isOverridden ? " (overridden)" : ""}</p>
      </div>
      {Object.entries(score.breakdown || {}).map(([k, v]: [string, any]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B7280] w-28 truncate" title={v.details}>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
          <div className="flex-1 h-1.5 bg-slate rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${v.score}%` }} />
          </div>
          <span className="text-[10px] text-[#374151] w-7 text-right">{v.score}</span>
        </div>
      ))}
      {score.explanation?.summary && <p className="text-[10px] text-[#6B7280] italic mt-1">{score.explanation.summary}</p>}
    </div>
  );
}

const VISIBLE_STAGES = PIPELINE_STAGES.filter((s) =>
  ["Applied", "AI Reviewed", "Recruiter Review", "Shortlisted", "Screening Call", "Interview", "Assessment", "Final Interview", "Offer Approval", "Offer Sent", "Offer Accepted", "Joined"].includes(s)
);
const PARKED_STAGES = PIPELINE_STAGES.filter((s) => !VISIBLE_STAGES.includes(s as never));

const eligibilityColors: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  not_evaluated: "bg-gray-100 text-gray-600",
};

function Card({ app, onOpen }: { app: PipelineCandidate; onOpen: (c: CandidateSummaryData) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: app._id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  const c = app.candidateId;
  const [showScore, setShowScore] = useState(false);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={() =>
        onOpen({
          id: c._id,
          fullName: c.fullName,
          photoUrl: c.photoUrl,
          currentDesignation: c.currentDesignation,
          skills: c.skills,
        })
      }
      className="bg-white rounded-xl border border-[#E5E7EB] p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary-tint text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {c.fullName.slice(0, 2).toUpperCase()}
        </div>
        <p className="text-sm font-semibold text-ink truncate">{c.fullName}</p>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {app.fitScore !== undefined && (
          <Badge className="bg-primary-tint text-primary border-0 rounded-pill text-[10px]">Fit {app.fitScore}</Badge>
        )}
        <Badge className={`${eligibilityColors[app.eligibilityStatus] ?? eligibilityColors.not_evaluated} border-0 rounded-pill text-[10px]`}>
          {app.eligibilityStatus.replace("_", " ")}
        </Badge>
        <GenerateScoreButton applicationId={app._id} />
      </div>
      {showScore ? (
        <div onClick={(e) => e.stopPropagation()}>
          <ScoreDetail applicationId={app._id} />
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowScore(true);
          }}
          className="text-[10px] text-[#6B7280] hover:text-primary mt-1"
        >
          View score breakdown
        </button>
      )}
    </div>
  );
}

function Column({ stage, apps, onOpen }: { stage: string; apps: PipelineCandidate[]; onOpen: (c: CandidateSummaryData) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${stage}` });
  return (
    <div className="shrink-0 w-[270px] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 mb-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{stage}</p>
        <span className="text-[10px] font-semibold bg-slate text-[#374151] rounded-full px-2 py-0.5">{apps.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl p-2 min-h-[200px] transition-colors ${isOver ? "bg-primary-tint/60" : "bg-slate/60"}`}
      >
        {apps.map((a) => (
          <Card key={a._id} app={a} onOpen={onOpen} />
        ))}
        {apps.length === 0 && <p className="text-[11px] text-[#9CA3AF] text-center pt-6">Drop candidates here</p>}
      </div>
    </div>
  );
}

export const PipelineBoardPage = () => {
  const { jobId } = useParams();
  const [summary, setSummary] = useState<CandidateSummaryData | null>(null);
  const stageMutation = useUpdateApplicationStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: apps = [], isLoading } = useJobApplications(jobId);
  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => (await client.get(`/jobs/${jobId}`)).data.data?.job,
    enabled: !!jobId,
  });

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as string | undefined;
    const activeId = e.active.id as string;
    if (!overId || !overId.startsWith("col-")) return;
    const stage = overId.slice(4);
    const app = apps.find((a) => a._id === activeId);
    if (!app || app.pipelineStage === stage) return;
    // Optimistic behavior: mutation fires immediately; on failure the query is invalidated and the card rolls back.
    stageMutation.mutate({ id: activeId, pipelineStage: stage });
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-5">
      <TopBar />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Pipeline{job?.title ? ` — ${job.title}` : ""}
          </h2>
          <p className="text-sm text-[#6B7280]">Drag candidates between stages. Click a card for the full summary.</p>
        </div>
        <Link to="/app/jobs" className="text-sm text-primary hover:underline">← All vacancies</Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#6B7280]">Loading pipeline…</p>
      ) : (
        <>
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {VISIBLE_STAGES.map((stage) => (
                <Column key={stage} stage={stage} apps={apps.filter((a) => a.pipelineStage === stage)} onOpen={setSummary} />
              ))}
            </div>
          </DndContext>
          <details className="text-sm text-[#6B7280]">
            <summary className="cursor-pointer">Parked stages ({PARKED_STAGES.join(", ")})</summary>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {PARKED_STAGES.map((stage) => (
                <div key={stage} className="bg-white border border-border rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-[#374151]">{stage}</p>
                  <p className="text-[11px]">{apps.filter((a) => a.pipelineStage === stage).length} candidate(s)</p>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      <CandidateSummaryModal candidate={summary} open={!!summary} onClose={() => setSummary(null)} />
    </div>
  );
};

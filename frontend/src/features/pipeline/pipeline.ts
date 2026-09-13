import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";

// Must stay in sync with backend PIPELINE_STAGES (application.routes.ts)
export const PIPELINE_STAGES = [
  "Applied",
  "AI Reviewed",
  "Recruiter Review",
  "Shortlisted",
  "Screening Call",
  "Interview",
  "Assessment",
  "Final Interview",
  "Offer Approval",
  "Offer Sent",
  "Offer Accepted",
  "Joined",
  "On Hold",
  "Rejected",
  "Candidate Withdrew",
  "No Response",
  "Duplicate",
  "Future Opportunity",
  "Offer Declined",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface PipelineCandidate {
  _id: string;
  candidateId: {
    _id: string;
    fullName: string;
    email?: string;
    photoUrl?: string;
    currentDesignation?: string;
    skills?: string[];
    totalExperienceYears?: number;
  };
  jobId: { _id: string; title: string; location?: string; employmentType: string };
  pipelineStage: string;
  fitScore?: number;
  eligibilityStatus: "passed" | "failed" | "pending" | "not_evaluated";
  applicationDate: string;
  lastActivityAt: string;
}

export const useJobApplications = (jobId: string | undefined) =>
  useQuery({
    queryKey: ["applications", jobId],
    queryFn: async () => {
      const res = await client.get(`/applications?jobId=${jobId}`);
      return (res.data.data?.applications ?? []) as PipelineCandidate[];
    },
    enabled: !!jobId,
  });

export const useUpdateApplicationStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pipelineStage }: { id: string; pipelineStage: string }) => {
      const res = await client.patch(`/applications/${id}/stage`, { pipelineStage });
      return res.data.data.application;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["candidate", variables.id] });
    },
  });
};

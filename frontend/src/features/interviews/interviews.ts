import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";

export interface Interview {
  _id: string;
  applicationId: string;
  candidateId: { _id: string; fullName: string };
  jobId: { _id: string; title: string };
  type: "hr_screening" | "technical" | "assignment_review" | "managerial" | "cultural" | "final";
  interviewerIds: { _id: string; name: string; email: string }[];
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled" | "rescheduled";
}

export interface Scorecard {
  _id: string;
  interviewerId: { _id: string; name: string; email: string };
  competencies: { name: string; description?: string; rating: number; notes?: string }[];
  overallRating: number;
  recommendation: "strong_hire" | "hire" | "neutral" | "do_not_hire" | "strong_do_not_hire";
  generalNotes?: string;
  isSubmitted: boolean;
  createdAt: string;
}

export const useInterviews = (filters: { status?: string; jobId?: string } = {}) =>
  useQuery({
    queryKey: ["interviews", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.jobId) params.append("jobId", filters.jobId);
      const res = await client.get(`/interviews?${params.toString()}`);
      return (res.data.data?.interviews ?? []) as Interview[];
    },
  });

export const useScorecards = (interviewId: string | undefined) =>
  useQuery({
    queryKey: ["scorecards", interviewId],
    queryFn: async () => {
      const res = await client.get(`/interviews/${interviewId}/scorecards`);
      // Render EXACTLY what the server returns: for an interviewer who hasn't
      // submitted, the server sends { scorecardCount, scorecards: [] }.
      return res.data.data as { scorecardCount?: number; scorecards: Scorecard[] };
    },
    enabled: !!interviewId,
  });

export const useScheduleInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicationId: string; jobId: string; candidateId: string;
      type: Interview["type"]; scheduledAt: string; durationMinutes: number;
      interviewerIds: string[]; meetingLink?: string; location?: string; instructions?: string;
    }) => {
      const res = await client.post("/interviews", input);
      return res.data.data.interview as Interview;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interviews"] }),
  });
};

export const useUpdateInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; status?: Interview["status"]; scheduledAt?: string; cancelReason?: string }) => {
      const res = await client.patch(`/interviews/${id}`, patch);
      return res.data.data.interview as Interview;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      qc.invalidateQueries({ queryKey: ["scorecards"] });
    },
  });
};

export const useSubmitScorecard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interviewId, ...body }: { interviewId: string; competencies: { name: string; rating: number; notes?: string }[]; overallRating: number; recommendation: Scorecard["recommendation"]; generalNotes?: string }) => {
      const res = await client.post(`/interviews/${interviewId}/scorecards`, body);
      return res.data.data.scorecard as Scorecard;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["scorecards", v.interviewId] }),
  });
};

export const RECOMMENDATIONS: Scorecard["recommendation"][] = ["strong_hire", "hire", "neutral", "do_not_hire", "strong_do_not_hire"];
export const INTERVIEW_TYPES: Interview["type"][] = ["hr_screening", "technical", "assignment_review", "managerial", "cultural", "final"];

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";

export interface SalaryStructure {
  annualCTC: number;
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  variablePay?: number;
  performanceBonus?: number;
  joiningBonus?: number;
  employerPF?: number;
  gratuity?: number;
  insurance?: number;
  monthlyGross?: number;
}

export interface Offer {
  _id: string;
  applicationId: string;
  candidateId: { _id?: string; fullName?: string } | string;
  jobId: { _id?: string; title?: string } | string;
  version: number;
  status: string;
  joiningDate: string;
  workLocation: string;
  probationPeriodDays?: number;
  noticePeriodDays?: number;
  validUntil: string;
  salaryStructure: SalaryStructure;
  pdfUrl?: string;
  sentAt?: string;
  createdAt: string;
}

export interface OfferApproval {
  _id: string;
  currentLevel: number;
  overallStatus: string;
  approvalConfig: { level: number; approverRole: string }[];
  approvals: { level: number; approverRole?: string; status: string; comments?: string; decidedAt?: string }[];
}

export const useOffers = () =>
  useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const res = await client.get("/offers");
      return (res.data.data?.offers ?? []) as Offer[];
    },
  });

export const useApproval = (offerId: string | undefined) =>
  useQuery({
    queryKey: ["offerApproval", offerId],
    queryFn: async () => {
      const res = await client.get(`/offers/${offerId}/history`);
      const h = res.data.data;
      return (h?.approval ?? h) as OfferApproval | undefined;
    },
    enabled: !!offerId,
  });

export const useCreateOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await client.post("/offers", input);
      return res.data.data.offer as Offer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
};

export const useOfferAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, ...body }: { id: string; action: "submit" | "approve" | "send"; decision?: string; comments?: string }) => {
      const res = await client.post(`/offers/${id}/${action}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["offerApproval"] });
    },
  });
};

// Downloads the real PDF through the backend (auth via axios client), saving as a file
export async function downloadOfferPdf(offerId: string, candidateName: string) {
  const res = await client.get(`/offers/${offerId}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `offer_${candidateName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function validateSalary(s: SalaryStructure): { valid: boolean; mismatch: number; monthlyGross: number } {
  const total =
    (s.basicSalary ?? 0) + (s.hra ?? 0) + (s.specialAllowance ?? 0) + (s.variablePay ?? 0) +
    (s.performanceBonus ?? 0) + (s.joiningBonus ?? 0) + (s.employerPF ?? 0) + (s.gratuity ?? 0) + (s.insurance ?? 0);
  const mismatch = Math.abs(s.annualCTC - total);
  return { valid: mismatch <= 1, mismatch, monthlyGross: Math.round((s.annualCTC / 12) * 100) / 100 };
}

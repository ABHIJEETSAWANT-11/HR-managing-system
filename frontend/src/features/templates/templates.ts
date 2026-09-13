import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";

export interface DocumentTemplate {
  _id: string;
  organizationId: string;
  type: "offer_letter" | "email" | "interview_scorecard" | "salary";
  name: string;
  htmlContent: string;
  variables: string[];
  version: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export type TemplateCreateInput = Pick<DocumentTemplate, "type" | "name" | "htmlContent"> & {
  variables?: string[];
  isDefault?: boolean;
};

export const useTemplates = (type?: DocumentTemplate["type"]) =>
  useQuery({
    queryKey: ["templates", type ?? "all"],
    queryFn: async () => {
      const res = await client.get(`/templates${type ? `?type=${type}` : ""}`);
      return (res.data.data?.templates ?? []) as DocumentTemplate[];
    },
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TemplateCreateInput) => {
      const res = await client.post("/templates", input);
      return res.data.data.template as DocumentTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
};

export const useUpdateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<TemplateCreateInput> & { isActive?: boolean }) => {
      const res = await client.patch(`/templates/${id}`, patch);
      return res.data.data.template as DocumentTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.delete(`/templates/${id}`);
      return res.data.data.template as DocumentTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
};

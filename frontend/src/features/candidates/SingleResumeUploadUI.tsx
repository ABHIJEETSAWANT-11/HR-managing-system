import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { client } from "../../lib/api/client";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Upload } from "lucide-react";

type Row = { name: string; status: "uploading" | "parsing" | "done" | "failed"; resumeId?: string; candidateId?: string };

export const SingleResumeUploadUI = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      setRows(files.map((f) => ({ name: f.name, status: "uploading" as const })));
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      if (fullName.trim()) fd.append("candidateName", fullName.trim());
      const res = await client.post("/resumes/bulk-upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data: any) => {
      (data?.results ?? []).forEach((r: any, i: number) => {
        setRow(i, { status: "done", resumeId: r.resumeId, candidateId: r.candidateId });
      });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: () => setRows((rs) => rs.map((r) => ({ ...r, status: "failed" as const }))),
  });

  const statusColor = (s: Row["status"]) =>
    s === "done" ? "bg-green-100 text-green-800" : s === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <TopBar />
      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Add candidates via resume</h2>
        <p className="text-sm text-[#6B7280]">Upload one or more resumes (PDF/DOC/DOCX, max 10MB each). A candidate is created per resume.</p>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Candidate full name (optional)</Label><Input className="mt-1 bg-slate" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Used for the first resume" /></div>
          <div><Label className="text-xs">Email (optional)</Label><Input className="mt-1 bg-slate" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="candidate@email.com" /></div>
        </div>

        <div
          className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" multiple className="hidden"
            onChange={(e) => e.target.files && upload.mutate(Array.from(e.target.files))} />
          <p className="text-sm text-[#374151] mb-1">Click to select resume files</p>
          <p className="text-xs text-primary">PDF, DOC, DOCX — multiple files supported</p>
        </div>

        {upload.isPending && <p className="text-sm text-[#6B7280]">Uploading {rows.length} file(s)…</p>}

        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-slate/50 rounded-xl px-4 py-3">
                <p className="text-sm text-ink truncate">{r.name}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColor(r.status)} border-0 rounded-pill`}>{r.status}</Badge>
                  {r.candidateId && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary"
                      onClick={() => navigate(`/app/candidates/${r.candidateId}`)}>Open profile</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {upload.isError && <p className="text-xs text-red-600">Upload failed. Check file sizes and try again.</p>}
      </div>
    </div>
  );
};

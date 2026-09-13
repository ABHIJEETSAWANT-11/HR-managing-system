import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { ArrowLeft, Briefcase, MapPin, Link2, Code, Pencil } from "lucide-react";

interface CandidateProfile {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  currentDesignation?: string;
  currentCompany?: string;
  currentCity?: string;
  currentCountry?: string;
  totalExperienceYears?: number;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodDays?: number;
  about?: string;
  skills?: string[];
  workHistory?: { company: string; title: string; startDate: string; endDate?: string; description?: string }[];
  education?: { degree: string; institution: string; year?: string }[];
  certifications?: { name: string; issuer: string; year?: string }[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

const aboutFromProfile = (c: CandidateProfile) =>
  c.about ??
  [
    c.currentDesignation ? `Currently: ${c.currentDesignation}${c.currentCompany ? ` at ${c.currentCompany}` : ""}` : "",
    c.totalExperienceYears !== undefined ? `${c.totalExperienceYears} yrs total experience` : "",
    c.noticePeriodDays ? `Notice period: ${c.noticePeriodDays} days` : "",
  ].filter(Boolean).join(" · ");

export const CandidateProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", currentDesignation: "", currentCity: "", totalExperienceYears: 0, skills: "" });

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => (await client.get(`/candidates/${id}`)).data.data?.candidate as CandidateProfile,
    enabled: !!id,
  });

  const save = useMutation({
    mutationFn: async () => {
      const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      return client.patch(`/candidates/${id}`, {
        fullName: form.fullName,
        currentDesignation: form.currentDesignation,
        currentCity: form.currentCity,
        totalExperienceYears: form.totalExperienceYears,
        ...(skills.length ? { skills } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", id] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setEditing(false);
    },
  });

  if (isLoading) return <div className="p-8 text-sm text-[#6B7280]">Loading candidate…</div>;
  if (!candidate) return <div className="p-8 text-sm text-[#6B7280]">Candidate not found.</div>;

  const initials = candidate.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <TopBar />
      <div className="flex items-center justify-between">
        <Link to="/app/candidates" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> All candidates
        </Link>
        <Button variant="outline" size="sm" className="rounded-pill gap-1" onClick={() => {
          setForm({
            fullName: candidate.fullName,
            currentDesignation: candidate.currentDesignation ?? "",
            currentCity: candidate.currentCity ?? "",
            totalExperienceYears: candidate.totalExperienceYears ?? 0,
            skills: (candidate.skills ?? []).join(", "),
          });
          setEditing(true);
        }}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-6 space-y-5">
        {/* Identity */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="h-20 w-20 rounded-full bg-primary-tint text-primary text-xl font-bold flex items-center justify-center">
            {initials}
          </div>
          <h2 className="text-xl font-semibold text-ink">{candidate.fullName}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-[#6B7280] flex-wrap">
            {candidate.currentDesignation && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{candidate.currentDesignation}</span>}
            {(candidate.currentCity || candidate.currentCountry) && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[candidate.currentCity, candidate.currentCountry].filter(Boolean).join(", ")}</span>
            )}
            {candidate.totalExperienceYears !== undefined && <span>{candidate.totalExperienceYears} yrs</span>}
          </div>
          <div className="flex gap-3 mt-1">
            {candidate.email && <span className="text-xs text-[#6B7280]">{candidate.email}</span>}
            {candidate.phone && <span className="text-xs text-[#6B7280]">{candidate.phone}</span>}
          </div>
          <div className="flex gap-3 mt-1">
            {candidate.portfolioUrl && <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Link2 className="h-3.5 w-3.5" />Portfolio</a>}
            {candidate.githubUrl && <a href={candidate.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Code className="h-3.5 w-3.5" />GitHub</a>}
          </div>
        </div>

        {/* About */}
        {aboutFromProfile(candidate) && (
          <section>
            <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">About</p>
            <p className="text-sm text-[#374151] leading-relaxed">{aboutFromProfile(candidate)}</p>
          </section>
        )}

        {/* Skills */}
        {(candidate.skills?.length ?? 0) > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">Professional Skills</p>
            <div className="flex flex-wrap gap-2">
              {candidate.skills!.map((s) => (
                <Badge key={s} variant="secondary" className="bg-primary-tint text-primary border-0 rounded-pill text-xs font-medium">{s}</Badge>
              ))}
            </div>
          </section>
        )}

        {/* Work history timeline */}
        {(candidate.workHistory?.length ?? 0) > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-3">Work Experiences</p>
            <div className="space-y-4">
              {candidate.workHistory!.map((exp, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-lg bg-slate border border-border flex items-center justify-center shrink-0 text-xs font-bold text-primary">{exp.company[0]}</div>
                    {idx < candidate.workHistory!.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-semibold text-ink mb-0.5">{exp.company}</p>
                    <p className="text-sm font-medium text-[#374151]">{exp.title}</p>
                    <p className="text-xs text-[#6B7280]">{exp.startDate} - {exp.endDate ?? "Present"}</p>
                    {exp.description && <p className="text-xs text-[#6B7280] mt-1">{exp.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education & certifications */}
        {((candidate.education?.length ?? 0) > 0 || (candidate.certifications?.length ?? 0) > 0) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(candidate.education?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">Education</p>
                {candidate.education!.map((e, i) => (
                  <p key={i} className="text-sm text-[#374151]">{e.degree}, {e.institution} {e.year ? `(${e.year})` : ""}</p>
                ))}
              </div>
            )}
            {(candidate.certifications?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">Certifications</p>
                {candidate.certifications!.map((c, i) => (
                  <p key={i} className="text-sm text-[#374151]">{c.name} — {c.issuer} {c.year ? `(${c.year})` : ""}</p>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Edit dialog */}
      {editing && (
        <Dialog open onClose={() => setEditing(false)}>
          <DialogContent className="max-w-[460px] rounded-[20px]">
            <h3 className="text-lg font-semibold text-ink">Edit candidate</h3>
            <div className="space-y-3">
              <div><Label className="text-xs">Full name</Label><Input className="mt-1 bg-slate" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></div>
              <div><Label className="text-xs">Designation</Label><Input className="mt-1 bg-slate" value={form.currentDesignation} onChange={(e) => setForm((f) => ({ ...f, currentDesignation: e.target.value }))} /></div>
              <div><Label className="text-xs">City</Label><Input className="mt-1 bg-slate" value={form.currentCity} onChange={(e) => setForm((f) => ({ ...f, currentCity: e.target.value }))} /></div>
              <div><Label className="text-xs">Experience (years)</Label><Input type="number" className="mt-1 bg-slate" value={form.totalExperienceYears} onChange={(e) => setForm((f) => ({ ...f, totalExperienceYears: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Skills (comma-separated)</Label><Input className="mt-1 bg-slate" value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} /></div>
              {save.isError && <p className="text-xs text-red-600">Save failed</p>}
              <div className="flex gap-2">
                <Button className="flex-1 bg-[#95CC29] hover:bg-primary text-ink rounded-pill" disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>
                <Button variant="outline" className="rounded-pill" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

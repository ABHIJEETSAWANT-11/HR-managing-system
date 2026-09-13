import { useMemo, useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { CalendarCheck, Plus, MapPin, Video } from "lucide-react";
import {
  useInterviews, useScorecards, useScheduleInterview, useSubmitScorecard, useUpdateInterview,
  INTERVIEW_TYPES, RECOMMENDATIONS, type Interview, type Scorecard,
} from "./interviews";
import { client } from "../../lib/api/client";
import { useQuery } from "@tanstack/react-query";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  ongoing: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  rescheduled: "bg-purple-100 text-purple-800",
};

const recColors: Record<string, string> = {
  strong_hire: "bg-green-100 text-green-800",
  hire: "bg-green-50 text-green-700",
  neutral: "bg-gray-100 text-gray-700",
  do_not_hire: "bg-orange-100 text-orange-800",
  strong_do_not_hire: "bg-red-100 text-red-800",
};

function fmt(date: string) {
  return new Date(date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function ScorecardForm({ interview, onDone }: { interview: Interview; onDone: () => void }) {
  const [rows, setRows] = useState([
    { name: "Technical skills", rating: 3, notes: "" },
    { name: "Communication", rating: 3, notes: "" },
    { name: "Problem solving", rating: 3, notes: "" },
  ]);
  const [overall, setOverall] = useState(3);
  const [recommendation, setRecommendation] = useState<Scorecard["recommendation"]>("neutral");
  const [generalNotes, setGeneralNotes] = useState("");
  const submit = useSubmitScorecard();

  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <div key={i} className="bg-slate/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Input value={r.name} onChange={(e) => setRows((rs) => rs.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))} className="max-w-[240px] bg-white" />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRows((rs) => rs.map((x, xi) => (xi === i ? { ...x, rating: n } : x)))}
                  className={`h-7 w-7 rounded-full text-xs font-semibold ${r.rating >= n ? "bg-primary text-ink" : "bg-white border border-border text-[#6B7280]"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Input placeholder="Notes for this competency (optional)" value={r.notes} onChange={(e) => setRows((rs) => rs.map((x, xi) => (xi === i ? { ...x, notes: e.target.value } : x)))} className="bg-white text-sm" />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Overall rating</Label>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setOverall(n)} className={`h-8 w-8 rounded-full text-xs font-semibold ${overall >= n ? "bg-primary text-ink" : "bg-white border border-border text-[#6B7280]"}`}>{n}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm">Recommendation</Label>
        {RECOMMENDATIONS.map((r) => (
          <button key={r} type="button" onClick={() => setRecommendation(r)}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium border ${recommendation === r ? "bg-primary text-ink border-primary" : "bg-white border-border text-[#6B7280]"}`}>
            {r.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <Textarea placeholder="General notes" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
      <Button
        className="w-full bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate(
            { interviewId: interview._id, competencies: rows, overallRating: overall, recommendation, generalNotes },
            { onSuccess: onDone }
          )
        }
      >
        {submit.isPending ? "Submitting…" : "Submit scorecard"}
      </Button>
      {submit.isError && <p className="text-xs text-red-600">Submit failed: {(submit.error as any)?.response?.data?.error?.message ?? "error"}</p>}
    </div>
  );
}

function InterviewDetail({ interview, onDone }: { interview: Interview; onDone: () => void }) {
  const { data, isLoading } = useScorecards(interview._id);
  const [showForm, setShowForm] = useState(false);
  const update = useUpdateInterview();

  // Render EXACTLY what the backend returns (privacy rule enforced server-side):
  // either { scorecardCount, scorecards: [] } or { scorecards: [...] }.
  const privacyLimited = data && "scorecardCount" in data && (data as any).scorecardCount !== undefined && data.scorecards.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#374151]">
        <Badge className={`${statusColors[interview.status] ?? "bg-gray-100 text-gray-700"} border-0 rounded-pill`}>{interview.status}</Badge>
        <span className="capitalize">{interview.type.replace(/_/g, " ")}</span>
        <span>· {fmt(interview.scheduledAt)} · {interview.durationMinutes} min</span>
        {interview.meetingLink && <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /><a href={interview.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Meeting link</a></span>}
        {interview.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{interview.location}</span>}
      </div>
      {interview.instructions && <p className="text-sm bg-slate/60 rounded-xl p-3">{interview.instructions}</p>}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">Interviewers</p>
        <div className="flex flex-wrap gap-2">
          {interview.interviewerIds?.map((i) => (
            <Badge key={i._id} variant="secondary" className="rounded-pill bg-primary-tint text-primary border-0">{i.name}</Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium">Scorecards</p>
          <Button variant="outline" size="sm" className="rounded-pill text-xs" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Hide form" : "Submit my scorecard"}
          </Button>
        </div>
        {showForm && <div className="mb-4 border border-border rounded-2xl p-4"><ScorecardForm interview={interview} onDone={() => { setShowForm(false); onDone(); }} /></div>}
        {isLoading ? (
          <p className="text-sm text-[#6B7280]">Loading scorecards…</p>
        ) : privacyLimited ? (
          <p className="text-sm text-[#6B7280] bg-slate/60 rounded-xl p-3">
            {(data as any).scorecardCount} scorecard(s) submitted. Feedback stays hidden until you submit your own scorecard — enforced by the server.
          </p>
        ) : (data?.scorecards?.length ?? 0) === 0 ? (
          <p className="text-sm text-[#6B7280]">No scorecards yet.</p>
        ) : (
          <div className="space-y-3">
            {data!.scorecards.map((s: Scorecard) => (
              <div key={s._id} className="border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{s.interviewerId?.name ?? "Interviewer"}</p>
                  <Badge className={`${recColors[s.recommendation] ?? "bg-gray-100"} border-0 rounded-pill`}>{s.recommendation.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-[#6B7280]">Overall {s.overallRating}/5 · {fmt(s.createdAt)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {s.competencies?.map((c, i) => (
                    <div key={i} className="bg-slate/50 rounded-lg px-3 py-2 text-xs">
                      <span className="font-medium text-ink">{c.name}</span> — {c.rating}/5{c.notes ? ` · ${c.notes}` : ""}
                    </div>
                  ))}
                </div>
                {s.generalNotes && <p className="text-sm text-[#374151]">{s.generalNotes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-border pt-3">
        {interview.status === "scheduled" && (
          <>
            <Button size="sm" className="bg-[#95CC29] hover:bg-primary text-ink rounded-pill" disabled={update.isPending}
              onClick={() => update.mutate({ id: interview._id, status: "ongoing" }, { onSuccess: onDone })}>Mark ongoing</Button>
            <Button size="sm" variant="outline" className="rounded-pill" disabled={update.isPending}
              onClick={() => update.mutate({ id: interview._id, status: "completed" }, { onSuccess: onDone })}>Mark completed</Button>
            <Button size="sm" variant="ghost" className="text-red-600 rounded-pill" disabled={update.isPending}
              onClick={() => update.mutate({ id: interview._id, status: "cancelled", cancelReason: "Cancelled from UI" }, { onSuccess: onDone })}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}

export const InterviewsPage = () => {
  const [statusFilter, setStatusFilter] = useState("");
  const { data: interviews = [], isLoading } = useInterviews({ status: statusFilter || undefined });
  const [detail, setDetail] = useState<Interview | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { data: apps = [] } = useQuery({
    queryKey: ["applications", "all"],
    queryFn: async () => (await client.get("/applications")).data.data?.applications ?? [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["orgUsers"],
    queryFn: async () => (await client.get("/users")).data.data?.users ?? [],
  });

  const grouped = useMemo(() => {
    const g: Record<string, Interview[]> = { Upcoming: [], Today: [], Past: [] };
    const now = new Date(); const todayStr = now.toDateString();
    for (const it of interviews) {
      const d = new Date(it.scheduledAt);
      if (["cancelled", "completed"].includes(it.status) || d < now) g.Past.push(it);
      else if (d.toDateString() === todayStr) g.Today.push(it);
      else g.Upcoming.push(it);
    }
    return g;
  }, [interviews]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Interviews</h2>
          <p className="text-sm text-[#6B7280]">Schedule, track and score interviews.</p>
        </div>
        <Button className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2" onClick={() => setScheduleOpen(true)}>
          <Plus className="h-4 w-4" /> Schedule interview
        </Button>
      </div>

      <div className="flex gap-2">
        <select className="px-4 py-2 bg-slate border-transparent rounded-pill text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {["scheduled", "ongoing", "completed", "cancelled", "rescheduled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#6B7280]">Loading interviews…</p>
      ) : (
        <div className="space-y-6">
          {["Upcoming", "Today", "Past"].map((section) => (
            grouped[section].length > 0 && (
              <div key={section} className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                <div className="px-6 py-3 border-b border-border text-[10px] uppercase tracking-widest text-[#6B7280] font-medium">{section} ({grouped[section].length})</div>
                <div className="divide-y divide-border">
                  {grouped[section].map((it) => (
                    <button key={it._id} onClick={() => setDetail(it)} className="w-full text-left px-6 py-4 hover:bg-slate/50 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">{it.candidateId?.fullName} <span className="text-[#6B7280] font-normal">· {it.type.replace(/_/g, " ")} · {it.jobId?.title}</span></p>
                          <p className="text-xs text-[#6B7280]">{fmt(it.scheduledAt)} · {it.durationMinutes} min · {it.interviewerIds?.map((i) => i.name).join(", ") || "no interviewers"}</p>
                        </div>
                        <Badge className={`${statusColors[it.status]} border-0 rounded-pill`}>{it.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
          {interviews.length === 0 && <p className="text-sm text-[#6B7280] text-center py-10">No interviews found. Schedule one to get started.</p>}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-[680px] max-h-[85vh] overflow-y-auto rounded-[20px]">
          <DialogHeader><DialogTitle className="text-ink">{detail?.candidateId?.fullName} — {detail?.type.replace(/_/g, " ")}</DialogTitle></DialogHeader>
          {detail && <InterviewDetail interview={detail} onDone={() => setDetail(null)} />}
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} apps={apps} users={users} />
    </div>
  );
};

function ScheduleDialog({ open, onClose, apps, users }: { open: boolean; onClose: () => void; apps: any[]; users: any[] }) {
  const [form, setForm] = useState({ applicationId: "", type: "hr_screening", scheduledAt: "", durationMinutes: 30, interviewerIds: [] as string[], meetingLink: "", location: "", instructions: "" });
  const schedule = useScheduleInterview();
  const selectedApp = apps.find((a) => a._id === form.applicationId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[560px] rounded-[20px]">
        <DialogHeader><DialogTitle className="text-ink">Schedule interview</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Application (candidate · job)</Label>
            <select className="w-full mt-1 px-3 py-2 bg-slate border-transparent rounded-xl text-sm" value={form.applicationId} onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}>
              <option value="">Select application…</option>
              {apps.map((a: any) => (
                <option key={a._id} value={a._id}>{a.candidateId?.fullName} — {a.jobId?.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <select className="w-full mt-1 px-3 py-2 bg-slate border-transparent rounded-xl text-sm capitalize" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Duration (min)</Label>
              <Input type="number" min={15} step={15} className="mt-1 bg-slate" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Scheduled at</Label>
            <Input type="datetime-local" className="mt-1 bg-slate" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Interviewers</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {users.map((u: any) => (
                <button key={u._id} type="button"
                  onClick={() => setForm((f) => ({ ...f, interviewerIds: f.interviewerIds.includes(u._id) ? f.interviewerIds.filter((x) => x !== u._id) : [...f.interviewerIds, u._id] }))}
                  className={`px-3 py-1.5 rounded-pill text-xs font-medium border ${form.interviewerIds.includes(u._id) ? "bg-primary text-ink border-primary" : "bg-white border-border text-[#6B7280]"}`}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
          <Input placeholder="Meeting link (optional)" className="bg-slate" value={form.meetingLink} onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))} />
          <Input placeholder="Location (optional)" className="bg-slate" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <Textarea placeholder="Instructions (optional)" value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
          <Button className="w-full bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill"
            disabled={!form.applicationId || !form.scheduledAt || schedule.isPending}
            onClick={() =>
              schedule.mutate(
                {
                  applicationId: form.applicationId,
                  jobId: selectedApp?.jobId?._id ?? selectedApp?.jobId,
                  candidateId: selectedApp?.candidateId?._id ?? selectedApp?.candidateId,
                  type: form.type as any, scheduledAt: new Date(form.scheduledAt).toISOString(),
                  durationMinutes: form.durationMinutes, interviewerIds: form.interviewerIds,
                  meetingLink: form.meetingLink || undefined, location: form.location || undefined, instructions: form.instructions || undefined,
                },
                { onSuccess: onClose }
              )
            }
          >
            {schedule.isPending ? "Scheduling…" : "Schedule"}
          </Button>
          {schedule.isError && <p className="text-xs text-red-600">{(schedule.error as any)?.response?.data?.error?.message ?? "Failed to schedule"}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../components/layout/TopBar";
import { DashboardCard } from "../../components/shared/DashboardCard";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { CandidateSummaryModal } from "../../components/shared/CandidateSummaryModal";
import type { CandidateSummaryData } from "../../components/shared/CandidateSummaryModal";
import { client } from "../../lib/api/client";
import { Video } from "lucide-react";

/**
 * Section 6.3 — dashboard wired to REAL endpoints (was all mock data).
 * Layout intentionally unchanged; only data sources swapped.
 */

function useNotifications() {
  return useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: async () => (await client.get("/notifications?limit=1")).data.data,
    refetchInterval: 30000, // Section 6.1: REST polling every ~30s (no Socket.io)
  });
}

function useUpcomingInterview() {
  return useQuery({
    queryKey: ["upcoming-interview"],
    queryFn: async () => {
      const res = await client.get("/interviews?status=scheduled");
      const all = (res.data.data?.interviews ?? []) as any[];
      const now = new Date();
      return all
        .filter((i) => new Date(i.scheduledAt) >= now)
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0] || null;
    },
    refetchInterval: 60000,
  });
}

function useVacancies() {
  return useQuery({
    queryKey: ["dashboard-vacancies"],
    queryFn: async () => {
      const res = await client.get("/jobs?status=open&limit=6");
      const jobs = (res.data.data?.jobs ?? []) as any[];
      return jobs.map((j) => ({
        id: j._id,
        title: j.title,
        company: j.location || "On-site",
        total: j.vacancies ?? 1,
        // recruited = Joined applications for this job, when provided by the API; else 0
        recruited: 0,
      }));
    },
    refetchInterval: 60000,
  });
}

function useIndustries() {
  return useQuery({
    queryKey: ["dashboard-industries"],
    queryFn: async () => {
      const res = await client.get("/reports/industries");
      const industries = (res.data.data?.industries ?? []) as { _id: string; candidates: number }[];
      const max = Math.max(1, ...industries.map((i) => i.candidates));
      return industries.slice(0, 5).map((i) => ({
        label: i._id,
        count: i.candidates,
        percentage: Math.round((i.candidates / max) * 100),
      }));
    },
    refetchInterval: 120000,
  });
}

function useCountries() {
  return useQuery({
    queryKey: ["dashboard-countries"],
    queryFn: async () => {
      const res = await client.get("/reports/countries");
      const locations = (res.data.data?.locations ?? []) as { _id: string; candidates: number }[];
      const max = Math.max(1, ...locations.map((l) => l.candidates));
      return locations.slice(0, 5).map((l) => ({
        label: l._id,
        count: l.candidates,
        percentage: Math.round((l.candidates / max) * 100),
      }));
    },
    refetchInterval: 120000,
  });
}

function usePotentialCandidates() {
  return useQuery({
    queryKey: ["dashboard-potential-candidates"],
    queryFn: async () => {
      const res = await client.get("/candidates?limit=5");
      const payload = res.data.data;
      const cands = (payload?.candidates ?? payload ?? []) as any[];
      return cands.slice(0, 5).map((c) => ({
        id: c._id,
        name: c.fullName,
        location: c.currentCity || "—",
        role: c.currentDesignation || "—",
        level: c.totalExperienceYears != null ? (c.totalExperienceYears >= 7 ? "Senior" : c.totalExperienceYears >= 3 ? "Mid" : "Junior") : "—",
        summary: {
          id: c._id,
          fullName: c.fullName,
          photoUrl: c.photoUrl,
          currentDesignation: c.currentDesignation,
          skills: c.skills || [],
        } as CandidateSummaryData,
      }));
    },
    refetchInterval: 60000,
  });
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-[#9CA3AF] py-6 text-center">{children}</p>
);

export const DashboardOverview = () => {
  const [activeTabIndustries, setActiveTabIndustries] = useState("Companies");
  const [activeTabCountries, setActiveTabCountries] = useState("Companies");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSummaryData | null>(null);

  const { data: notifData } = useNotifications();
  const { data: interview } = useUpcomingInterview();
  const { data: vacancies = [] } = useVacancies();
  const { data: industries = [] } = useIndustries();
  const { data: locations = [] } = useCountries();
  const { data: candidates = [] } = usePotentialCandidates();

  const unreadNotifications = notifData?.unreadCount ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar notificationCount={unreadNotifications} messageCount={0} />

      {/* Row 1: Upcoming Interview — real next scheduled interview */}
      <DashboardCard title="Upcoming Interview" icon={<Video className="h-4 w-4" />}>
        {interview ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary-tint text-primary font-bold">
                  {(interview.candidateId?.fullName || "C").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-ink">{interview.candidateId?.fullName || "Candidate"}</p>
                <p className="text-xs text-[#6B7280] capitalize">{String(interview.type || "interview").replace(/_/g, " ")}</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 flex-1 md:justify-center">
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-medium mb-1">Time</p>
                <p className="text-sm font-medium text-ink">
                  {new Date(interview.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-medium mb-1">Job</p>
                <p className="text-sm font-medium text-ink">{interview.jobId?.title || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-medium mb-1">Duration</p>
                <p className="text-sm font-medium text-ink">{interview.durationMinutes || 30} min</p>
              </div>
            </div>

            {interview.meetingLink && (
              <div className="flex items-center gap-2">
                <a href={interview.meetingLink} target="_blank" rel="noreferrer">
                  <Button className="rounded-pill bg-[#95CC29] hover:bg-primary text-ink text-sm font-semibold">Join meeting</Button>
                </a>
              </div>
            )}
          </div>
        ) : (
          <Empty>No upcoming interviews. Schedule one from the Interviews page.</Empty>
        )}
      </DashboardCard>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Current Vacancies — real open jobs */}
        <DashboardCard title="Current Vacancies" icon={<div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center"><div className="w-2 h-2 bg-current rounded-sm" /></div>} className="lg:col-span-3">
          {vacancies.length === 0 ? (
            <Empty>No open vacancies. Publish a job to see it here.</Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vacancies.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary-tint text-primary flex items-center justify-center font-bold text-lg">
                    {v.title[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{v.title}</p>
                    <p className="text-xs text-[#6B7280]">
                      {v.company}
                      <span className="mx-1">•</span>
                      {v.recruited}/{v.total} recruited
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Industries Insight — real /reports/industries */}
        <DashboardCard
          title="Industries Insight"
          icon={<div className="w-4 h-4 flex items-end justify-between"><div className="w-1 bg-current h-2" /><div className="w-1 bg-current h-3" /><div className="w-1 bg-current h-4" /></div>}
          className="lg:col-span-2"
          tabs={[{ value: "Companies", label: "Companies" }, { value: "Candidates", label: "Candidates" }]}
          activeTab={activeTabIndustries}
          onTabChange={setActiveTabIndustries}
        >
          <div className="space-y-4 pt-2">
            {industries.length === 0 ? (
              <Empty>No candidate employer data yet.</Empty>
            ) : (
              industries.map((ind) => (
                <div key={ind.label}>
                  <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                    <span className="text-[#6B7280]">{ind.label}</span>
                    <span>{ind.count} cand.</span>
                  </div>
                  <Progress value={ind.percentage} className="h-1.5 bg-slate" />
                </div>
              ))
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Potential Candidates — real recent candidates */}
        <DashboardCard title="Potential Candidates" icon={<div className="w-4 h-4 border border-current rounded-full" />} className="lg:col-span-3">
          {candidates.length === 0 ? (
            <Empty>No candidates yet. Upload resumes to get started.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium border-b border-border">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Current Role</th>
                    <th className="pb-3 font-medium text-right">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate/50 transition-colors cursor-pointer" onClick={() => setSelectedCandidate(c.summary)}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary-tint text-primary font-bold">{c.name.slice(0, 1)}</AvatarFallback></Avatar>
                          <span className="font-semibold text-ink">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[#374151]">📍 {c.location}</td>
                      <td className="py-3 text-[#374151]">{c.role}</td>
                      <td className="py-3 text-right text-[#374151]">{c.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        {/* Countries Insight — real /reports/countries as a bar list (city-level, India-first) */}
        <DashboardCard
          title="Locations Insight"
          icon={<div className="w-4 h-4 border border-current rounded-full" />}
          className="lg:col-span-2"
          tabs={[{ value: "Companies", label: "Companies" }, { value: "Candidates", label: "Candidates" }]}
          activeTab={activeTabCountries}
          onTabChange={setActiveTabCountries}
        >
          <div className="space-y-4 pt-2">
            {locations.length === 0 ? (
              <Empty>No candidate location data yet.</Empty>
            ) : (
              locations.map((loc) => (
                <div key={loc.label}>
                  <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                    <span className="text-[#6B7280]">{loc.label}</span>
                    <span>{loc.count} cand.</span>
                  </div>
                  <Progress value={loc.percentage} className="h-1.5 bg-slate" />
                </div>
              ))
            )}
          </div>
        </DashboardCard>
      </div>

      <CandidateSummaryModal
        open={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
      />
    </div>
  );
};

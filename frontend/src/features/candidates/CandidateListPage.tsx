import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api/client";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Users, Search, Plus } from "lucide-react";

interface CandidateListItem {
  _id: string;
  fullName: string;
  email?: string;
  currentDesignation?: string;
  currentCity?: string;
  skills?: string[];
  totalExperienceYears?: number;
}

const parseStatusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

export const CandidateListPage = () => {
  const [search, setSearch] = useState("");
  const [expMin, setExpMin] = useState("");
  const [expMax, setExpMax] = useState("");
  const [sortBy, setSortBy] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", { search, expMin, expMax, sortBy }],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      if (expMin) p.append("experienceMin", expMin);
      if (expMax) p.append("experienceMax", expMax);
      if (sortBy) p.append("sortBy", sortBy);
      const res = await client.get(`/candidates?${p.toString()}`);
      return (res.data.data?.candidates ?? []) as CandidateListItem[];
    },
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => client.delete(`/candidates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });

  const candidates = data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Candidates
          </h2>
          <p className="text-sm text-[#6B7280]">Everyone in your talent pool.</p>
        </div>
        <Link to="/app/candidates/upload">
          <Button className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add via resume
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input placeholder="Search by name..." className="pl-9 bg-slate border-transparent focus:bg-white rounded-pill" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Input type="number" placeholder="Min exp (yrs)" className="bg-slate border-transparent rounded-pill md:w-36" value={expMin} onChange={(e) => setExpMin(e.target.value)} />
          <Input type="number" placeholder="Max exp (yrs)" className="bg-slate border-transparent rounded-pill md:w-36" value={expMax} onChange={(e) => setExpMax(e.target.value)} />
          <select className="px-4 py-2 bg-slate border-transparent rounded-pill text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="">Newest first</option>
            <option value="experience">Most experienced</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate/50 text-[10px] uppercase tracking-widest text-[#6B7280] font-medium border-b border-border">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Skills</th>
                <th className="px-6 py-4">Exp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#6B7280]">Loading candidates...</td></tr>
              ) : candidates.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#6B7280]">No candidates found.</td></tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c._id} className="hover:bg-slate/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-ink">
                      <Link to={`/app/candidates/${c._id}`} className="hover:text-primary transition-colors">{c.fullName}</Link>
                    </td>
                    <td className="px-6 py-4 text-[#374151]">{c.currentDesignation || "—"}</td>
                    <td className="px-6 py-4 text-[#374151]">{c.currentCity || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(c.skills ?? []).slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="bg-primary-tint text-primary border-0 rounded-pill text-xs font-medium">{s}</Badge>
                        ))}
                        {(c.skills?.length ?? 0) > 3 && <span className="text-xs text-[#6B7280]">+{c.skills!.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#374151]">{c.totalExperienceYears ?? "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary"
                        onClick={() => window.confirm(`Delete candidate ${c.fullName}?`) && deleteCandidate.mutate(c._id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

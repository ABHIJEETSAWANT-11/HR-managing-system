import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { client } from "../../lib/api/client";
import { Briefcase, Search, Plus } from "lucide-react";
import { Badge } from "../../components/ui/badge";

interface Job {
  _id: string;
  title: string;
  employmentType: string;
  location: string;
  status: string;
  vacancies: number;
  publicSlug: string;
  createdAt: string;
}

export const JobsPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      
      const res = await client.get(`/jobs?${params.toString()}`);
      setJobs(res.data.data.jobs);
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [search, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-800";
      case "draft": return "bg-gray-100 text-gray-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-red-100 text-red-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Vacancies
          </h2>
          <p className="text-sm text-[#6B7280]">Manage your job postings and recruitment pipelines.</p>
        </div>
        <Link to="/app/jobs/new">
          <Button className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search jobs by title..."
              className="pl-9 bg-slate border-transparent focus:bg-white rounded-pill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 bg-slate border-transparent rounded-pill text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate/50 text-[10px] uppercase tracking-widest text-[#6B7280] font-medium border-b border-border">
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Vacancies</th>
                <th className="px-6 py-4">Posted</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#6B7280]">Loading jobs...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#6B7280]">No jobs found. Create one to get started.</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate/50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-ink">
                      <Link to={`/app/jobs/${job._id}`} className="hover:text-primary transition-colors">
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-[#374151]">{job.location || "Remote"}</td>
                    <td className="px-6 py-4 text-[#374151] capitalize">{job.employmentType.replace("_", "-")}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${getStatusColor(job.status)} border-0 rounded-pill capitalize`}>
                        {job.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[#374151]">{job.vacancies}</td>
                    <td className="px-6 py-4 text-[#374151]">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/app/jobs/${job._id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-[#6B7280] hover:text-ink">
                            View
                          </Button>
                        </Link>
                        <Link to={`/app/jobs/${job._id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary-bright">
                            Edit
                          </Button>
                        </Link>
                      </div>
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

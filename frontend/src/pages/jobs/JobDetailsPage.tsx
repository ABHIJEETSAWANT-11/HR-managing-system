import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { client } from "../../lib/api/client";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { DashboardCard } from "../../components/shared/DashboardCard";
import { Badge } from "../../components/ui/badge";
import { ArrowLeft, Edit, ExternalLink, MapPin, Briefcase, Clock, Users } from "lucide-react";
import { env } from "../../lib/env";

interface JobDetails {
  _id: string;
  title: string;
  employmentType: string;
  workplaceType: string;
  location: string;
  vacancies: number;
  minExperience: number;
  status: string;
  description: string;
  responsibilities: string;
  requirements: string;
  publicSlug: string;
  createdAt: string;
}

export const JobDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    client.get(`/jobs/${id}`).then((res) => {
      setJob(res.data.data.job);
      setIsLoading(false);
    }).catch((err) => {
      console.error(err);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) return <div className="p-8 text-center text-[#6B7280]">Loading...</div>;
  if (!job) return <div className="p-8 text-center text-red-500">Job not found</div>;

  const publicUrl = `${env.VITE_API_BASE_URL.replace("/api/v1", "")}/careers/${job.publicSlug}`;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <TopBar />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/jobs")} className="text-[#6B7280] hover:bg-slate shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-ink">{job.title}</h2>
              <Badge variant="outline" className="capitalize rounded-pill">
                {job.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-[#6B7280] mt-1">Posted on {new Date(job.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job.status === "open" && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-pill border-border text-ink bg-white hover:bg-slate flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View Public Page
              </Button>
            </a>
          )}
          <Link to={`/app/jobs/${job._id}/edit`}>
            <Button className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Job
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <DashboardCard title="Job Description">
            <div className="mt-4 prose prose-sm max-w-none text-[#374151] whitespace-pre-wrap">
              {job.description || "No description provided."}
            </div>
          </DashboardCard>

          <DashboardCard title="Responsibilities">
            <div className="mt-4 prose prose-sm max-w-none text-[#374151] whitespace-pre-wrap">
              {job.responsibilities || "No responsibilities provided."}
            </div>
          </DashboardCard>

          <DashboardCard title="Requirements">
            <div className="mt-4 prose prose-sm max-w-none text-[#374151] whitespace-pre-wrap">
              {job.requirements || "No requirements provided."}
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard title="Key Details">
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Location</p>
                  <p className="text-sm font-medium text-ink">{job.location || "Not specified"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate flex items-center justify-center text-primary shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Employment Type</p>
                  <p className="text-sm font-medium text-ink capitalize">{job.employmentType.replace("_", " ")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate flex items-center justify-center text-primary shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Workplace Type</p>
                  <p className="text-sm font-medium text-ink capitalize">{job.workplaceType}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate flex items-center justify-center text-primary shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Vacancies</p>
                  <p className="text-sm font-medium text-ink">{job.vacancies}</p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};

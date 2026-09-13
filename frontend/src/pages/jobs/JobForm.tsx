import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { client } from "../../lib/api/client";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { DashboardCard } from "../../components/shared/DashboardCard";
import { ArrowLeft, Sparkles, Save } from "lucide-react";

export const JobForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    employmentType: "full_time",
    workplaceType: "onsite",
    location: "",
    vacancies: 1,
    minExperience: "",
    status: "draft",
    description: "",
    responsibilities: "",
    requirementsText: "", // free-text requirements from the AI JD generator (kept for reference)
  });

  // Section 1: structured, scored requirements (array of {name, type, category})
  const [requirements, setRequirements] = useState<{ name: string; type: "mandatory" | "preferred"; category: "skill" | "experience" | "education" | "other" }[]>([]);

  const addRequirement = () => setRequirements((r) => [...r, { name: "", type: "mandatory", category: "skill" }]);
  const removeRequirement = (i: number) => setRequirements((r) => r.filter((_, idx) => idx !== i));
  const updateRequirement = (i: number, patch: Partial<{ name: string; type: "mandatory" | "preferred"; category: "skill" | "experience" | "education" | "other" }>) =>
    setRequirements((r) => r.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));

  useEffect(() => {
    if (isEditing) {
      client.get(`/jobs/${id}`).then((res) => {
        const job = res.data.data.job;
        setFormData({
          title: job.title,
          employmentType: job.employmentType,
          workplaceType: job.workplaceType,
          location: job.location || "",
          vacancies: job.vacancies,
          minExperience: job.minExperience?.toString() || "",
          status: job.status,
          description: job.description || "",
          responsibilities: job.responsibilities || "",
          requirementsText: typeof job.requirements === "string" ? job.requirements : "",
        });
        setRequirements(Array.isArray(job.requirements) ? job.requirements : []);
        setIsLoading(false);
      }).catch(() => {
        setError("Failed to load job details.");
        setIsLoading(false);
      });
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateJD = async () => {
    if (!formData.title) {
      setError("Please enter a Job Title first to generate a JD.");
      return;
    }
    setError("");
    setIsGenerating(true);
    try {
      const res = await client.post("/jobs/ai/generate-jd", {
        title: formData.title,
        location: formData.location,
        employmentType: formData.employmentType,
        minExperience: formData.minExperience,
      });
      
      const { draft, notice } = res.data.data;
      setFormData((prev) => ({
        ...prev,
        description: draft.description || "",
        responsibilities: draft.responsibilities || "",
        requirementsText: draft.requirements || "",
      }));
      // Show notice briefly or rely on the UI
      alert(notice);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to generate JD");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        ...formData,
        requirements, // structured, scored array (Section 1)
        vacancies: Number(formData.vacancies),
        minExperience: formData.minExperience ? Number(formData.minExperience) : undefined,
      };

      if (isEditing) {
        await client.patch(`/jobs/${id}`, payload);
      } else {
        await client.post("/jobs", payload);
      }
      navigate("/app/jobs");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to save job");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-[#6B7280]">Loading...</div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <TopBar />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/jobs")} className="text-[#6B7280] hover:bg-slate">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-xl font-bold text-ink">
          {isEditing ? "Edit Job Posting" : "Create New Job"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard title="Basic Details" className="md:col-span-2">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title <span className="text-red-500">*</span></Label>
                <Input id="title" name="title" required value={formData.title} onChange={handleChange} className="bg-slate border-transparent focus:bg-white" placeholder="e.g. Senior Product Designer" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <select id="employmentType" name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-3 py-2 bg-slate rounded-lg text-sm border-transparent focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workplaceType">Workplace Type</Label>
                  <select id="workplaceType" name="workplaceType" value={formData.workplaceType} onChange={handleChange} className="w-full px-3 py-2 bg-slate rounded-lg text-sm border-transparent focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" value={formData.location} onChange={handleChange} className="bg-slate border-transparent focus:bg-white" placeholder="e.g. San Francisco, CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vacancies">Vacancies <span className="text-red-500">*</span></Label>
                  <Input id="vacancies" name="vacancies" type="number" min="1" required value={formData.vacancies} onChange={handleChange} className="bg-slate border-transparent focus:bg-white" />
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Settings" className="md:col-span-1">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 bg-slate rounded-lg text-sm border-transparent focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="draft">Draft</option>
                  <option value="open">Open (Published)</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minExperience">Min Experience (Years)</Label>
                <Input id="minExperience" name="minExperience" type="number" min="0" value={formData.minExperience} onChange={handleChange} className="bg-slate border-transparent focus:bg-white" placeholder="e.g. 3" />
              </div>
            </div>
          </DashboardCard>
        </div>

        <DashboardCard title="Job Description">
          <div className="pt-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-primary-tint/50 rounded-xl border border-primary-tint">
              <div>
                <h4 className="text-sm font-semibold text-primary">AI Description Generator</h4>
                <p className="text-xs text-[#6B7280]">Let Gemini draft your job description based on the title and basics.</p>
              </div>
              <Button type="button" onClick={handleGenerateJD} disabled={isGenerating} className="bg-primary hover:bg-primary-bright text-white rounded-pill shrink-0 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About the Role</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="min-h-[120px] bg-slate border-transparent focus:bg-white" placeholder="Provide a brief overview of the position..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsibilities">Key Responsibilities</Label>
              <Textarea id="responsibilities" name="responsibilities" value={formData.responsibilities} onChange={handleChange} className="min-h-[120px] bg-slate border-transparent focus:bg-white" placeholder="List the day-to-day responsibilities..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirementsText">Requirements & Skills (free text)</Label>
              <Textarea id="requirementsText" name="requirementsText" value={formData.requirementsText} onChange={handleChange} className="min-h-[100px] bg-slate border-transparent focus:bg-white" placeholder="List required skills and qualifications (shown in the JD)..." />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Structured Requirements (used for Fit Scoring)">
          <div className="pt-2 space-y-3">
            <p className="text-xs text-[#6B7280]">
              Mandatory requirements disqualify a candidate if missing (but never hide the score). Preferred ones only add to the score.
            </p>
            {requirements.map((req, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-5 bg-slate border-transparent focus:bg-white"
                  placeholder={`Requirement ${i + 1} (e.g. React)`}
                  value={req.name}
                  onChange={(e) => updateRequirement(i, { name: e.target.value })}
                />
                <select
                  className="col-span-4 px-3 py-2 bg-slate rounded-lg text-sm border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={req.type}
                  onChange={(e) => updateRequirement(i, { type: e.target.value as "mandatory" | "preferred" })}
                >
                  <option value="mandatory">Mandatory</option>
                  <option value="preferred">Preferred</option>
                </select>
                <select
                  className="col-span-2 px-3 py-2 bg-slate rounded-lg text-sm border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={req.category}
                  onChange={(e) => updateRequirement(i, { category: e.target.value as "skill" | "experience" | "education" | "other" })}
                >
                  <option value="skill">Skill</option>
                  <option value="experience">Experience</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
                <button type="button" onClick={() => removeRequirement(i)} className="col-span-1 text-[#EF4444] hover:text-red-600 text-lg font-bold" aria-label="Remove requirement">
                  ×
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addRequirement} className="rounded-pill bg-white text-ink hover:bg-slate border-border">
              + Add requirement
            </Button>
          </div>
        </DashboardCard>

        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate("/app/jobs")} className="rounded-pill bg-white text-ink hover:bg-slate border-border">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Job"}
          </Button>
        </div>
      </form>
    </div>
  );
};

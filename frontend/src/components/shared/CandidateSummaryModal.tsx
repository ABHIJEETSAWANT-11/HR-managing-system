import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Briefcase, MapPin, Link2, Code, ChevronDown } from "lucide-react";

export interface WorkExperience {
  company: string;
  companyLogoUrl?: string;
  roles: { title: string; startDate: string; endDate: string; duration: string; location: string }[];
}

export interface CandidateSummaryData {
  id: string;
  fullName: string;
  photoUrl?: string;
  currentDesignation?: string;
  currentCity?: string;
  currentCountry?: string;
  about?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  skills?: string[];
  workExperiences?: WorkExperience[];
}

interface CandidateSummaryModalProps {
  candidate: CandidateSummaryData | null;
  open: boolean;
  onClose: () => void;
}

export const CandidateSummaryModal = ({ candidate, open, onClose }: CandidateSummaryModalProps) => {
  if (!candidate) return null;

  const initials = candidate.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] max-h-[85vh] overflow-y-auto p-0 rounded-[20px]">
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Briefcase className="h-4 w-4" />
            <DialogTitle className="text-sm font-semibold text-ink">Candidate Summary</DialogTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
            View details
          </Button>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Identity */}
          <div className="flex flex-col items-center text-center gap-2 pt-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={candidate.photoUrl} />
              <AvatarFallback className="bg-primary-tint text-primary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold text-ink">{candidate.fullName}</h2>
            <div className="flex items-center justify-center gap-4 text-sm text-[#6B7280]">
              {candidate.currentDesignation && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {candidate.currentDesignation}
                </span>
              )}
              {(candidate.currentCity || candidate.currentCountry) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[candidate.currentCity, candidate.currentCountry].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <Button className="w-full bg-[#95CC29] hover:bg-primary text-ink font-semibold rounded-pill flex items-center gap-2">
            View documents
            <ChevronDown className="h-4 w-4" />
          </Button>

          <Separator />

          {/* About */}
          {candidate.about && (
            <section>
              <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">About</p>
              <p className="text-sm text-[#374151] leading-relaxed">{candidate.about}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                {candidate.portfolioUrl && (
                  <a
                    href={candidate.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {candidate.portfolioUrl.replace(/https?:\/\//, "")}
                  </a>
                )}
                {candidate.githubUrl && (
                  <a
                    href={candidate.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Code className="h-3.5 w-3.5" />
                    {candidate.githubUrl.replace(/https?:\/\/(www\.)?github\.com\//, "")}
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Professional Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-2">Professional Skills</p>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="bg-primary-tint text-primary border-0 rounded-pill text-xs font-medium"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Work Experience */}
          {candidate.workExperiences && candidate.workExperiences.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium mb-3">Work Experiences</p>
              <div className="space-y-4">
                {candidate.workExperiences.map((exp, idx) => (
                  <div key={idx} className="flex gap-3">
                    {/* Company icon / connector */}
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-lg bg-slate border border-border flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {exp.company[0]}
                      </div>
                      {idx < (candidate.workExperiences?.length ?? 0) - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    {/* Roles */}
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-semibold text-ink mb-1">{exp.company}</p>
                      {exp.roles.map((role, ri) => (
                        <div key={ri} className="mb-2">
                          <p className="text-sm font-medium text-ink">{role.title}</p>
                          <p className="text-xs text-[#6B7280]">
                            {role.startDate} - {role.endDate} · {role.duration} · {role.location}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

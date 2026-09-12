import { useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { DashboardCard } from "../../components/shared/DashboardCard";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { CandidateSummaryModal } from "../../components/shared/CandidateSummaryModal";
import type { CandidateSummaryData } from "../../components/shared/CandidateSummaryModal";
import { Video } from "lucide-react";

// Mock Data
const MOCK_VACANCIES = [
  { title: "Marketing Specialist", company: "Webflow", color: "bg-blue-500", recruited: 1, total: 4 },
  { title: "Financial Analyst", company: "Zapier", color: "bg-orange-500", recruited: 0, total: 3 },
  { title: "Project Manager", company: "Framer", color: "bg-black", recruited: 2, total: 4 },
  { title: "Graphic Designer", company: "Grammarly", color: "bg-green-500", recruited: 0, total: 2 },
  { title: "Data Engineer", company: "Ramp", color: "bg-yellow-400", recruited: 0, total: 1 },
  { title: "Software Developer", company: "Confluence", color: "bg-blue-600", recruited: 0, total: 1 },
];

const MOCK_INDUSTRIES = [
  { label: "Information Technology", percentage: 30 },
  { label: "Finance", percentage: 12 },
  { label: "Automotive", percentage: 10 },
  { label: "Hospitality", percentage: 7 },
];

const MOCK_CANDIDATES = [
  { id: "1", name: "Alec Whitten", location: "New York, USA", role: "Software Engineer", level: "Senior", avatar: "A", flag: "🇺🇸" },
  { id: "2", name: "Risa Nakamoto", location: "Tokyo, Japan", role: "Project Manager", level: "Junior", avatar: "R", flag: "🇯🇵" },
  { id: "3", name: "Nicolas Wang", location: "Shanghai, China", role: "Financial Analyst", level: "Mid", avatar: "N", flag: "🇨🇳" },
  { id: "4", name: "Brianna Ware", location: "Melbourne, Australia", role: "Operations Manager", level: "Senior", avatar: "B", flag: "🇦🇺" },
];

// Single candidate mock for modal
const MOCK_CANDIDATE_DETAILS: CandidateSummaryData = {
  id: "c1",
  fullName: "Nicolas Trevino",
  currentDesignation: "Back-End Developer",
  currentCity: "Vancouver",
  currentCountry: "Canada",
  about: "I'm a Back-End Developer with over 7 years of experience. I have a deep understanding of software architecture and design principles. I'm passionate about writing clean and maintainable code, and I enjoy solving complex technical challenges to create innovative solutions that drive business growth.",
  portfolioUrl: "https://nicolastrevino.com",
  githubUrl: "https://github.com/nic-trevino",
  skills: ["Java", "Python", "C#", "Spring Boot", "Django", "ASP.NET", "MySQL", "PostgreSQL", "MongoDB", "Git", "JUnit", "Pytest"],
  workExperiences: [
    {
      company: "Confluence",
      roles: [
        {
          title: "Senior Back-End Developer",
          startDate: "Jan 2022",
          endDate: "Present",
          duration: "2 years",
          location: "Pittsburgh, USA",
        },
        {
          title: "Back-End Developer",
          startDate: "Jan 2019",
          endDate: "Dec 2021",
          duration: "3 years",
          location: "Pittsburgh, USA",
        },
      ],
    },
  ],
};

export const DashboardOverview = () => {
  const [activeTabIndustries, setActiveTabIndustries] = useState("Companies");
  const [activeTabCountries, setActiveTabCountries] = useState("Companies");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSummaryData | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <TopBar notificationCount={4} messageCount={2} />

      {/* Row 1: Upcoming Interview */}
      <DashboardCard title="Upcoming Interview" icon={<Video className="h-4 w-4" />}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary-tint text-primary font-bold">N</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-ink">Nicolas Trevino</p>
              <p className="text-xs text-[#6B7280]">Back-End Developer</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 flex-1 md:justify-center">
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-medium mb-1">Time</p>
              <p className="text-sm font-medium text-ink">10:30 AM - 11:30 AM</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-medium mb-1">Company</p>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center text-[8px] text-white font-bold">F</div>
                <p className="text-sm font-medium text-ink">Feedly</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-medium mb-1">Attendees</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <Avatar className="h-6 w-6 border-2 border-white"><AvatarFallback className="bg-blue-100 text-[10px]">A</AvatarFallback></Avatar>
                  <Avatar className="h-6 w-6 border-2 border-white"><AvatarFallback className="bg-red-100 text-[10px]">B</AvatarFallback></Avatar>
                  <Avatar className="h-6 w-6 border-2 border-white"><AvatarFallback className="bg-green-100 text-[10px]">C</AvatarFallback></Avatar>
                </div>
                <span className="text-xs font-medium text-ink">+2 peoples</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-pill border-border text-ink bg-white hover:bg-slate text-sm font-semibold" onClick={() => setSelectedCandidate(MOCK_CANDIDATE_DETAILS)}>
              View details
            </Button>
            <Button className="rounded-pill bg-[#95CC29] hover:bg-primary text-ink text-sm font-semibold">
              Join meeting
            </Button>
          </div>
        </div>
      </DashboardCard>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Current Vacancies */}
        <DashboardCard title="Current Vacancies" icon={<div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center"><div className="w-2 h-2 bg-current rounded-sm" /></div>} className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_VACANCIES.map((v) => (
              <div key={v.title} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                <div className={`w-10 h-10 rounded-lg ${v.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {v.company[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{v.title}</p>
                  <p className="text-xs text-[#6B7280] flex items-center gap-1">
                    <span className="truncate max-w-[80px]">{v.company}</span>
                    <span className="mx-1">•</span>
                    {v.recruited}/{v.total} recruited
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
          </div>
        </DashboardCard>

        {/* Industries Insight */}
        <DashboardCard
          title="Industries Insight"
          icon={<div className="w-4 h-4 flex items-end justify-between"><div className="w-1 bg-current h-2" /><div className="w-1 bg-current h-3" /><div className="w-1 bg-current h-4" /></div>}
          className="lg:col-span-2"
          tabs={[{ value: "Companies", label: "Companies" }, { value: "Candidates", label: "Candidates" }]}
          activeTab={activeTabIndustries}
          onTabChange={setActiveTabIndustries}
        >
          <div className="space-y-4 pt-2">
            {MOCK_INDUSTRIES.map((ind) => (
              <div key={ind.label}>
                <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                  <span className="text-[#6B7280]">{ind.label}</span>
                  <span>{ind.percentage}%</span>
                </div>
                <Progress value={ind.percentage} className="h-1.5 bg-slate" />
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Potential Candidates */}
        <DashboardCard title="Potential Candidates" icon={<div className="w-4 h-4 border border-current rounded-full" />} className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium border-b border-border">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Preferred Job</th>
                  <th className="pb-3 font-medium text-right">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_CANDIDATES.map((c) => (
                  <tr key={c.id} className="hover:bg-slate/50 transition-colors cursor-pointer" onClick={() => setSelectedCandidate(MOCK_CANDIDATE_DETAILS)}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary-tint text-primary font-bold">{c.avatar}</AvatarFallback></Avatar>
                        <span className="font-semibold text-ink">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 text-[#374151]">
                        <span>{c.flag}</span> {c.location}
                      </div>
                    </td>
                    <td className="py-3 text-[#374151]">{c.role}</td>
                    <td className="py-3 text-right text-[#374151]">{c.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        {/* Countries Insight */}
        <DashboardCard
          title="Countries Insight"
          icon={<div className="w-4 h-4 border border-current rounded-full" />}
          className="lg:col-span-2"
          tabs={[{ value: "Companies", label: "Companies" }, { value: "Candidates", label: "Candidates" }]}
          activeTab={activeTabCountries}
          onTabChange={setActiveTabCountries}
        >
          <div className="w-full h-40 mt-4 relative bg-slate rounded-xl overflow-hidden flex items-center justify-center">
            {/* Extremely simplified placeholder for map */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMTAwIj48cGF0aCBkPSJNMTAgNDBjNS0xMCAxNS01IDIwIDBjNS01IDE1LTUgMjAgMG0tNDAgMzBjNS0xMCAxNS01IDIwIDBjNS01IDE1LTUgMjAgMG0zMC01MGM1LTEwIDE1LTUgMjAgMGM1LTUgMTUtNSAyMCAwbS00MCAzMGM1LTEwIDE1LTUgMjAgMGM1LTUgMTUtNSAyMCAwbTMwLTUwYzUtMTAgMTUtNSAyMCAwYzUtNSAxNS01IDIwIDBtLTQwIDMwYzUtMTAgMTUtNSAyMCAwYzUtNSAxNS01IDIwIDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+')", backgroundSize: "cover" }} />
            <p className="text-xs text-[#6B7280] relative z-10 font-medium">Interactive Map Area</p>
            
            {/* Dummy map dots */}
            <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-[#95CC29] shadow-[0_0_0_4px_rgba(149,204,41,0.2)]" />
            <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 rounded-full bg-[#95CC29]" />
            <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-[#95CC29] shadow-[0_0_0_4px_rgba(149,204,41,0.2)]" />
            <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 rounded-full bg-[#95CC29]" />
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

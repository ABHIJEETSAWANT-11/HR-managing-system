import { TopBar } from "../../components/layout/TopBar";
import { Construction } from "lucide-react";

/**
 * Honest placeholder for sections that exist in the sidebar but are not built yet
 * (Schedule, Ongoing Recruitment, Analytics, Reports).
 * Its only job is to stop those links falling through to the login redirect.
 */
export const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
    <TopBar />
    <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-10 flex flex-col items-center text-center gap-3">
      <div className="h-12 w-12 rounded-full bg-primary-tint text-primary flex items-center justify-center">
        <Construction className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="text-sm text-[#6B7280] max-w-md">
        This section is coming soon. It's part of a later build phase and isn't available yet —
        nothing is wrong with your account.
      </p>
    </div>
  </div>
);

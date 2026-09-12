import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../../lib/utils";

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  tabs?: { value: string; label: string }[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  headerRight?: ReactNode;
}

export const DashboardCard = ({
  title,
  icon,
  children,
  className,
  tabs,
  activeTab,
  onTabChange,
  headerRight,
}: DashboardCardProps) => {
  return (
    <div className={cn("bg-white rounded-[20px] p-5 shadow-sm border border-[#E5E7EB]", className)}>
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#6B7280]">{icon}</span>}
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {tabs && onTabChange && (
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="h-7 bg-slate rounded-pill p-0.5">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="h-6 text-xs px-3 rounded-pill data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          {headerRight}
          <button className="p-1 text-[#6B7280] hover:text-ink rounded-md hover:bg-slate transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

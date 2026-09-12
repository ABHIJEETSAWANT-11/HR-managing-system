import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { cn } from "../../lib/utils";
import {
  LayoutGrid,
  Calendar,
  RefreshCw,
  BarChart2,
  FileText,
  Briefcase,
  Users,
  CalendarCheck,
  Gift,
  Settings,
  HelpCircle,
  ChevronLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

const mainNav = [
  { label: "Overview", icon: LayoutGrid, to: "/app/dashboard" },
  { label: "Schedule", icon: Calendar, to: "/app/schedule" },
  { label: "Ongoing Recruitment", icon: RefreshCw, to: "/app/recruitment" },
  { label: "Analytics", icon: BarChart2, to: "/app/analytics" },
  { label: "Reports", icon: FileText, to: "/app/reports" },
];

const recruitmentNav = [
  { label: "Vacancies", icon: Briefcase, to: "/app/jobs" },
  { label: "Candidates", icon: Users, to: "/app/candidates" },
  { label: "Interviews", icon: CalendarCheck, to: "/app/interviews" },
  { label: "Offers", icon: Gift, to: "/app/offers" },
];

const bottomNav = [
  { label: "Settings", icon: Settings, to: "/app/settings" },
  { label: "Help & Support", icon: HelpCircle, to: "/app/help" },
];

export const Sidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        {!collapsed && (
          <span className="font-bold text-[17px] text-ink tracking-tight">HireFlow AI</span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg hover:bg-slate text-[#6B7280] hover:text-ink transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* User card */}
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-border", collapsed && "justify-center px-2")}>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary-tint text-primary text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
            <p className="text-xs text-[#6B7280] truncate capitalize">{user?.role?.replace(/_/g, " ")}</p>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {!collapsed && <SectionLabel label="Main Menu" />}
        {mainNav.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
        {!collapsed && <SectionLabel label="Recruitment" />}
        {collapsed && <div className="my-2 border-t border-border" />}
        {recruitmentNav.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-border space-y-1">
        {bottomNav.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
      </div>
    </aside>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-medium px-3 pt-3 pb-1">{label}</p>
);

const NavItem = ({
  label,
  icon: Icon,
  to,
  collapsed,
}: {
  label: string;
  icon: React.ElementType;
  to: string;
  collapsed: boolean;
}) => (
  <NavLink
    to={to}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-pill text-sm font-medium transition-colors group",
        isActive
          ? "bg-primary-tint text-primary"
          : "text-[#6B7280] hover:bg-slate hover:text-ink",
        collapsed && "justify-center px-2"
      )
    }
  >
    {({ isActive }) => (
      <>
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-[#6B7280] group-hover:text-ink")} />
        {!collapsed && <span>{label}</span>}
      </>
    )}
  </NavLink>
);

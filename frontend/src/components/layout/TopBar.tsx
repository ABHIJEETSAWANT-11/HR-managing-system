import { Bell, Mail } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { Button } from "../ui/button";

interface TopBarProps {
  notificationCount?: number;
  messageCount?: number;
}

export const TopBar = ({ notificationCount = 0, messageCount = 0 }: TopBarProps) => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Hello, {firstName} 👋
        </h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Here's the current status for today.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-pill border-border bg-white hover:bg-slate text-sm font-medium text-[#374151] relative"
        >
          <Bell className="h-4 w-4" />
          Notifications
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-ink text-white text-[10px] flex items-center justify-center font-bold">
              {notificationCount}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-pill border-border bg-white hover:bg-slate text-sm font-medium text-[#374151] relative"
        >
          <Mail className="h-4 w-4" />
          Messages
          {messageCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-ink text-white text-[10px] flex items-center justify-center font-bold">
              {messageCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

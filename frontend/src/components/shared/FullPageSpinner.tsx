import React from "react";
import { Loader2 } from "lucide-react";

export const FullPageSpinner: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

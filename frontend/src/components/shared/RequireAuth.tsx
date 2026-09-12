import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { FullPageSpinner } from "./FullPageSpinner";

export const RequireAuth = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

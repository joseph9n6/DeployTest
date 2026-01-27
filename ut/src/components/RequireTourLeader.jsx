import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireTourLeader({ children }) {
  const { user } = useAuth();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const ok = roles.includes("TOUR_LEADER") || roles.includes("ADMIN");
  if (!ok) return <Navigate to="/profil" replace />;
  return children;
}

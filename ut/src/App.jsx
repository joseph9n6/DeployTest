import { Routes, Route, Navigate } from "react-router-dom";

// Pages
import Home from "./pages/Home.jsx";
import Trips from "./pages/Trips.jsx";
import TripDetails from "./pages/TripDetails.jsx";
import Ads from "./pages/Ads.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Cabin from "./pages/Cabin.jsx";
import Profile from "./pages/Profile.jsx";
import CreateTour from "./pages/CreateTour.jsx";

// Layout + Guards
import Layout from "./components/Layout.jsx";
import Protected from "./components/Protected.jsx";
import RequireTourLeader from "./components/RequireTourLeader.jsx";

export default function App() {
  return (
    <Routes>
      {/* Alt under Layout får banner/header/footer automatisk */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/cabin" element={<Cabin />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/profil"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />

        <Route
          path="/tours/new"
          element={
            <Protected>
              <RequireTourLeader>
                <CreateTour />
              </RequireTourLeader>
            </Protected>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}


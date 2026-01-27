import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";

function USNBanner() {
  return (
    <div className="w-full bg-green-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
        <img
          src="/images/usn banner.jpg"
          alt="USN"
          className="h-10 w-10 sm:h-11 sm:w-11 object-contain"
        />

        <span className="text-center font-semibold sm:font-bold text-sm sm:text-base tracking-wide">
          [ Dette er en studentoppgave ved USN!!! (DEMO) ]
        </span>
      </div>
    </div>
  );
}


export default function Layout() {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <USNBanner />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-gray-500">
        © 2025 APP2000 – Demo
      </footer>
    </div>
  );
}

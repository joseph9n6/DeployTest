import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const res = await register({ username, email, password });
    if (!res.ok) {
      setError(res.message);
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Registrer</h1>

      {error && <p className="rounded-md border p-2 text-sm">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm">Brukernavn</label>
          <input className="w-full rounded-md border p-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm">E-post</label>
          <input className="w-full rounded-md border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Passord</label>
          <input type="password" className="w-full rounded-md border p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" className="w-full rounded-md border px-3 py-2 hover:bg-gray-50">
          Opprett bruker
        </button>
      </form>
    </div>
  );
}




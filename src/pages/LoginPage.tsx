import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Network, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/services/adminService";

export function LoginPage() {
  const { login: authLogin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      authLogin(res);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen bg-black-main flex items-center justify-center p-4">
      {/* Top accent */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-primary" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="size-12 bg-primary flex items-center justify-center">
            <Network className="size-6 text-white" />
          </div>
          <div className="text-center">
            <p className="text-[22px] font-bold tracking-[0.3em] text-white uppercase">
              VISTA
            </p>
            <p className="text-[11px] tracking-widest text-muted-foreground uppercase mt-0.5">
              Visualizador 3D · PDG-I
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="border border-border bg-card/30 p-8 backdrop-blur-sm">
          <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-6">
            Iniciar sesión
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vista.com"
                autoComplete="email"
                required
                className="w-full bg-black-main border border-border text-white placeholder:text-muted-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary/70 transition-colors duration-150"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-black-main border border-border text-white placeholder:text-muted-foreground text-[13px] px-3 py-2.5 pr-10 focus:outline-none focus:border-primary/70 transition-colors duration-150"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[12px] text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold py-2.5 transition-colors duration-150 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Autenticando…
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          ICESI · Computación y estructuras discretas I
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname: string } } };
  const { toast } = useToast();

  const [email, setEmail] = useState("admin@btp.local");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "Connexion réussie" });
      nav(loc.state?.from?.pathname || "/", { replace: true });
    } catch (err: any) {
      toast({ title: "Échec de connexion", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-lg gradient-accent flex items-center justify-center shadow-glow">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">BTP Manager</h1>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Stocks & Chantiers</p>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border shadow-md p-6">
          <h2 className="font-semibold text-lg mb-1">Connexion</h2>
          <p className="text-sm text-muted-foreground mb-5">Accédez à votre espace de gestion.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-border text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Compte de démo</p>
            <p><span className="font-mono">admin@btp.local</span> / <span className="font-mono">Admin123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

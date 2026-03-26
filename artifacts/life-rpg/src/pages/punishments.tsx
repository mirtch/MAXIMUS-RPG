import { useGetPunishments, useCompletePunishment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";

export default function PunishmentsPage() {
  const queryClient = useQueryClient();
  const { data: punishments, isLoading } = useGetPunishments();
  const completeMutation = useCompletePunishment();

  const handleComplete = (id: number) => {
    completeMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries()
    });
  };

  if (isLoading || !punishments) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Punishments</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activePunishments = punishments.filter(p => !p.completed);
  const historyPunishments = punishments.filter(p => p.completed);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-destructive flex items-center gap-3">
          <ShieldAlert className="w-8 h-8" /> Active Penalties
        </h1>
        <p className="text-muted-foreground mt-2">Actions have consequences. Pay your debts to the system.</p>
      </div>

      {activePunishments.length === 0 ? (
        <Card className="bg-emerald-500/5 border-emerald-500/20 p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-500">Clean Record!</h2>
          <p className="text-emerald-500/70 mt-2">Keep up the discipline. 🏆</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activePunishments.map(punishment => (
            <Card key={punishment.id} className="border-destructive/50 bg-card overflow-hidden relative shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <div className="absolute top-0 left-0 w-2 h-full bg-destructive" />
              <CardHeader className="pl-8 pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Pending Penalty
                  </CardTitle>
                  <Badge variant="destructive" className="font-mono text-lg">
                    -{punishment.xpPenalty} XP
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pl-8 pt-2">
                <p className="text-lg font-medium">{punishment.description}</p>
                {punishment.deadline && (
                  <p className="text-sm text-destructive/70 mt-4 font-mono">
                    DEADLINE: {new Date(punishment.deadline).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter className="pl-8">
                <Button 
                  onClick={() => handleComplete(punishment.id)}
                  disabled={completeMutation.isPending}
                  variant="destructive"
                  className="w-full font-bold tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all"
                >
                  DEBT PAID
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {historyPunishments.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-6">Penal History</h2>
          <div className="grid gap-3">
            {historyPunishments.map(punishment => (
              <div key={punishment.id} className="flex justify-between items-center p-4 bg-secondary/30 rounded border border-border opacity-60">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="line-through">{punishment.description}</span>
                </div>
                <Badge variant="outline" className="text-muted-foreground">Paid</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

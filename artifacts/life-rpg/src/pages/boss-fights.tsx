import { useState } from "react";
import { useGetBossFights, useCreateBossFight, useCompleteBossFight } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel,
} from "@/components/ui/form";
import { Swords, Plus, Calendar as CalendarIcon, Skull } from "lucide-react";

export default function BossFightsPage() {
  const queryClient = useQueryClient();
  const { data: bossFights, isLoading } = useGetBossFights();
  const createMutation = useCreateBossFight();
  const completeMutation = useCompleteBossFight();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedBossId, setSelectedBossId] = useState<number | null>(null);

  const createForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      eventType: "EXAM",
      xpReward: 1000,
      statsInvolved: ["Intellect"],
    }
  });

  const completeForm = useForm({
    defaultValues: {
      result: "victory",
      xpEarned: 1000
    }
  });

  const handleCreateSubmit = (data: any) => {
    createMutation.mutate({ data: { ...data, xpReward: Number(data.xpReward) } }, {
      onSuccess: () => {
        setCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries();
      }
    });
  };

  const openCompleteModal = (id: number, xpReward: number) => {
    setSelectedBossId(id);
    completeForm.setValue("xpEarned", xpReward);
    completeForm.setValue("result", "victory");
    setCompleteOpen(true);
  };

  const handleCompleteSubmit = (data: any) => {
    if (!selectedBossId) return;
    completeMutation.mutate({
      id: selectedBossId,
      data: {
        result: data.result as "victory" | "defeat" | "draw",
        xpEarned: Number(data.xpEarned)
      }
    }, {
      onSuccess: () => {
        setCompleteOpen(false);
        setSelectedBossId(null);
        queryClient.invalidateQueries();
      }
    });
  };

  if (isLoading || !bossFights) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-wider">Boss Fights</h1>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const activeBosses = bossFights.filter(b => !b.completed);
  const defeatedBosses = bossFights.filter(b => b.completed);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-accent flex items-center gap-3">
            <Swords className="w-8 h-8" /> Boss Fights
          </h1>
          <p className="text-muted-foreground mt-2">Major life events. Exams, competitions, performances.</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/80 text-accent-foreground font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              <Plus className="w-4 h-4 mr-2" /> Declare Boss Fight
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-accent">
            <DialogHeader>
              <DialogTitle className="text-accent text-xl uppercase tracking-wider font-black">Summon a Boss</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Event Name</FormLabel><FormControl><Input placeholder="Calculus Final Exam" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={createForm.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Stakes / Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="eventType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="EXAM">Exam / Test</SelectItem>
                          <SelectItem value="GAME">Sports Game</SelectItem>
                          <SelectItem value="PERFORMANCE">Performance</SelectItem>
                          <SelectItem value="INTERVIEW">Interview</SelectItem>
                          <SelectItem value="OTHER">Other Challenge</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="xpReward" render={({ field }) => (
                    <FormItem><FormLabel>Base XP Pool</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/80 font-bold tracking-widest mt-4" disabled={createMutation.isPending}>
                  SUMMON
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {activeBosses.length === 0 ? (
        <Card className="bg-secondary/10 border-dashed border-border p-12 text-center">
          <Skull className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold text-muted-foreground">The realm is peaceful.</h2>
          <p className="text-sm text-muted-foreground mt-2">No active boss fights scheduled.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {activeBosses.map(boss => (
            <Card key={boss.id} className="relative overflow-hidden border-2 border-accent bg-card shadow-[0_0_30px_rgba(139,92,246,0.15)] group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-transparent opacity-50" />
              <div className="flex flex-col md:flex-row relative z-10">
                <div className="p-6 md:p-8 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 font-bold uppercase tracking-widest py-1">
                      {boss.eventType}
                    </Badge>
                    <Badge className="bg-primary/20 text-primary border-primary hover:bg-primary/20">
                      ~{boss.xpReward} XP Pool
                    </Badge>
                  </div>
                  
                  <h2 className="text-3xl font-black text-foreground mb-2 drop-shadow-md">{boss.name}</h2>
                  <p className="text-muted-foreground text-lg mb-6">{boss.description}</p>
                  
                  {boss.scheduledFor && (
                    <div className="flex items-center gap-2 text-sm text-accent font-mono font-bold bg-accent/10 w-fit px-3 py-1 rounded border border-accent/20">
                      <CalendarIcon className="w-4 h-4" /> {new Date(boss.scheduledFor).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="p-6 md:p-8 bg-secondary/30 md:w-64 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-accent/20">
                  <Button 
                    onClick={() => openCompleteModal(boss.id, boss.xpReward)}
                    size="lg"
                    className="w-full h-16 text-lg font-black tracking-widest bg-accent hover:bg-accent/80 text-accent-foreground shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:scale-105 transition-transform"
                  >
                    FIGHT
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Complete Boss Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="bg-card border-accent max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black uppercase tracking-wider text-accent">Battle Results</DialogTitle>
          </DialogHeader>
          <Form {...completeForm}>
            <form onSubmit={completeForm.handleSubmit(handleCompleteSubmit)} className="space-y-6 pt-4">
              <FormField control={completeForm.control} name="result" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-center block text-muted-foreground">OUTCOME</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-14 text-xl font-bold text-center"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="victory" className="text-emerald-500 font-bold">👑 VICTORY (Full XP)</SelectItem>
                      <SelectItem value="draw" className="text-yellow-500 font-bold">⚔️ SURVIVED (Partial XP)</SelectItem>
                      <SelectItem value="defeat" className="text-destructive font-bold">💀 DEFEAT (Minimal XP)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={completeForm.control} name="xpEarned" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-center block text-muted-foreground">XP CLAIMED</FormLabel>
                  <FormControl><Input type="number" className="h-14 text-2xl font-bold text-center font-mono text-primary" {...field} /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-14 text-lg font-black tracking-widest bg-accent hover:bg-accent/80" disabled={completeMutation.isPending}>
                CONCLUDE BATTLE
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {defeatedBosses.length > 0 && (
        <div className="mt-16 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-6">Defeated Bosses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {defeatedBosses.map(boss => (
              <Card key={boss.id} className="bg-secondary/20 border-border opacity-70">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{boss.name}</CardTitle>
                    <Badge variant="outline" className={
                      boss.result === 'victory' ? 'text-emerald-500 border-emerald-500' : 
                      boss.result === 'defeat' ? 'text-destructive border-destructive' : 'text-yellow-500 border-yellow-500'
                    }>
                      {boss.result?.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground mb-2">{boss.description}</p>
                  <div className="text-xs font-mono text-primary">Awarded {boss.xpReward} XP</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

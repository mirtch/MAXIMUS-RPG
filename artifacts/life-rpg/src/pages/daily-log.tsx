import { useState } from "react";
import { useSubmitDailyLog, useGetTodayLog } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DailyLogPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: todayLog, isLoading: isLogLoading, isError: isLogError } = useGetTodayLog({ query: { retry: false } });
  const submitMutation = useSubmitDailyLog();
  
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [logResult, setLogResult] = useState<any>(null);

  const form = useForm({
    defaultValues: {
      activities: [],
      gymDone: false,
      runningDone: false,
      basketballDone: false,
      studyDone: false,
      deepWorkDone: false,
      pianoDone: false,
      socializedToday: false,
      coldShower: false,
      meditatedToday: false,
      plannedDay: false,
      drankWater: false,
      sleepHours: 7,
      ateJunkFood: false,
      phoneHours: 2,
      notes: ""
    }
  });

  if (isLogLoading) {
    return <div className="text-center p-12 text-muted-foreground animate-pulse font-bold text-xl">Loading scroll...</div>;
  }

  // 404 means no log for today — show the form so user can submit
  const noLogYet = isLogError || !todayLog;

  if (todayLog) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary">Daily Log</h1>
          <p className="text-muted-foreground">Today's deeds are recorded in history.</p>
        </div>
        <Card className="border-primary/20 bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Log Submitted for Today!</CardTitle>
            <CardDescription className="text-center">Come back tomorrow to log your next adventures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">XP Gained</div>
                <div className="text-2xl font-bold text-primary">+{todayLog.totalXpGained}</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">XP Lost</div>
                <div className="text-2xl font-bold text-destructive">-{todayLog.totalXpLost}</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Level Ups</div>
                <div className="text-2xl font-bold text-accent">{todayLog.newLevelUps.length}</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Streaks</div>
                <div className="text-2xl font-bold text-orange-500">{todayLog.streaksUpdated.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function onSubmit(data: any) {
    const activities: string[] = [];
    
    // Convert form boolean fields to activity names that match the backend DB expectations
    if (data.gymDone) activities.push("Gym Workout");
    if (data.runningDone) activities.push("Running");
    if (data.basketballDone) activities.push("Basketball Training");
    if (data.studyDone) activities.push("Studying");
    if (data.deepWorkDone) activities.push("Deep Work");
    if (data.pianoDone) activities.push("Piano Practice");
    if (data.socializedToday) activities.push("Socialized");
    if (data.coldShower) activities.push("Cold Shower");
    if (data.meditatedToday) activities.push("Meditated");
    if (data.plannedDay) activities.push("Planned Day");
    if (data.drankWater) activities.push("Drank Water");
    
    // Evaluate sliding scales
    if (data.sleepHours >= 7) activities.push("Good Sleep");
    else if (data.sleepHours < 5) activities.push("Bad Sleep");
    
    if (data.ateJunkFood) activities.push("Ate Junk Food");
    
    if (data.phoneHours <= 1) activities.push("Low Screen Time");
    else if (data.phoneHours >= 4) activities.push("High Screen Time");

    submitMutation.mutate({
      data: {
        ...data,
        activities
      }
    }, {
      onSuccess: (res) => {
        if (res) {
          setLogResult(res);
          setResultModalOpen(true);
          queryClient.invalidateQueries();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      onError: () => {
        toast({
          title: "Submission failed",
          description: "There was an error saving your daily log.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
          <ClipboardList className="w-8 h-8" /> Daily Log
        </h1>
        <p className="text-muted-foreground">Record your actions. Face the consequences.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* PHYSICAL */}
          <Card className="border-l-4 border-l-red-500 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2"><span className="text-red-500">💪</span> Physical Training</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="gymDone" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-medium cursor-pointer">Gym Workout</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="runningDone" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-medium cursor-pointer">Running</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="basketballDone" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-medium cursor-pointer">Basketball</FormLabel>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* MENTAL & CREATIVE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-blue-500 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2"><span className="text-blue-500">🧠</span> Mental</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="studyDone" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 bg-secondary/50 rounded-lg">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-medium cursor-pointer">Study / Learning</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="deepWorkDone" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 bg-secondary/50 rounded-lg">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-medium cursor-pointer">Deep Work Block</FormLabel>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2"><span className="text-purple-500">🎹</span> Creative & Social</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="pianoDone" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 bg-secondary/50 rounded-lg">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-medium cursor-pointer">Piano Practice</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="socializedToday" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 bg-secondary/50 rounded-lg">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-medium cursor-pointer">Socialized w/ someone new</FormLabel>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          {/* HABITS */}
          <Card className="border-l-4 border-l-emerald-500 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2"><span className="text-emerald-500">✨</span> Daily Habits</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="coldShower" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Cold Shower</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="meditatedToday" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Meditated</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="plannedDay" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Planned Day</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="drankWater" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Drank 3L Water</FormLabel>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Sleep Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="sleepHours" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between mb-2">
                      <FormLabel>Hours: <span className="text-primary font-bold text-lg">{field.value}h</span></FormLabel>
                      <span className="text-xs text-muted-foreground">Optimal: 7-8h</span>
                    </div>
                    <FormControl>
                      <Slider 
                        min={3} max={12} step={0.5} 
                        value={[field.value]} 
                        onValueChange={(v) => field.onChange(v[0])} 
                        className="py-4"
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Screen Time (Entertainment)</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="phoneHours" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between mb-2">
                      <FormLabel>Hours: <span className={`font-bold text-lg ${field.value >= 4 ? 'text-destructive' : 'text-primary'}`}>{field.value}h</span></FormLabel>
                      <span className="text-xs text-muted-foreground">Danger: {'>'} 3h</span>
                    </div>
                    <FormControl>
                      <Slider 
                        min={0} max={10} step={0.5} 
                        value={[field.value]} 
                        onValueChange={(v) => field.onChange(v[0])} 
                        className="py-4"
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-l-4 border-l-destructive bg-card/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-destructive">Junk Food Penalty</h3>
                <p className="text-sm text-muted-foreground">Be honest. High XP penalty.</p>
              </div>
              <FormField control={form.control} name="ateJunkFood" render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="w-6 h-6 border-destructive data-[state=checked]:bg-destructive" /></FormControl>
                  <FormLabel className="text-destructive font-bold text-lg cursor-pointer">Ate Junk Food</FormLabel>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Captain's Log (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Reflections on today's battles..." 
                      className="min-h-[100px] resize-none bg-secondary/30"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full text-lg h-14 font-black tracking-widest hover:scale-[1.02] transition-transform duration-200 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "SEALING FATE..." : "SUBMIT LOG TO HISTORY"}
          </Button>
        </form>
      </Form>

      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border-primary">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-primary uppercase font-black tracking-widest">
              Day Complete
            </DialogTitle>
          </DialogHeader>
          
          {logResult && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                <div className="text-center w-full">
                  <div className="text-3xl font-black text-primary">+{logResult.log.totalXpGained} XP</div>
                  <div className="text-sm text-muted-foreground">GAINED</div>
                </div>
                <div className="w-px h-12 bg-border mx-4"></div>
                <div className="text-center w-full">
                  <div className="text-3xl font-black text-destructive">-{logResult.log.totalXpLost} XP</div>
                  <div className="text-sm text-muted-foreground">LOST</div>
                </div>
              </div>

              {logResult.levelUps?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-accent text-center uppercase tracking-widest">🎉 Level Ups!</h4>
                  {logResult.levelUps.map((lu: any, i: number) => (
                    <div key={i} className="bg-accent/10 border border-accent/30 p-3 rounded-lg text-center animate-in zoom-in duration-500 delay-150">
                      <span className="font-bold text-accent">{lu.statName}</span> reached <span className="font-bold">Level {lu.newLevel}</span>!
                      <div className="text-sm text-muted-foreground italic">Rank: {lu.newTitle}</div>
                    </div>
                  ))}
                </div>
              )}

              {logResult.punishmentsAssigned?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-destructive text-center uppercase tracking-widest">⚠️ Punishments</h4>
                  {logResult.punishmentsAssigned.map((p: any, i: number) => (
                    <div key={i} className="bg-destructive/10 border border-destructive/30 p-2 rounded text-center text-sm">
                      {p.description}
                    </div>
                  ))}
                </div>
              )}
              
              <Button className="w-full" onClick={() => setResultModalOpen(false)}>
                Continue
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useGetActivities, useSubmitDailyLog, useCreateActivity } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ClipboardList, Plus, X, Shield, Clock, AlertTriangle, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  fitness: { label: "Physical Training", icon: "\u{1F4AA}", color: "red" },
  athletics: { label: "Physical Training", icon: "\u{1F4AA}", color: "red" },
  intellect: { label: "Mental", icon: "\u{1F9E0}", color: "blue" },
  focus: { label: "Mental", icon: "\u{1F9E0}", color: "blue" },
  creativity: { label: "Creative & Social", icon: "\u{1F3B9}", color: "purple" },
  social: { label: "Creative & Social", icon: "\u{1F3B9}", color: "purple" },
  discipline: { label: "Daily Habits", icon: "\u{2728}", color: "emerald" },
  health: { label: "Daily Habits", icon: "\u{2728}", color: "emerald" },
  bad_habit: { label: "Penalties", icon: "\u{26A0}\u{FE0F}", color: "destructive" },
  custom: { label: "Custom", icon: "\u{1F3AF}", color: "orange" },
};

const STAT_OPTIONS = [
  "strength", "stamina", "athletics", "intellect",
  "focus", "discipline", "health", "charisma", "creativity",
];

const CATEGORY_OPTIONS = [
  "fitness", "athletics", "intellect", "focus",
  "creativity", "social", "discipline", "health", "custom",
];

interface OneTimeActivity {
  displayName: string;
  description: string;
  category: string;
  xpRewards: Array<{ statName: string; amount: number }>;
}

function getResetHour(): number {
  const stored = localStorage.getItem("maximus-rpg-reset-hour");
  return stored ? Math.min(23, Math.max(0, parseInt(stored, 10) || 0)) : 0;
}

function formatResetTime(hour: number): string {
  if (hour === 0) return "Midnight";
  if (hour === 12) return "Noon";
  return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
}

export default function DailyLogPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { toast } = useToast();

  const [resetHour, setResetHour] = useState(getResetHour);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [pendingResetHour, setPendingResetHour] = useState(resetHour);

  // Custom today-log query with resetHour support
  const { data: todayLog, isLoading: isLogLoading } = useQuery({
    queryKey: ["/api/daily-log/today", resetHour],
    queryFn: async () => {
      const res = await fetch(`/api/daily-log/today?resetHour=${resetHour}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: activities, isLoading: isActivitiesLoading } = useGetActivities();
  const submitMutation = useSubmitDailyLog();
  const createActivityMutation = useCreateActivity();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activityDurations, setActivityDurations] = useState<Map<number, number>>(new Map());
  const [sleepHours, setSleepHours] = useState(7);
  const [phoneHours, setPhoneHours] = useState(2);
  const [notes, setNotes] = useState("");
  const [oneTimeActivities, setOneTimeActivities] = useState<OneTimeActivity[]>([]);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [logResult, setLogResult] = useState<any>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  function saveResetHour() {
    localStorage.setItem("maximus-rpg-reset-hour", String(pendingResetHour));
    setResetHour(pendingResetHour);
    setResetDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/daily-log/today"] });
    toast({ title: "Day reset time updated", description: `Your day now resets at ${formatResetTime(pendingResetHour)}.` });
  }

  // Custom activity form state
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCategory, setCustomCategory] = useState("custom");
  const [customRewards, setCustomRewards] = useState<Array<{ statName: string; amount: number }>>([
    { statName: "discipline", amount: 10 },
  ]);
  const [customSaveForReuse, setCustomSaveForReuse] = useState(false);

  if (isLogLoading || isActivitiesLoading) {
    return <div className="text-center p-12 text-muted-foreground animate-pulse font-bold text-xl">Loading scroll...</div>;
  }

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
            <CardDescription className="text-center">
              Come back {resetHour === 0 ? "tomorrow" : `after ${formatResetTime(resetHour)}`} to log your next adventures.
            </CardDescription>
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
                <div className="text-2xl font-bold text-accent">{(todayLog.newLevelUps as any[]).length}</div>
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

  function toggleActivity(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setActivityDurations(prev => { const m = new Map(prev); m.delete(id); return m; });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function setDuration(id: number, mins: number) {
    setActivityDurations(prev => new Map(prev).set(id, mins));
  }

  async function toggleMustDo(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/activities/${id}/must-do`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
  }

  // Calculate missed must-do's
  const mustDoActivities = (activities || []).filter((a: any) => a.isMustDo);
  const missedMustDos = mustDoActivities.filter((a: any) => !selectedIds.has(a.id));

  function addCustomRewardRow() {
    setCustomRewards(prev => [...prev, { statName: "discipline", amount: 10 }]);
  }

  function removeCustomRewardRow(index: number) {
    setCustomRewards(prev => prev.filter((_, i) => i !== index));
  }

  function resetCustomForm() {
    setCustomName("");
    setCustomDesc("");
    setCustomCategory("custom");
    setCustomRewards([{ statName: "discipline", amount: 10 }]);
    setCustomSaveForReuse(false);
  }

  async function handleAddCustomActivity() {
    if (!customName.trim()) return;

    const activityData = {
      displayName: customName.trim(),
      description: customDesc.trim() || customName.trim(),
      category: customCategory,
      xpRewards: customRewards,
    };

    if (customSaveForReuse) {
      createActivityMutation.mutate(
        {
          data: {
            name: customName.trim().toLowerCase().replace(/\s+/g, "_"),
            ...activityData,
            isReusable: true,
          },
        },
        {
          onSuccess: (created) => {
            if (created) {
              setSelectedIds(prev => new Set([...prev, created.id]));
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            }
            setCustomDialogOpen(false);
            resetCustomForm();
            toast({ title: "Activity saved", description: `"${customName}" added to your activity list.` });
          },
        },
      );
    } else {
      setOneTimeActivities(prev => [...prev, activityData]);
      setCustomDialogOpen(false);
      resetCustomForm();
      toast({ title: "One-time activity added", description: `"${customName}" will be logged today only.` });
    }
  }

  function onSubmit() {
    submitMutation.mutate(
      {
        data: {
          completedActivityIds: [...selectedIds],
          activityDurations: activityDurations.size > 0 ? Object.fromEntries(activityDurations) : undefined,
          sleepHours,
          phoneHours,
          notes: notes || undefined,
          oneTimeActivities: oneTimeActivities.length > 0 ? oneTimeActivities : undefined,
        },
      },
      {
        onSuccess: (res) => {
          if (res) {
            setLogResult(res);
            setResultModalOpen(true);
            queryClient.invalidateQueries();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        onError: () => {
          toast({
            title: "Submission failed",
            description: "There was an error saving your daily log.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // Group activities by visual category
  const grouped: Record<string, Array<NonNullable<typeof activities>[number]>> = {};
  for (const act of activities || []) {
    const meta = CATEGORY_META[act.category] || CATEGORY_META.custom;
    const groupKey = meta.label;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey]!.push(act);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
            <ClipboardList className="w-8 h-8" /> Daily Log
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Record your actions. Face the consequences.</p>
            <button
              onClick={() => { setPendingResetHour(resetHour); setResetDialogOpen(true); }}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title={`Day resets at ${formatResetTime(resetHour)}`}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <Button variant="outline" onClick={() => setCustomDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Custom Activity
        </Button>
      </div>

      {/* Dynamic activity groups */}
      {Object.entries(grouped).map(([groupLabel, groupActivities]) => {
        const firstCat = groupActivities[0]?.category || "custom";
        const meta = CATEGORY_META[firstCat] || CATEGORY_META.custom;
        const isPenalty = firstCat === "bad_habit";

        return (
          <Card
            key={groupLabel}
            className={`border-l-4 ${isPenalty ? "border-l-destructive bg-card/50" : `border-l-${meta.color}-500`} bg-card`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <span>{meta.icon}</span> {groupLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupActivities.map((act) => {
                const isMustDo = (act as any).isMustDo;
                const isSelected = selectedIds.has(act.id);
                return (
                  <div key={act.id} className="space-y-2">
                    <div
                      className={`flex flex-row items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? isPenalty
                            ? "bg-destructive/10 border-destructive/50"
                            : "bg-primary/10 border-primary/50"
                          : isMustDo && !isSelected
                            ? "bg-orange-500/5 border-orange-500/30"
                            : "bg-secondary/50 border-border hover:border-primary/30"
                      }`}
                      onClick={() => toggleActivity(act.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleActivity(act.id)}
                        className={isPenalty ? "border-destructive data-[state=checked]:bg-destructive" : ""}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-medium ${isPenalty ? "text-destructive" : ""}`}>{act.displayName}</span>
                          {isMustDo && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 font-bold uppercase">must-do</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(act.xpRewards as Array<{ statName: string; amount: number }>).map((r, i) => (
                            <span key={i} className={r.amount > 0 ? "text-primary" : "text-destructive"}>
                              {r.amount > 0 ? "+" : ""}{r.amount} {r.statName}{i < (act.xpRewards as any[]).length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {!act.isCore && <span className="text-xs text-muted-foreground/60 italic">custom</span>}
                          <button
                            onClick={(e) => toggleMustDo(act.id, e)}
                            className={`text-[10px] flex items-center gap-0.5 ${isMustDo ? "text-orange-500" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
                          >
                            <Shield className="w-3 h-3" />
                            {isMustDo ? "remove must-do" : "set must-do"}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 pl-7" onClick={e => e.stopPropagation()}>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="number"
                          placeholder="min"
                          min={0}
                          max={480}
                          className="w-16 h-7 text-xs text-center rounded border border-border bg-secondary/50 focus:border-primary outline-none"
                          value={activityDurations.get(act.id) || ""}
                          onChange={e => setDuration(act.id, Number(e.target.value) || 0)}
                        />
                        <span className="text-xs text-muted-foreground">minutes</span>
                        {(() => {
                          const mins = activityDurations.get(act.id) || 0;
                          if (mins >= 90) return <span className="text-xs text-primary font-bold">+75% XP</span>;
                          if (mins >= 60) return <span className="text-xs text-primary font-bold">+50% XP</span>;
                          if (mins >= 30) return <span className="text-xs text-primary font-bold">+25% XP</span>;
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* One-time activities pending */}
      {oneTimeActivities.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <span>{"\u{1F3AF}"}</span> One-Time Activities (this log only)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {oneTimeActivities.map((ota, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <span className="font-medium">{ota.displayName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {ota.xpRewards.map((r, j) => (
                      <span key={j} className={r.amount > 0 ? "text-primary" : "text-destructive"}>
                        {r.amount > 0 ? "+" : ""}{r.amount} {r.statName}{j < ota.xpRewards.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOneTimeActivities(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* METRICS - Sleep & Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sleep Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <Label>Hours: <span className="text-primary font-bold text-lg">{sleepHours}h</span></Label>
              <span className="text-xs text-muted-foreground">Optimal: 7-8h</span>
            </div>
            <Slider
              min={3} max={12} step={0.5}
              value={[sleepHours]}
              onValueChange={(v) => setSleepHours(v[0])}
              className="py-4"
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Screen Time (Entertainment)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <Label>Hours: <span className={`font-bold text-lg ${phoneHours >= 4 ? "text-destructive" : "text-primary"}`}>{phoneHours}h</span></Label>
              <span className="text-xs text-muted-foreground">Danger: {">"} 3h</span>
            </div>
            <Slider
              min={0} max={10} step={0.5}
              value={[phoneHours]}
              onValueChange={(v) => setPhoneHours(v[0])}
              className="py-4"
            />
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Captain's Log (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Reflections on today's battles..."
            className="min-h-[100px] resize-none bg-secondary/30"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Must-do warning */}
      {missedMustDos.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-orange-500 text-sm">Must-Do Activities Not Completed</div>
              <p className="text-xs text-muted-foreground mt-1">
                Submitting without these will cost you <span className="text-orange-500 font-bold">-15 XP each</span>:
              </p>
              <div className="flex gap-1 flex-wrap mt-2">
                {missedMustDos.map((a: any) => (
                  <span key={a.id} className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    {a.displayName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Button
        size="lg"
        className="w-full text-lg h-14 font-black tracking-widest hover:scale-[1.02] transition-transform duration-200 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
        disabled={submitMutation.isPending}
        onClick={onSubmit}
      >
        {submitMutation.isPending ? "SEALING FATE..." : "SUBMIT LOG TO HISTORY"}
      </Button>

      {/* Result Modal */}
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
                  <h4 className="font-bold text-accent text-center uppercase tracking-widest">Level Ups!</h4>
                  {logResult.levelUps.map((lu: any, i: number) => (
                    <div key={i} className="bg-accent/10 border border-accent/30 p-3 rounded-lg text-center animate-in zoom-in duration-500 delay-150">
                      <span className="font-bold text-accent">{lu.statName}</span> reached <span className="font-bold">Level {lu.newLevel}</span>!
                      <div className="text-sm text-muted-foreground italic">Rank: {lu.newTitle}</div>
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

      {/* Custom Activity Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Custom Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Activity Name</Label>
              <Input
                placeholder="e.g., Swimming, Guitar, Cooking..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>XP Rewards</Label>
                <Button variant="ghost" size="sm" onClick={addCustomRewardRow} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Stat
                </Button>
              </div>
              {customRewards.map((reward, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={reward.statName}
                    onValueChange={(v) => {
                      const next = [...customRewards];
                      next[i] = { ...next[i], statName: v };
                      setCustomRewards(next);
                    }}
                  >
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAT_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-[80px]"
                    value={reward.amount}
                    onChange={(e) => {
                      const next = [...customRewards];
                      next[i] = { ...next[i], amount: parseInt(e.target.value, 10) || 0 };
                      setCustomRewards(next);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">XP</span>
                  {customRewards.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeCustomRewardRow(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Use negative numbers for penalties (e.g., -20)</p>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
              <Checkbox
                checked={customSaveForReuse}
                onCheckedChange={(v) => setCustomSaveForReuse(!!v)}
              />
              <div>
                <Label className="cursor-pointer">Save for future use</Label>
                <p className="text-xs text-muted-foreground">Activity will appear in your list going forward</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCustomDialogOpen(false); resetCustomForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomActivity} disabled={!customName.trim()}>
              {customSaveForReuse ? "Save & Select" : "Add One-Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Time Settings Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg">Day Reset Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose when your day resets. After this hour, you can start logging a new day.
            </p>
            <div className="space-y-2">
              <Label>Reset Hour</Label>
              <Select value={String(pendingResetHour)} onValueChange={(v) => setPendingResetHour(parseInt(v, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, h) => (
                    <SelectItem key={h} value={String(h)}>{formatResetTime(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {pendingResetHour === 0
                ? "Default: your day resets at midnight."
                : `Your day will run from ${formatResetTime(pendingResetHour)} to ${formatResetTime(pendingResetHour === 0 ? 23 : pendingResetHour - 1)}.`
              }
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveResetHour}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

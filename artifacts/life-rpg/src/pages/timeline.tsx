import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GitBranch,
  Trophy,
  Swords,
  Star,
  Flame,
  Users,
  BookOpen,
  Target,
  Scroll,
  Shield,
  ChevronDown,
  Sparkles,
  TrendingUp,
  ArrowUp,
} from "lucide-react";

interface TimelineEvent {
  id: number;
  userId: number;
  type: string;
  data: any;
  createdAt: string;
}

interface TimelineData {
  events: TimelineEvent[];
  characterCreatedAt: string | null;
  characterName: string | null;
  characterClass: string | null;
}

const EVENT_CONFIG: Record<string, { icon: typeof Trophy; color: string; label: string; importance: "major" | "normal" | "minor" }> = {
  level_up:              { icon: ArrowUp,    color: "text-yellow-400",  label: "Level Up",              importance: "major" },
  achievement_unlocked:  { icon: Trophy,     color: "text-amber-400",   label: "Achievement Unlocked",  importance: "major" },
  boss_defeated:         { icon: Swords,     color: "text-red-400",     label: "Boss Defeated",         importance: "major" },
  streak_milestone:      { icon: Flame,      color: "text-orange-400",  label: "Streak Milestone",      importance: "major" },
  challenge_won:         { icon: Target,     color: "text-emerald-400", label: "Challenge Won",         importance: "major" },
  challenge_completed:   { icon: Target,     color: "text-teal-400",    label: "Challenge Completed",   importance: "normal" },
  quest_completed:       { icon: Scroll,     color: "text-blue-400",    label: "Quest Completed",       importance: "normal" },
  group_quest_completed: { icon: Shield,     color: "text-indigo-400",  label: "Group Quest Completed", importance: "normal" },
  friend_joined:         { icon: Users,      color: "text-pink-400",    label: "New Friend",            importance: "normal" },
  life_log:              { icon: BookOpen,    color: "text-purple-400",  label: "Life Log",              importance: "minor" },
  xp_gained:             { icon: TrendingUp, color: "text-primary",     label: "XP Gained",             importance: "minor" },
  xp_lost:               { icon: TrendingUp, color: "text-destructive", label: "XP Lost",               importance: "minor" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getEventSummary(type: string, data: any): string {
  switch (type) {
    case "level_up":
      return `${data.statName} reached Level ${data.newLevel} — ${data.newTitle}`;
    case "achievement_unlocked":
      return `Unlocked "${data.name}"`;
    case "boss_defeated":
      return `Defeated "${data.bossName}" — ${data.result} (+${data.xpEarned} XP)`;
    case "streak_milestone":
      return `${data.days}-day streak on ${data.streakName}!`;
    case "quest_completed":
      return `Completed "${data.questTitle}" (+${data.xpReward} XP)`;
    case "group_quest_completed":
      return `Completed group quest "${data.questTitle}" (+${data.xpEarned} XP)`;
    case "challenge_won":
      return `Won challenge "${data.challengeTitle}" (+${data.xpEarned} XP)`;
    case "challenge_completed":
      return `Completed challenge "${data.challengeTitle}" — ${data.result}`;
    case "friend_joined":
      return "A new ally joined your party!";
    case "life_log": {
      const stars = data.rating ? " " + "★".repeat(data.rating) : "";
      return `${data.label || "Logged"} "${data.title}"${data.subtitle ? ` by ${data.subtitle}` : ""}${stars}`;
    }
    case "xp_gained":
      return `+${data.amount} XP from: ${(data.activities || []).join(", ")}`;
    case "xp_lost":
      return `-${data.amount} XP`;
    default:
      return type.replace(/_/g, " ");
  }
}

function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const dateKey = formatDate(event.createdAt);
    const existing = groups.get(dateKey) || [];
    existing.push(event);
    groups.set(dateKey, existing);
  }
  return groups;
}

export default function TimelinePage() {
  const { token } = useAuth();
  const [data, setData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "major" | "quests" | "social">("all");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showMinor, setShowMinor] = useState(false);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch("/api/timeline?limit=500", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchTimeline();
  }, [token]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <Skeleton className="h-20 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
            <GitBranch className="w-8 h-8" /> Timeline
          </h1>
          <p className="text-muted-foreground mt-1">Your adventure has just begun. Complete activities, quests, and challenges to see your story unfold here.</p>
        </div>
        <Card className="p-12 text-center border-dashed">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No events yet. Submit your first daily log to start your timeline!</p>
        </Card>
      </div>
    );
  }

  // Filter events
  const filtered = data.events.filter((e) => {
    const config = EVENT_CONFIG[e.type];
    if (!config) return filter === "all";
    if (filter === "major") return config.importance === "major";
    if (filter === "quests") return ["quest_completed", "group_quest_completed", "boss_defeated"].includes(e.type);
    if (filter === "social") return ["friend_joined", "challenge_won", "challenge_completed"].includes(e.type);
    // "all" — hide minor events unless toggled
    if (!showMinor && config.importance === "minor") return false;
    return true;
  });

  const grouped = groupEventsByDate(filtered);

  // Count hidden minor events
  const totalMinor = data.events.filter(e => EVENT_CONFIG[e.type]?.importance === "minor").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
          <GitBranch className="w-8 h-8" /> Timeline
        </h1>
        <p className="text-muted-foreground mt-1">The tree of your life. Every milestone, every battle, every triumph.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all", label: "All Events" },
          { key: "major", label: "Milestones" },
          { key: "quests", label: "Quests & Battles" },
          { key: "social", label: "Social" },
        ] as const).map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="text-xs"
          >
            {f.label}
          </Button>
        ))}
        {filter === "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMinor(!showMinor)}
            className="text-xs text-muted-foreground ml-auto"
          >
            {showMinor ? "Hide" : "Show"} daily XP ({totalMinor})
          </Button>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: data.events.length, color: "text-primary" },
          { label: "Level Ups", value: data.events.filter(e => e.type === "level_up").length, color: "text-yellow-400" },
          { label: "Achievements", value: data.events.filter(e => e.type === "achievement_unlocked").length, color: "text-amber-400" },
          { label: "Bosses Slain", value: data.events.filter(e => e.type === "boss_defeated").length, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-secondary/50 rounded-lg p-3 text-center border border-border">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        {Array.from(grouped.entries()).map(([dateLabel, events]) => (
          <div key={dateLabel} className="mb-8">
            {/* Date header */}
            <div className="relative flex items-center mb-4 ml-12">
              <div className="absolute -left-[2.85rem] w-2.5 h-2.5 rounded-full bg-muted-foreground/40 ring-4 ring-background" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{dateLabel}</span>
            </div>

            {/* Events for this date */}
            {events.map((event) => {
              const config = EVENT_CONFIG[event.type] || { icon: Star, color: "text-muted-foreground", label: event.type, importance: "minor" as const };
              const Icon = config.icon;
              const isMajor = config.importance === "major";

              return (
                <div
                  key={event.id}
                  className="relative flex items-start gap-4 mb-3 ml-0 group cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Node on the line */}
                  <div className={`relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isMajor
                      ? `bg-background border-current ${config.color} shadow-[0_0_12px_rgba(234,179,8,0.2)]`
                      : "bg-secondary border-border group-hover:border-muted-foreground"
                  }`}>
                    <Icon className={`w-4.5 h-4.5 ${isMajor ? config.color : "text-muted-foreground group-hover:text-foreground"}`} />
                  </div>

                  {/* Content card */}
                  <div className={`flex-1 rounded-lg border p-3 transition-colors ${
                    isMajor
                      ? "bg-card border-primary/20 hover:border-primary/40"
                      : "bg-card/50 border-border hover:border-muted-foreground/50"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wider font-bold ${config.color} border-current/20`}
                          >
                            {config.label}
                          </Badge>
                          {isMajor && (
                            <Sparkles className="w-3 h-3 text-yellow-400/60" />
                          )}
                        </div>
                        <p className={`mt-1 text-sm ${isMajor ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {getEventSummary(event.type, event.data)}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-1">
                        {timeAgo(event.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Inception event — character creation */}
        {data.characterCreatedAt && (
          <div className="relative flex items-start gap-4 mb-3 ml-0">
            <div className="relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 bg-primary/20 border-primary shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 rounded-lg border border-primary/30 bg-card p-4">
              <Badge variant="default" className="text-[10px] uppercase tracking-wider font-bold bg-primary text-primary-foreground mb-2">
                Origin
              </Badge>
              <p className="font-bold text-foreground">
                {data.characterName || "MAXIMUS"} the {data.characterClass || "Warrior"} was born.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(data.characterCreatedAt)} — The adventure begins.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (() => {
                const config = EVENT_CONFIG[selectedEvent.type] || { icon: Star, color: "text-muted-foreground", label: selectedEvent.type };
                const Icon = config.icon;
                return (
                  <>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className={config.color}>{config.label}</span>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <p className="text-foreground font-medium">
                {getEventSummary(selectedEvent.type, selectedEvent.data)}
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Date: {formatDate(selectedEvent.createdAt)}</div>
                <div>Time: {formatTime(selectedEvent.createdAt)}</div>
              </div>
              {/* Show raw event data for detailed info */}
              {selectedEvent.data && Object.keys(selectedEvent.data).length > 0 && (
                <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Details</div>
                  {Object.entries(selectedEvent.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</span>
                      <span className="text-foreground font-medium">
                        {Array.isArray(value) ? (value as any[]).join(", ") : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

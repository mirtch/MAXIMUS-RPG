import { useGetStats } from "@workspace/api-client-react";
import { calculateStatLevelInfo, getStatBadge, STAT_ICONS } from "@/lib/xp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsPage() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Character Stats</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground flex items-center gap-3">
          <span className="text-primary text-4xl">📊</span> Attribute Breakdown
        </h1>
        <p className="text-muted-foreground mt-2">Detailed view of your RPG attributes and XP progression.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.map((stat) => {
          const statInfo = calculateStatLevelInfo(stat.level, stat.xp);
          const rank = getStatBadge(stat.level);
          
          return (
            <Card key={stat.id} className="overflow-hidden border border-border bg-card shadow-md">
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-4xl shadow-inner">
                  {STAT_ICONS[stat.name] || "✨"}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">{stat.displayName}</CardTitle>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-lg px-3 py-1 font-mono">
                      Level {stat.level}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{rank}</span>
                    <span className="text-sm italic text-muted-foreground">"{stat.title}"</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">XP to Level {stat.level + 1}</span>
                    <span className="font-mono">
                      <span className="text-primary">{statInfo.xpInCurrentLevel}</span>
                      <span className="text-muted-foreground"> / {statInfo.xpNeededForNextLevel}</span>
                    </span>
                  </div>
                  <Progress 
                    value={statInfo.progress} 
                    className="h-3 bg-secondary" 
                    indicatorClassName="bg-primary shadow-[0_0_8px_rgba(234,179,8,0.4)]"
                  />
                  <p className="text-xs text-right text-muted-foreground mt-1">
                    Total Lifetime XP: {stat.xp}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

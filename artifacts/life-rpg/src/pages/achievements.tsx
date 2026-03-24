import { useGetAchievements } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Lock } from "lucide-react";

export default function AchievementsPage() {
  const { data: achievements, isLoading } = useGetAchievements();

  if (isLoading || !achievements) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Trophies</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progress = Math.round((unlockedCount / totalCount) * 100) || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
            <Trophy className="w-8 h-8" /> Achievements
          </h1>
          <p className="text-muted-foreground mt-2">Milestones of your legendary journey.</p>
        </div>
        <div className="bg-secondary/50 px-6 py-3 rounded-lg border border-border text-center md:text-right">
          <div className="text-3xl font-black text-foreground">
            {unlockedCount} <span className="text-muted-foreground text-xl">/ {totalCount}</span>
          </div>
          <div className="text-sm font-bold text-primary tracking-widest">{progress}% UNLOCKED</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {achievements.map((achievement) => {
          const isUnlocked = achievement.unlocked;
          
          return (
            <Card 
              key={achievement.id} 
              className={`relative overflow-hidden transition-all duration-300 h-full ${
                isUnlocked 
                  ? 'bg-card border-primary/40 shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:border-primary' 
                  : 'bg-secondary/20 border-border grayscale opacity-60'
              }`}
            >
              {isUnlocked && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl rounded-full" />
              )}
              
              <CardHeader className="text-center pt-8 pb-4 relative z-10">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-2 shadow-inner border-4 ${isUnlocked ? 'bg-secondary border-primary text-4xl shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-background border-muted text-2xl text-muted-foreground'}`}>
                  {isUnlocked ? achievement.icon : <Lock className="w-8 h-8" />}
                </div>
                <CardTitle className={`text-lg font-bold tracking-tight ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {achievement.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="text-center relative z-10 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed h-10 line-clamp-2">
                  {achievement.description}
                </p>
                
                <div className="pt-4 border-t border-border/50">
                  {isUnlocked ? (
                    <Badge variant="default" className="w-full justify-center bg-primary text-primary-foreground font-bold tracking-widest py-1">
                      +{achievement.xpBonus} XP
                    </Badge>
                  ) : (
                    <div className="text-xs text-muted-foreground font-mono mt-2">
                      LOCKED
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

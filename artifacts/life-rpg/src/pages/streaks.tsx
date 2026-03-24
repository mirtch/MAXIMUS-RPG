import { useGetStreaks } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

export default function StreaksPage() {
  const { data: streaks, isLoading } = useGetStreaks();

  if (isLoading || !streaks) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Current Streaks</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground flex items-center gap-3">
          <Flame className="w-8 h-8 text-orange-500" /> Active Streaks
        </h1>
        <p className="text-muted-foreground mt-2">Consistency is the truest form of discipline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {streaks.map((streak) => {
          const isActive = streak.currentStreak > 0;
          const isHot = streak.currentStreak >= 3;
          const isLegendary = streak.currentStreak >= 7;
          
          return (
            <Card 
              key={streak.id} 
              className={`relative overflow-hidden transition-all duration-500 ${
                isLegendary ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] bg-card' :
                isHot ? 'border-primary/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] bg-card' :
                isActive ? 'border-primary/20 bg-card' : 'border-border bg-secondary/30 grayscale opacity-70'
              }`}
            >
              {isLegendary && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
              )}
              
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-xl flex justify-between items-center">
                  <span>{streak.displayName}</span>
                  {isActive && (
                    <Flame className={`w-6 h-6 ${isLegendary ? 'text-orange-500 animate-pulse' : 'text-primary'}`} />
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="relative z-10 flex flex-col items-center py-6">
                <div className="text-center">
                  <div className={`text-6xl font-black mb-2 font-mono ${
                    isLegendary ? 'text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-600' :
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {streak.currentStreak}
                  </div>
                  <div className="text-sm font-bold tracking-widest uppercase text-muted-foreground">
                    Days
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border w-full flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">All-time record:</span>
                  <span className="font-mono font-bold">{streak.longestStreak} days</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

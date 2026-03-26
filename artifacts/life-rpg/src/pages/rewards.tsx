import { useGetRewards, useUseReward } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Zap, Pizza, Coffee, Gamepad2, Ticket } from "lucide-react";

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const { data: rewards, isLoading } = useGetRewards();
  const useRewardMutation = useUseReward();

  const getRewardIcon = (type: string) => {
    if (type.includes("xp") || type.includes("boost")) return <Zap className="w-8 h-8 text-primary" />;
    if (type.includes("food")) return <Pizza className="w-8 h-8 text-orange-400" />;
    if (type.includes("lazy") || type.includes("rest")) return <Coffee className="w-8 h-8 text-blue-400" />;
    if (type.includes("game") || type.includes("play")) return <Gamepad2 className="w-8 h-8 text-purple-400" />;
    return <Ticket className="w-8 h-8 text-emerald-400" />;
  };

  const handleUseReward = (id: number) => {
    useRewardMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
      }
    });
  };

  if (isLoading || !rewards) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Inventory</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const unusedRewards = rewards.filter(r => !r.used);
  const usedRewards = rewards.filter(r => r.used);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
          <Gift className="w-8 h-8" /> Inventory & Loot
        </h1>
        <p className="text-muted-foreground mt-2">Rewards earned through hard work. Spend them wisely.</p>
      </div>

      {unusedRewards.length === 0 ? (
        <Card className="bg-secondary/20 border-dashed border-border p-12 text-center">
          <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-bold text-muted-foreground">Inventory Empty</h2>
          <p className="text-sm text-muted-foreground mt-2">Complete quests and level up to earn rewards!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {unusedRewards.map(reward => (
            <Card key={reward.id} className="relative overflow-hidden border-primary/30 bg-card hover:border-primary transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 shadow-inner">
                  {getRewardIcon(reward.type)}
                </div>
                <CardTitle className="text-lg font-bold">{reward.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground h-16">
                {reward.description}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleUseReward(reward.id)}
                  disabled={useRewardMutation.isPending}
                  className="w-full font-bold tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.2)] hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-shadow"
                >
                  USE ITEM
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {usedRewards.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-6">Consumed Items</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 opacity-50 grayscale">
            {usedRewards.map(reward => (
              <Card key={reward.id} className="bg-secondary/10 border-border">
                <CardHeader className="p-4 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded bg-background flex items-center justify-center scale-75">
                    {getRewardIcon(reward.type)}
                  </div>
                  <div>
                    <CardTitle className="text-sm line-through">{reward.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] mt-1 px-1 h-4">USED</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

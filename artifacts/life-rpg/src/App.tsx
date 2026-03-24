import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth";

// Pages
import CharacterPage from "@/pages/character";
import StatsPage from "@/pages/stats";
import DailyLogPage from "@/pages/daily-log";
import QuestsPage from "@/pages/quests";
import StreaksPage from "@/pages/streaks";
import RewardsPage from "@/pages/rewards";
import PunishmentsPage from "@/pages/punishments";
import AchievementsPage from "@/pages/achievements";
import BossFightsPage from "@/pages/boss-fights";
import SaveGamePage from "@/pages/save-game";
import FriendsPage from "@/pages/friends";
import GroupQuestsPage from "@/pages/group-quests";

const queryClient = new QueryClient();

function GameRouter() {
  return (
    <Switch>
      <Route path="/" component={CharacterPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/daily-log" component={DailyLogPage} />
      <Route path="/quests" component={QuestsPage} />
      <Route path="/streaks" component={StreaksPage} />
      <Route path="/rewards" component={RewardsPage} />
      <Route path="/punishments" component={PunishmentsPage} />
      <Route path="/achievements" component={AchievementsPage} />
      <Route path="/boss-fights" component={BossFightsPage} />
      <Route path="/save-game" component={SaveGamePage} />
      <Route path="/friends" component={FriendsPage} />
      <Route path="/group-quests" component={GroupQuestsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">⚔️</div>
          <p className="text-muted-foreground">Loading MAXIMUS RPG...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <GameRouter />
    </Layout>
  );
}

function App() {
  return (
    <div className="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AuthGate />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;

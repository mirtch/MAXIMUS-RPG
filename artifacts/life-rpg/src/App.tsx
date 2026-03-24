import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";

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

const queryClient = new QueryClient();

function Router() {
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Use React Query setup and Layout wrapper
  return (
    <div className="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;

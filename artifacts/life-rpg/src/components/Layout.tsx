import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetCharacter } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { calculateLevelInfo } from "@/lib/xp";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import {
  Home,
  BarChart,
  ClipboardList,
  Scroll,
  Flame,
  Gift,
  ShieldAlert,
  Trophy,
  Swords,
  HardDrive,
  Users,
  Shield,
  BookOpen,
  Target,
  GitBranch,
  LogOut,
} from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Character", path: "/", icon: Home },
  { name: "Stats", path: "/stats", icon: BarChart },
  { name: "Daily Log", path: "/daily-log", icon: ClipboardList },
  { name: "Quests", path: "/quests", icon: Scroll },
  { name: "Streaks", path: "/streaks", icon: Flame },
  { name: "Rewards", path: "/rewards", icon: Gift },
  { name: "Punishments", path: "/punishments", icon: ShieldAlert },
  { name: "Achievements", path: "/achievements", icon: Trophy },
  { name: "Boss Fights", path: "/boss-fights", icon: Swords },
  { name: "Timeline", path: "/timeline", icon: GitBranch },
  { name: "Life Log", path: "/life-log", icon: BookOpen },
  { name: "Challenges", path: "/challenges", icon: Target },
  { name: "Friends", path: "/friends", icon: Users },
  { name: "Group Quests", path: "/group-quests", icon: Shield },
  { name: "Save Game", path: "/save-game", icon: HardDrive },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: character, isLoading } = useGetCharacter();
  const { user, logout } = useAuth();

  const levelInfo = character ? calculateLevelInfo(character.totalXp) : null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar variant="sidebar" className="border-r border-sidebar-border">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            {isLoading || !character || !levelInfo ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 bg-sidebar-accent" />
                <Skeleton className="h-4 w-24 bg-sidebar-accent" />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  {(character as any).profilePicture ? (
                    <img src={(character as any).profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-sidebar-border" />
                  ) : (
                    <span className="text-2xl">{(character as any).avatar || "⚔️"}</span>
                  )}
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-sidebar-primary uppercase">
                      {character.name}
                    </h2>
                    <p className="text-sm text-sidebar-foreground">
                      Lvl {levelInfo.level} {character.class}
                    </p>
                  </div>
                </div>
                {user && (
                  <p className="text-xs text-muted-foreground mt-1">@{user.username}</p>
                )}
              </div>
            )}
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.path}
                        tooltip={item.name}
                        className={location === item.path ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                      >
                        <Link href={item.path} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Logout">
                      <button onClick={logout} className="flex items-center gap-3 w-full text-muted-foreground hover:text-foreground">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 lg:hidden">
            <SidebarTrigger className="-ml-1" />
            <div className="font-semibold text-primary">MAXIMUS RPG</div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto w-full h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

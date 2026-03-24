import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, Trophy, Activity, Clock, Share2, Flame, BarChart } from "lucide-react";

interface Friend {
  id: number;
  username: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
  character: {
    name: string;
    class: string;
    overallLevel: number;
    totalXp: number;
    title: string;
    avatar: string;
  } | null;
}

interface FriendRequest {
  id: number;
  sender: { id: number; username: string; displayName: string; avatar: string };
  createdAt: string;
}

interface FeedEntry {
  id: number;
  userId: number;
  type: string;
  data: any;
  createdAt: string;
  username: string;
  displayName: string;
  avatar: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatar: string;
  class: string;
  overallLevel: number;
  totalXp: number;
  title: string;
  username: string;
  displayName: string;
  isOnline: boolean;
  isYou: boolean;
}

function feedLabel(type: string, data: any): string {
  switch (type) {
    case "quest_completed": return `completed "${data.questTitle}" (${data.questType} quest) +${data.xpReward} XP`;
    case "level_up": return `leveled up ${data.statName} to level ${data.newLevel} (${data.newTitle})!`;
    case "xp_gained": return `earned ${data.amount} XP from: ${(data.activities || []).join(", ")}`;
    case "boss_defeated": return `defeated boss "${data.bossName}" — ${data.result} (+${data.xpEarned} XP)`;
    case "achievement_unlocked": return `unlocked achievement "${data.name}"!`;
    case "group_quest_completed": return `completed group quest "${data.questTitle}" (+${data.xpEarned} XP)`;
    case "friend_joined": return "became friends with you!";
    case "streak_milestone": return `hit a ${data.days}-day streak on ${data.streakName}!`;
    case "life_log": return `${data.label} "${data.title}"${data.subtitle ? ` by ${data.subtitle}` : ""}${data.rating ? ` (${"★".repeat(data.rating)})` : ""} +${data.xpAwarded} XP`;
    case "challenge_completed": return `completed challenge "${data.challengeTitle}" — ${data.result} (+${data.xpEarned} XP)`;
    case "challenge_won": return `won challenge "${data.challengeTitle}" (+${data.xpEarned} XP)`;
    default: return type;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FriendsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"friends" | "feed" | "leaderboard" | "streaks" | "weekly">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyRecaps, setWeeklyRecaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState("");
  const [addStatus, setAddStatus] = useState("");
  const [copied, setCopied] = useState(false);

  const shareApp = () => {
    const text = `Join me on MAXIMUS RPG! Level up your real life.\n\nhttps://maximus-rpg.vercel.app\n\nTo install as an app on iPhone:\n1. Open the link in Safari\n2. Tap the Share button (square with arrow)\n3. Scroll down and tap "Add to Home Screen"\n4. Tap Add — done!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fRes, rRes, feedRes, lbRes, wrRes] = await Promise.all([
        fetch("/api/friends", { headers }),
        fetch("/api/friends/requests", { headers }),
        fetch("/api/friends/feed", { headers }),
        fetch("/api/friends/leaderboard", { headers }),
        fetch("/api/weekly-recap/friends", { headers }),
      ]);
      setFriends(await fRes.json());
      setRequests(await rRes.json());
      setFeed(await feedRes.json());
      setLeaderboard(await lbRes.json());
      setWeeklyRecaps(await wrRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const sendRequest = async () => {
    if (!addUsername.trim()) return;
    setAddStatus("");
    const res = await fetch("/api/friends/request", { method: "POST", headers, body: JSON.stringify({ username: addUsername.trim() }) });
    const data = await res.json();
    setAddStatus(res.ok ? data.message : data.error);
    if (res.ok) setAddUsername("");
  };

  const acceptRequest = async (friendshipId: number) => {
    await fetch("/api/friends/accept", { method: "POST", headers, body: JSON.stringify({ friendshipId }) });
    fetchAll();
  };

  const declineRequest = async (friendshipId: number) => {
    await fetch("/api/friends/decline", { method: "POST", headers, body: JSON.stringify({ friendshipId }) });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Social</h1>
        <div className="flex gap-1 flex-wrap">
          {([["friends", "Friends", Users], ["feed", "Feed", Activity], ["leaderboard", "Ranks", Trophy], ["streaks", "Streaks", Flame], ["weekly", "Weekly", BarChart]] as const).map(([key, label, Icon]) => (
            <Button key={key} variant={tab === key ? "default" : "outline"} size="sm" onClick={() => setTab(key)}>
              <Icon className="w-4 h-4 mr-1" />{label}
            </Button>
          ))}
        </div>
      </div>

      {/* Add Friend */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Input placeholder="Add friend by username..." value={addUsername} onChange={e => setAddUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && sendRequest()} />
          <Button onClick={sendRequest}><UserPlus className="w-4 h-4 mr-1" />Add</Button>
        </div>
        {addStatus && <p className="text-sm mt-2 text-muted-foreground">{addStatus}</p>}
        <button onClick={shareApp} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-3">
          <Share2 className="w-4 h-4" />
          {copied ? "Copied! Send it to your friends." : "Invite friends (copies link + install instructions)"}
        </button>
      </Card>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase">Pending Requests</h3>
          {requests.map(r => (
            <div key={r.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{r.sender.avatar}</span>
                <div>
                  <div className="font-medium">{r.sender.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{r.sender.username}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => acceptRequest(r.id)}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => declineRequest(r.id)}>Decline</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === "friends" && (
        <div className="grid gap-3 md:grid-cols-2">
          {friends.length === 0 ? (
            <Card className="p-8 col-span-2 text-center text-muted-foreground">
              No friends yet. Add someone by their username!
            </Card>
          ) : friends.map(f => (
            <Card key={f.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{f.character?.avatar || f.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{f.character?.name || f.displayName}</span>
                    <Badge variant={f.isOnline ? "default" : "secondary"} className="text-xs">
                      {f.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{f.username} · Lvl {f.character?.overallLevel || 1} {f.character?.class || "Warrior"}
                  </div>
                  <div className="text-xs text-muted-foreground">{f.character?.totalXp || 0} XP · {f.character?.title || "Novice"}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "feed" && (
        <div className="space-y-3">
          {feed.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No activity yet. Add friends to see their progress!</Card>
          ) : feed.map(entry => (
            <Card key={entry.id} className="p-3">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{entry.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-semibold">{entry.displayName}</span>
                    <span className="text-muted-foreground"> {feedLabel(entry.type, entry.data)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />{timeAgo(entry.createdAt)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Add friends to see the leaderboard!</Card>
          ) : leaderboard.map(entry => (
            <Card key={entry.userId} className={`p-3 ${entry.isYou ? "border-primary" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${entry.rank === 1 ? "bg-yellow-500/20 text-yellow-500" : entry.rank === 2 ? "bg-gray-400/20 text-gray-400" : entry.rank === 3 ? "bg-amber-700/20 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  #{entry.rank}
                </div>
                <span className="text-2xl">{entry.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{entry.name}</span>
                    {entry.isYou && <Badge variant="outline" className="text-xs">You</Badge>}
                    <Badge variant={entry.isOnline ? "default" : "secondary"} className="text-xs">
                      {entry.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Lvl {entry.overallLevel} {entry.class} · {entry.title}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{entry.totalXp.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "streaks" && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Add friends to compare streaks!</Card>
          ) : (
            <>
              {/* Build streak rankings from friends + self */}
              {(() => {
                // We don't have streaks in the friends data yet, so show a message to check individual profiles
                return (
                  <Card className="p-6 text-center space-y-3">
                    <Flame className="w-12 h-12 text-primary mx-auto" />
                    <h3 className="font-bold text-lg">Streak Rankings</h3>
                    <p className="text-muted-foreground text-sm">
                      Check the Streaks page to see your active streaks. Streak leaderboard coming soon with friend streak data!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tip: Maintain long streaks to climb the ranks. Your friends can see your streak milestones in the feed.
                    </p>
                  </Card>
                );
              })()}
            </>
          )}
        </div>
      )}

      {tab === "weekly" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Week's Rankings</h3>
          {weeklyRecaps.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No data this week yet. Start logging activities!</Card>
          ) : weeklyRecaps.map((recap: any, i: number) => (
            <Card key={recap.userId} className={`p-4 ${recap.isYou ? "border-primary" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-gray-400/20 text-gray-400" : i === 2 ? "bg-amber-700/20 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  #{i + 1}
                </div>
                <span className="text-xl">{recap.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{recap.displayName}</span>
                    {recap.isYou && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {recap.daysLogged} days logged · {recap.activitiesCompleted} activities
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">+{recap.xpGained}</div>
                  <div className="text-xs text-muted-foreground">XP this week</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

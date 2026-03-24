import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Plus, Check, Clock, Trophy, X } from "lucide-react";

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  xpStake: number;
  deadline: string;
  status: string;
  challengerCompleted: boolean;
  challengedCompleted: boolean;
  winnerId: number | null;
  isChallenger: boolean;
  yourCompleted: boolean;
  challenger: { id: number; username: string; displayName: string; avatar: string } | undefined;
  challenged: { id: number; username: string; displayName: string; avatar: string } | undefined;
}

function timeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

export default function ChallengesPage() {
  const { token } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState("");

  // Form
  const [targetUsername, setTargetUsername] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xpStake, setXpStake] = useState("");
  const [deadline, setDeadline] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchAll = async () => {
    setLoading(true);
    const res = await fetch("/api/challenges", { headers });
    setChallenges(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const createChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim() || !title.trim() || !deadline) return;
    const res = await fetch("/api/challenges", {
      method: "POST", headers,
      body: JSON.stringify({ username: targetUsername.trim(), title: title.trim(), description: description.trim() || null, xpStake: Number(xpStake) || 100, deadline }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error); return; }
    setTargetUsername(""); setTitle(""); setDescription(""); setXpStake(""); setDeadline(""); setShowForm(false);
    fetchAll();
  };

  const acceptChallenge = async (id: number) => {
    await fetch(`/api/challenges/${id}/accept`, { method: "POST", headers });
    fetchAll();
  };

  const declineChallenge = async (id: number) => {
    await fetch(`/api/challenges/${id}/decline`, { method: "POST", headers });
    fetchAll();
  };

  const completeChallenge = async (id: number) => {
    const res = await fetch(`/api/challenges/${id}/complete`, { method: "POST", headers });
    const data = await res.json();
    setStatus(data.message);
    fetchAll();
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  const pending = challenges.filter(c => c.status === "pending" && !c.isChallenger);
  const active = challenges.filter(c => c.status === "active");
  const pendingSent = challenges.filter(c => c.status === "pending" && c.isChallenger);
  const completed = challenges.filter(c => c.status === "completed").slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-sm text-muted-foreground">Duel your friends. XP on the line.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Swords className="w-4 h-4 mr-1" />New Challenge
        </Button>
      </div>

      {status && <Card className="p-3 text-sm">{status}</Card>}

      {showForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Challenge a Friend</h3>
          <form onSubmit={createChallenge} className="space-y-3">
            <Input placeholder="Friend's username" value={targetUsername} onChange={e => setTargetUsername(e.target.value)} />
            <Input placeholder="Challenge title e.g. 'Run 3 times this week'" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">XP Stake</Label>
                <Input placeholder="e.g. 100" type="number" value={xpStake} onChange={e => setXpStake(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Deadline</Label>
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">Send Challenge</Button>
          </form>
        </Card>
      )}

      {/* Incoming challenges */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Incoming Challenges</h3>
          {pending.map(c => (
            <Card key={c.id} className="p-4 border-primary/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.challenger?.avatar}</span>
                    <span className="font-semibold">{c.challenger?.displayName}</span>
                    <span className="text-muted-foreground">challenges you:</span>
                  </div>
                  <p className="font-bold mt-1">{c.title}</p>
                  {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{c.xpStake} XP at stake</Badge>
                    <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{timeLeft(c.deadline)}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => acceptChallenge(c.id)}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => declineChallenge(c.id)}>Decline</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Active challenges */}
      {active.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Duels</h3>
          {active.map(c => {
            const opponent = c.isChallenger ? c.challenged : c.challenger;
            const opponentCompleted = c.isChallenger ? c.challengedCompleted : c.challengerCompleted;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold">{c.title}</p>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{c.xpStake} XP</Badge>
                      <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{timeLeft(c.deadline)}</Badge>
                      <Badge variant={c.yourCompleted ? "default" : "secondary"}>
                        You: {c.yourCompleted ? "Done" : "In Progress"}
                      </Badge>
                      <Badge variant={opponentCompleted ? "default" : "secondary"}>
                        {opponent?.displayName}: {opponentCompleted ? "Done" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                  {!c.yourCompleted && (
                    <Button size="sm" onClick={() => completeChallenge(c.id)}>
                      <Check className="w-4 h-4 mr-1" />Done
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sent (waiting acceptance) */}
      {pendingSent.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sent (Awaiting Response)</h3>
          {pendingSent.map(c => (
            <Card key={c.id} className="p-3 opacity-70">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{c.title}</span>
                <span className="text-sm text-muted-foreground">vs {c.challenged?.displayName}</span>
                <Badge variant="outline">{c.xpStake} XP</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">History</h3>
          {completed.map(c => {
            const opponent = c.isChallenger ? c.challenged : c.challenger;
            const won = c.winnerId === (c.isChallenger ? c.challenger?.id : c.challenged?.id);
            const draw = !c.winnerId;
            return (
              <Card key={c.id} className="p-3 opacity-60">
                <div className="flex items-center gap-2">
                  {draw ? <Trophy className="w-4 h-4 text-primary" /> : won ? <Trophy className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-red-500" />}
                  <span className="font-medium">{c.title}</span>
                  <span className="text-sm text-muted-foreground">vs {opponent?.displayName}</span>
                  <Badge variant={draw ? "default" : won ? "default" : "secondary"}>
                    {draw ? "Draw" : won ? `Won +${c.xpStake} XP` : `Lost -${c.xpStake} XP`}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {challenges.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No challenges yet. Challenge a friend and put your XP on the line!
        </Card>
      )}
    </div>
  );
}

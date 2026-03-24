import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Users, Plus, Check, Crown, UserPlus } from "lucide-react";

interface Party {
  id: number;
  name: string;
  leaderId: number;
  isLeader: boolean;
  members: { partyId: number; userId: number; username: string; displayName: string; avatar: string }[];
}

interface GroupQuest {
  id: number;
  partyId: number;
  title: string;
  description: string;
  xpReward: number;
  bonusMultiplier: string;
  completed: boolean;
  party: { id: number; name: string } | null;
  contributions: { questId: number; userId: number; contributed: boolean; username: string; displayName: string; avatar: string }[];
  yourContribution: { contributed: boolean } | undefined;
}

export default function GroupQuestsPage() {
  const { token, user } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [quests, setQuests] = useState<GroupQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [showInvite, setShowInvite] = useState<number | null>(null);
  const [partyName, setPartyName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [questTitle, setQuestTitle] = useState("");
  const [questDesc, setQuestDesc] = useState("");
  const [questXp, setQuestXp] = useState("500");
  const [questPartyId, setQuestPartyId] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, qRes] = await Promise.all([
      fetch("/api/parties", { headers }),
      fetch("/api/group-quests", { headers }),
    ]);
    setParties(await pRes.json());
    setQuests(await qRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const createParty = async () => {
    if (!partyName.trim()) return;
    await fetch("/api/parties", { method: "POST", headers, body: JSON.stringify({ name: partyName }) });
    setPartyName("");
    setShowCreateParty(false);
    fetchAll();
  };

  const inviteMember = async (partyId: number) => {
    if (!inviteUsername.trim()) return;
    const res = await fetch(`/api/parties/${partyId}/invite`, { method: "POST", headers, body: JSON.stringify({ username: inviteUsername }) });
    const data = await res.json();
    setStatus(res.ok ? data.message : data.error);
    if (res.ok) { setInviteUsername(""); setShowInvite(null); fetchAll(); }
  };

  const createQuest = async () => {
    if (!questTitle.trim() || !questDesc.trim() || !questPartyId) return;
    await fetch("/api/group-quests", {
      method: "POST", headers,
      body: JSON.stringify({ partyId: questPartyId, title: questTitle, description: questDesc, xpReward: Number(questXp) || 500 }),
    });
    setQuestTitle(""); setQuestDesc(""); setQuestXp("500"); setShowCreateQuest(false);
    fetchAll();
  };

  const contribute = async (questId: number) => {
    const res = await fetch(`/api/group-quests/${questId}/contribute`, { method: "POST", headers });
    const data = await res.json();
    setStatus(data.message);
    fetchAll();
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  const activeQuests = quests.filter(q => !q.completed);
  const completedQuests = quests.filter(q => q.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Group Quests</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCreateParty(!showCreateParty)}>
            <Users className="w-4 h-4 mr-1" />New Party
          </Button>
          {parties.length > 0 && (
            <Button size="sm" onClick={() => { setShowCreateQuest(!showCreateQuest); setQuestPartyId(parties[0].id); }}>
              <Plus className="w-4 h-4 mr-1" />New Quest
            </Button>
          )}
        </div>
      </div>

      {status && <Card className="p-3 text-sm text-muted-foreground">{status}</Card>}

      {showCreateParty && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Create Party</h3>
          <Input placeholder="Party name..." value={partyName} onChange={e => setPartyName(e.target.value)} />
          <Button onClick={createParty}>Create</Button>
        </Card>
      )}

      {showCreateQuest && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Create Group Quest</h3>
          <div className="space-y-2">
            <Label>Party</Label>
            <div className="flex gap-2 flex-wrap">
              {parties.map(p => (
                <Button key={p.id} size="sm" variant={questPartyId === p.id ? "default" : "outline"} onClick={() => setQuestPartyId(p.id)}>
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
          <Input placeholder="Quest title" value={questTitle} onChange={e => setQuestTitle(e.target.value)} />
          <Input placeholder="Description" value={questDesc} onChange={e => setQuestDesc(e.target.value)} />
          <Input placeholder="XP reward" type="number" value={questXp} onChange={e => setQuestXp(e.target.value)} />
          <Button onClick={createQuest}>Create Quest</Button>
        </Card>
      )}

      {/* Parties */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Your Parties</h2>
        {parties.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No parties yet. Create one and invite friends!</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {parties.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{p.name}</span>
                    {p.isLeader && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowInvite(showInvite === p.id ? null : p.id)}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {p.members.map(m => (
                    <Badge key={m.userId} variant="secondary" className="gap-1">
                      <span>{m.avatar}</span>{m.displayName}
                    </Badge>
                  ))}
                </div>
                {showInvite === p.id && (
                  <div className="flex gap-2 mt-3">
                    <Input placeholder="Username to invite" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} className="flex-1" />
                    <Button size="sm" onClick={() => inviteMember(p.id)}>Invite</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Group Quests</h2>
          <div className="space-y-3">
            {activeQuests.map(q => {
              const done = q.contributions.filter(c => c.contributed).length;
              const total = q.contributions.length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              const effectiveXp = Math.floor(q.xpReward * parseFloat(q.bonusMultiplier));

              return (
                <Card key={q.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{q.title}</h3>
                      <p className="text-sm text-muted-foreground">{q.description}</p>
                    </div>
                    <Badge variant="outline">{effectiveXp} XP each (1.5x bonus)</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{done}/{total} contributions</span>
                      <span className="text-muted-foreground">{q.party?.name}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {q.contributions.map(c => (
                      <Badge key={c.userId} variant={c.contributed ? "default" : "secondary"} className="gap-1">
                        {c.contributed ? <Check className="w-3 h-3" /> : null}
                        {c.avatar} {c.displayName}
                      </Badge>
                    ))}
                  </div>
                  {q.yourContribution && !q.yourContribution.contributed && (
                    <Button onClick={() => contribute(q.id)} className="w-full">
                      <Check className="w-4 h-4 mr-1" />Mark My Contribution
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedQuests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Completed</h2>
          <div className="space-y-2 opacity-60">
            {completedQuests.map(q => (
              <Card key={q.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{q.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{q.party?.name}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

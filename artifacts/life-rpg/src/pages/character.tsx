import { useState } from "react";
import { useGetCharacter, useGetStats } from "@workspace/api-client-react";
import { calculateLevelInfo, calculateStatLevelInfo, getStatBadge, STAT_ICONS } from "@/lib/xp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Check } from "lucide-react";

const CLASSES = [
  { value: "Warrior", icon: "⚔️", bonus: "+10% STR, STA, DIS" },
  { value: "Scholar", icon: "📜", bonus: "+10% INT, DIS, CRE" },
  { value: "Monk", icon: "🧘", bonus: "+10% WLT, DIS, HP" },
  { value: "Ranger", icon: "🏹", bonus: "+10% STA, ATH, HP" },
  { value: "Artisan", icon: "🎭", bonus: "+10% CRE, CHA, WLT" },
];

export default function CharacterPage() {
  const { data: character, isLoading: isCharLoading, refetch: refetchCharacter } = useGetCharacter();
  const { data: stats, isLoading: isStatsLoading } = useGetStats();
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [saving, setSaving] = useState(false);

  const updateProfilePicture = async (dataUrl: string) => {
    await fetch("/api/auth/profile-picture", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ profilePicture: dataUrl }),
    });
    refetchCharacter();
  };

  const startEditing = () => {
    if (!character) return;
    setEditName(character.name);
    setEditClass(character.class);
    setEditing(true);
  };

  const saveChanges = async () => {
    setSaving(true);
    await fetch("/api/character", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, class: editClass }),
    });
    setEditing(false);
    setSaving(false);
    refetchCharacter();
  };

  if (isCharLoading || !character || isStatsLoading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const levelInfo = calculateLevelInfo(character.totalXp);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-2 border-primary/20 bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-primary bg-secondary flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.3)] overflow-hidden">
              <ProfilePictureUpload
                currentImage={(character as any).profilePicture}
                fallbackEmoji={(character as any).avatar || "⚔️"}
                onImageChange={updateProfilePicture}
                size="lg"
              />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4 w-full">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Character Name</label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-2xl font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Class</label>
                  <div className="flex gap-2 flex-wrap">
                    {CLASSES.map(c => (
                      <button key={c.value} onClick={() => setEditClass(c.value)}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${editClass === c.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}>
                        {c.icon} {c.value}
                        {editClass === c.value && <span className="text-xs text-primary ml-1">{c.bonus}</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveChanges} disabled={saving}>
                    <Check className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider text-foreground">
                    {character.name}
                  </h1>
                  <Badge variant="default" className="text-lg px-3 py-1 font-bold uppercase tracking-wider bg-primary text-primary-foreground border-primary">
                    Level {levelInfo.level} {character.class}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={startEditing} className="text-muted-foreground hover:text-foreground">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xl text-muted-foreground italic font-serif">
                  "{character.title}"
                </p>
              </div>
            )}

            <div className="space-y-2 max-w-2xl">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">XP Progress</span>
                <span className="text-primary">{levelInfo.currentLevelXp} / {levelInfo.xpNeeded} XP</span>
              </div>
              <Progress
                value={levelInfo.progress}
                className="h-4 bg-secondary"
                indicatorClassName="bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_10px_rgba(234,179,8,0.5)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
          <span className="text-primary">///</span> Core Attributes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const statInfo = calculateStatLevelInfo(stat.level, stat.xp);
            const rank = getStatBadge(stat.level);

            return (
              <Card key={stat.id} className="bg-card/50 hover:bg-card hover:border-primary/50 transition-colors duration-300">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{STAT_ICONS[stat.name] || "✨"}</span>
                      {stat.displayName}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono bg-background text-primary border-primary/30">
                      Lvl {stat.level}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 font-medium">
                    {rank} • {stat.title}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{statInfo.xpInCurrentLevel} XP</span>
                      <span>{statInfo.xpNeededForNextLevel} XP</span>
                    </div>
                    <Progress value={statInfo.progress} className="h-2 bg-secondary" indicatorClassName="bg-primary/80" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

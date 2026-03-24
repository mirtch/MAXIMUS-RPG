import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Film, Music, Piano, Plus, Star, Trash2 } from "lucide-react";

interface LogEntry {
  id: number;
  category: string;
  title: string;
  subtitle: string | null;
  note: string | null;
  rating: number | null;
  status: string | null;
  xpAwarded: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "book", label: "Book", icon: BookOpen, placeholder: "Book title", subtitleLabel: "Author", xp: "+25 Intellect" },
  { value: "movie", label: "Movie", icon: Film, placeholder: "Movie title", subtitleLabel: "Director/Year", xp: "+10 Creativity" },
  { value: "music", label: "Music", icon: Music, placeholder: "Song or album", subtitleLabel: "Artist", xp: "+5 Creativity" },
  { value: "piano_piece", label: "Piano Piece", icon: Piano, placeholder: "Piece name", subtitleLabel: "Composer", xp: "+50 Creativity, +20 Focus" },
  { value: "custom", label: "Other", icon: Plus, placeholder: "What did you do?", subtitleLabel: "Details", xp: "+10 Intellect" },
];

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  book: BookOpen, movie: Film, music: Music, piano_piece: Piano, custom: Plus,
};

function StarRating({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onRate(n)}
          className={`transition-colors ${n <= rating ? "text-primary" : "text-muted-foreground/30 hover:text-muted-foreground"}`}>
          <Star className="w-5 h-5" fill={n <= rating ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

export default function LifeLogPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState("book");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState("finished");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchEntries = async () => {
    setLoading(true);
    const url = filter ? `/api/life-log?category=${filter}` : "/api/life-log";
    const res = await fetch(url, { headers });
    setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [filter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/life-log", {
      method: "POST", headers,
      body: JSON.stringify({ category, title: title.trim(), subtitle: subtitle.trim() || null, note: note.trim() || null, rating: rating || null, status }),
    });
    setTitle(""); setSubtitle(""); setNote(""); setRating(0); setShowForm(false);
    fetchEntries();
  };

  const deleteEntry = async (id: number) => {
    await fetch(`/api/life-log/${id}`, { method: "DELETE", headers });
    fetchEntries();
  };

  const catConfig = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];

  if (loading && entries.length === 0) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Life Log</h1>
          <p className="text-sm text-muted-foreground">Track books, movies, music, and more.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />Log Something
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <Button key={c.value} type="button" size="sm"
                  variant={category === c.value ? "default" : "outline"}
                  onClick={() => setCategory(c.value)}>
                  <c.icon className="w-4 h-4 mr-1" />{c.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Input placeholder={catConfig.placeholder} value={title} onChange={e => setTitle(e.target.value)} />
              <Input placeholder={catConfig.subtitleLabel} value={subtitle} onChange={e => setSubtitle(e.target.value)} />
              <Input placeholder="Your thoughts (optional)" value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Rating</Label>
                <StarRating rating={rating} onRate={setRating} />
              </div>

              {category === "book" && (
                <div className="flex gap-1">
                  {["reading", "finished"].map(s => (
                    <Button key={s} type="button" size="sm" variant={status === s ? "default" : "outline"}
                      onClick={() => setStatus(s)}>
                      {s === "reading" ? "Reading" : "Finished"}
                    </Button>
                  ))}
                </div>
              )}

              {category === "piano_piece" && (
                <div className="flex gap-1">
                  {["in_progress", "mastered"].map(s => (
                    <Button key={s} type="button" size="sm" variant={status === s ? "default" : "outline"}
                      onClick={() => setStatus(s)}>
                      {s === "in_progress" ? "Learning" : "Mastered"}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-primary">{catConfig.xp}</span>
              <Button type="submit">Add to Log</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        <Button size="sm" variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>All</Button>
        {CATEGORIES.map(c => (
          <Button key={c.value} size="sm" variant={filter === c.value ? "default" : "outline"} onClick={() => setFilter(c.value)}>
            <c.icon className="w-3 h-3 mr-1" />{c.label}
          </Button>
        ))}
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nothing logged yet. Start tracking what you read, watch, and discover!
          </Card>
        ) : entries.map(entry => {
          const Icon = CATEGORY_ICONS[entry.category] || Plus;
          return (
            <Card key={entry.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{entry.title}</span>
                    {entry.rating && (
                      <div className="flex">
                        {Array.from({ length: entry.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-primary" fill="currentColor" />
                        ))}
                      </div>
                    )}
                    {entry.xpAwarded > 0 && <Badge variant="outline" className="text-xs">+{entry.xpAwarded} XP</Badge>}
                  </div>
                  {entry.subtitle && <div className="text-sm text-muted-foreground">{entry.subtitle}</div>}
                  {entry.note && <div className="text-sm text-muted-foreground italic mt-1">"{entry.note}"</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.createdAt).toLocaleDateString()}
                    {entry.status && entry.status !== "finished" && (
                      <Badge variant="secondary" className="ml-2 text-xs">{entry.status}</Badge>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

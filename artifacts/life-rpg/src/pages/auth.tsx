import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { Check, Plus, X, Share2 } from "lucide-react";

const AVATARS = ["⚔️", "🛡️", "🏹", "🧙", "🗡️", "🔮", "🐉", "🦅", "🐺", "🦁", "🔥", "⭐"];
const CLASSES = [
  {
    value: "Warrior", label: "Warrior", icon: "⚔️",
    desc: "Forged in iron and tempered by sweat, the Warrior walks the path of relentless discipline. Where others falter, you push forward — the battlefield is the gym, the arena, the cold morning run. Your body is your weapon, and every rep is a prayer to the gods of war.",
    bonus: "+10% Strength, Stamina, Discipline",
  },
  {
    value: "Scholar", label: "Scholar", icon: "📜",
    desc: "Keeper of forbidden knowledge and seeker of hidden truths. The Scholar devours tomes, deciphers ancient patterns in code and mathematics, and bends the arcane forces of intellect to their will. Your mind is a fortress — every hour of deep study adds another stone to its walls.",
    bonus: "+10% Intellect, Focus, Creativity",
  },
  {
    value: "Monk", label: "Monk", icon: "🧘",
    desc: "In the silence between heartbeats, the Monk finds infinite power. Trained in the monasteries of self-mastery, you have learned that true strength flows from stillness. Cold showers, meditation, and unwavering routine are your sacred rituals. The undisciplined mind is the only enemy you fear.",
    bonus: "+10% Focus, Discipline, Health",
  },
  {
    value: "Ranger", label: "Ranger", icon: "🏹",
    desc: "Born under open skies and restless by nature, the Ranger roams where others dare not tread. Mountains, trails, and the wild unknown are your domain. Your endurance is legendary, your body hardened by wind and stone. You do not conquer nature — you become part of it.",
    bonus: "+10% Stamina, Athletics, Health",
  },
  {
    value: "Artisan", label: "Artisan", icon: "🎭",
    desc: "The Artisan hears melodies in chaos and sees beauty in the mundane. With hands that sculpt, strings that sing, and words that cut deeper than any blade, you reshape reality itself. Your creations echo through the halls of legend — every masterpiece a spell cast upon the world.",
    bonus: "+10% Creativity, Charisma, Focus",
  },
];

// Activity catalog organized by category
const ACTIVITY_CATALOG = [
  { category: "Fitness", icon: "💪", activities: [
    { name: "gym", displayName: "Gym Workout", desc: "Weight training / gym session" },
    { name: "running", displayName: "Running", desc: "Running / cardio" },
    { name: "basketball", displayName: "Basketball", desc: "Basketball game or practice" },
    { name: "soccer", displayName: "Soccer", desc: "Soccer game or practice" },
    { name: "swimming", displayName: "Swimming", desc: "Swimming laps or session" },
    { name: "cycling", displayName: "Cycling", desc: "Bike ride or indoor cycling" },
    { name: "martialArts", displayName: "Martial Arts", desc: "Boxing, BJJ, MMA, etc." },
    { name: "yoga", displayName: "Yoga", desc: "Yoga session" },
    { name: "hiking", displayName: "Hiking", desc: "Trail hike or nature walk" },
  ]},
  { category: "Intellectual", icon: "🧠", activities: [
    { name: "study", displayName: "Study / Learning", desc: "Studying or learning new things" },
    { name: "deepWork", displayName: "Deep Work Block", desc: "Focused uninterrupted work" },
    { name: "reading", displayName: "Reading", desc: "Reading books or articles" },
    { name: "coding", displayName: "Coding", desc: "Programming or building projects" },
    { name: "language", displayName: "Language Study", desc: "Practicing a new language" },
  ]},
  { category: "Creative", icon: "🎨", activities: [
    { name: "piano", displayName: "Piano Practice", desc: "Piano or keyboard practice" },
    { name: "guitar", displayName: "Guitar Practice", desc: "Guitar or bass practice" },
    { name: "singing", displayName: "Singing", desc: "Vocal practice or singing" },
    { name: "drawing", displayName: "Drawing / Art", desc: "Drawing, painting, or digital art" },
    { name: "writing", displayName: "Creative Writing", desc: "Journaling, stories, poetry" },
    { name: "photography", displayName: "Photography", desc: "Photo shooting or editing" },
  ]},
  { category: "Discipline", icon: "🔥", activities: [
    { name: "coldShower", displayName: "Cold Shower", desc: "Cold shower (2-3 min)" },
    { name: "meditation", displayName: "Meditation", desc: "Mindfulness or meditation" },
    { name: "plannedDay", displayName: "Planned Day", desc: "Planned the day in advance" },
    { name: "noSocialMedia", displayName: "No Social Media", desc: "Full day without social media" },
    { name: "earlyWakeup", displayName: "Early Wakeup", desc: "Woke up before 7 AM" },
  ]},
  { category: "Social", icon: "🤝", activities: [
    { name: "socialized", displayName: "Socialized", desc: "Meaningful social interaction" },
    { name: "networking", displayName: "Networking", desc: "Professional networking" },
    { name: "volunteering", displayName: "Volunteering", desc: "Community service or volunteering" },
  ]},
  { category: "Family", icon: "👨‍👩‍👧‍👦", activities: [
    { name: "familyTime", displayName: "Family Time", desc: "Quality time spent with family" },
    { name: "familyCall", displayName: "Called Family", desc: "Called a parent, sibling, or relative" },
    { name: "familyMeal", displayName: "Family Meal", desc: "Shared a meal with family" },
    { name: "familyHelp", displayName: "Helped Family", desc: "Helped a family member with something" },
  ]},
  { category: "Health", icon: "❤️", activities: [
    { name: "drankWater", displayName: "Drank 3L Water", desc: "Stayed hydrated (3L+)" },
    { name: "healthyMeal", displayName: "Healthy Meal Prep", desc: "Cooked a healthy meal" },
    { name: "stretching", displayName: "Stretching", desc: "Full stretching routine" },
    { name: "junkFood", displayName: "Ate Junk Food", desc: "Penalty — ate junk food" },
  ]},
];

interface CustomActivity {
  displayName: string;
  category: string;
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(1); // 1=credentials, 2=character, 3=activities
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareApp = () => {
    const text = `Join me on MAXIMUS RPG! Level up your real life.\n\nhttps://maximus-rpg.vercel.app\n\nTo install as an app on iPhone:\n1. Open the link in Safari\n2. Tap the Share button (square with arrow)\n3. Scroll down and tap "Add to Home Screen"\n4. Tap Add — done!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shared fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Registration fields
  const [displayName, setDisplayName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("⚔️");
  const [selectedClass, setSelectedClass] = useState("Warrior");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Activity selection
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("fitness");

  const toggleActivity = (name: string) => {
    setSelectedActivities(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const addCustomActivity = () => {
    if (!customName.trim()) return;
    setCustomActivities(prev => [...prev, { displayName: customName.trim(), category: customCategory }]);
    setCustomName("");
    setShowCustomForm(false);
  };

  const removeCustomActivity = (idx: number) => {
    setCustomActivities(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setStep(2);
  };

  const handleRegisterStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(3);
  };

  const handleRegisterStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (selectedActivities.size === 0 && customActivities.length === 0) {
      setError("Select at least one activity to track");
      return;
    }
    setLoading(true);
    try {
      await register({
        username,
        password,
        displayName: displayName || username,
        avatar: selectedAvatar,
        profilePicture: profilePicture || undefined,
        characterName: characterName || displayName || username,
        characterClass: selectedClass,
        selectedActivities: Array.from(selectedActivities),
        customActivities,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">MAXIMUS RPG</h1>
          <p className="text-muted-foreground">Level up your real life.</p>
        </div>

        {mode === "login" ? (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Log In</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>
            <p className="text-sm text-center text-muted-foreground">
              New player?{" "}
              <button onClick={() => { setMode("register"); setStep(1); setError(""); }} className="text-primary underline">
                Create Account
              </button>
            </p>
          </Card>
        ) : step === 1 ? (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Create Account</h2>
            <form onSubmit={handleRegisterStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <Input id="reg-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username (3-20 chars)" autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-display">Display Name</Label>
                <Input id="reg-display" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How others will see you" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full">Next: Create Character</Button>
            </form>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="text-primary underline">
                Log In
              </button>
            </p>
          </Card>
        ) : step === 2 ? (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Create Your Character</h2>
            <form onSubmit={handleRegisterStep2} className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <ProfilePictureUpload
                    currentImage={profilePicture}
                    fallbackEmoji={selectedAvatar}
                    onImageChange={setProfilePicture}
                    size="lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload a photo from your phone or computer. This will be your character portrait.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="char-name">Character Name</Label>
                <Input id="char-name" value={characterName} onChange={e => setCharacterName(e.target.value)} placeholder={displayName || username || "Your hero's name"} />
              </div>

              <div className="space-y-2">
                <Label>Fallback Avatar</Label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(a => (
                    <button key={a} type="button" onClick={() => setSelectedAvatar(a)}
                      className={`text-2xl p-2 rounded-lg border-2 transition-all ${selectedAvatar === a ? "border-primary bg-primary/20" : "border-transparent hover:border-muted"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Choose Your Path</Label>
                <div className="space-y-3">
                  {CLASSES.map(c => (
                    <button key={c.value} type="button" onClick={() => setSelectedClass(c.value)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedClass === c.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{c.icon}</span>
                        <span className="font-bold text-lg">{c.label}</span>
                        {selectedClass === c.value && <Check className="w-5 h-5 text-primary ml-auto" />}
                      </div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">{c.desc}</p>
                      <div className="mt-2 text-xs font-semibold text-primary">{c.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1">Next: Choose Activities</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-semibold">Choose Your Daily Activities</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick the activities you want to track. You can always add more later.</p>
            </div>
            <form onSubmit={handleRegisterStep3} className="space-y-5">
              {ACTIVITY_CATALOG.map(cat => (
                <div key={cat.category} className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span>{cat.icon}</span> {cat.category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.activities.map(a => {
                      const isSelected = selectedActivities.has(a.name);
                      return (
                        <button key={a.name} type="button" onClick={() => toggleActivity(a.name)}
                          className={`text-left p-3 rounded-lg border-2 transition-all flex items-start gap-2 ${isSelected ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{a.displayName}</div>
                            <div className="text-xs text-muted-foreground">{a.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Custom activities */}
              {customActivities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Custom Activities</h3>
                  {customActivities.map((ca, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-primary/50 bg-primary/5">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium flex-1">{ca.displayName}</span>
                      <span className="text-xs text-muted-foreground">{ca.category}</span>
                      <button type="button" onClick={() => removeCustomActivity(i)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}

              {showCustomForm ? (
                <div className="space-y-2 p-3 border border-dashed border-muted-foreground/40 rounded-lg">
                  <Input placeholder="Activity name" value={customName} onChange={e => setCustomName(e.target.value)} />
                  <select value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                    className="w-full p-2 rounded-lg bg-background border border-border text-sm">
                    <option value="fitness">Fitness</option>
                    <option value="intellect">Intellectual</option>
                    <option value="creativity">Creative</option>
                    <option value="discipline">Discipline</option>
                    <option value="social">Social</option>
                    <option value="health">Health</option>
                  </select>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addCustomActivity}>Add</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setShowCustomForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Custom Activity
                </Button>
              )}

              <div className="text-sm text-center text-muted-foreground">
                {selectedActivities.size + customActivities.length} activities selected
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating..." : "Start Adventure!"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <button
          onClick={shareApp}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
        >
          <Share2 className="w-4 h-4" />
          {copied ? "Copied! Send it to your friends." : "Share with friends (copies invite + install instructions)"}
        </button>
      </div>
    </div>
  );
}

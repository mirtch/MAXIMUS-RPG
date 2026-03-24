import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";

const AVATARS = ["⚔️", "🛡️", "🏹", "🧙", "🗡️", "🔮", "🐉", "🦅", "🐺", "🦁", "🔥", "⭐"];
const CLASSES = [
  { value: "Warrior", label: "Warrior", desc: "Discipline & fitness" },
  { value: "Scholar", label: "Scholar", desc: "Knowledge & learning" },
  { value: "Monk", label: "Monk", desc: "Mindfulness & balance" },
  { value: "Ranger", label: "Ranger", desc: "Outdoor & adventure" },
  { value: "Artisan", label: "Artisan", desc: "Creative & craft" },
];

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(1); // register steps: 1=credentials, 2=character
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Shared fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Registration fields
  const [displayName, setDisplayName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("⚔️");
  const [selectedClass, setSelectedClass] = useState("Warrior");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

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

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">MAXIMUS RPG</h1>
          <p className="text-muted-foreground">Level up your real life</p>
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
        ) : (
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
                    <button
                      key={a}
                      type="button"
                      onClick={() => setSelectedAvatar(a)}
                      className={`text-2xl p-2 rounded-lg border-2 transition-all ${selectedAvatar === a ? "border-primary bg-primary/20" : "border-transparent hover:border-muted"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Choose Class</Label>
                <div className="space-y-2">
                  {CLASSES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedClass(c.value)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedClass === c.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      <div className="font-medium">{c.label}</div>
                      <div className="text-sm text-muted-foreground">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating..." : "Start Adventure!"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

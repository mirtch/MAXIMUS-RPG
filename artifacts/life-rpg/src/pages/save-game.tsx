import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCharacter,
  useGetStats,
  useGetDailyLogs,
  useGetDailyQuests,
  useGetSideQuests,
  useGetMainQuests,
  useGetStreaks,
  useGetRewards,
  useGetPunishments,
  useGetAchievements,
  useGetBossFights,
  useGetActivities,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload, HardDrive, Wifi, WifiOff, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SAVE_VERSION = 1;

type Status = "idle" | "loading" | "success" | "error";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SaveGamePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportStatus, setExportStatus] = useState<Status>("idle");
  const [importStatus, setImportStatus] = useState<Status>("idle");
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<unknown>(null);
  const [pendingFileName, setPendingFileName] = useState("");

  // Prefetch all data for client-side quick export
  const { data: character } = useGetCharacter();
  const { data: stats } = useGetStats();
  const { data: dailyLogs } = useGetDailyLogs();
  const { data: dailyQuests } = useGetDailyQuests();
  const { data: sideQuests } = useGetSideQuests();
  const { data: mainQuests } = useGetMainQuests();
  const { data: streaks } = useGetStreaks();
  const { data: rewards } = useGetRewards();
  const { data: punishments } = useGetPunishments();
  const { data: achievements } = useGetAchievements();
  const { data: bossFights } = useGetBossFights();
  const { data: activities } = useGetActivities();

  // ─── Server-side export (authoritative) ───

  async function handleServerExport() {
    setExportStatus("loading");
    try {
      const res = await fetch("/api/save-game/export");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `maximus-save-${date}.json`);
      setExportStatus("success");
      toast({ title: "Save exported!", description: "Your save file has been downloaded." });
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch {
      setExportStatus("error");
      toast({ title: "Export failed", description: "Could not export from server.", variant: "destructive" });
      setTimeout(() => setExportStatus("idle"), 3000);
    }
  }

  // ─── Client-side quick export (from React Query cache) ───

  function handleQuickExport() {
    const data = {
      version: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      game: "MAXIMUS RPG",
      source: "client-cache",
      character: character ?? null,
      stats: stats ?? [],
      dailyLogs: dailyLogs ?? [],
      dailyQuests: dailyQuests ?? [],
      sideQuests: sideQuests ?? [],
      mainQuests: mainQuests ?? [],
      streaks: streaks ?? [],
      rewards: rewards ?? [],
      punishments: punishments ?? [],
      achievements: achievements ?? [],
      bossFights: bossFights ?? [],
      activities: activities ?? [],
    };
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(data, `maximus-quicksave-${date}.json`);
    toast({ title: "Quick save exported!", description: "Exported from local cache (offline-safe)." });
  }

  // ─── Import ───

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.game !== "MAXIMUS RPG" || !data.version) {
          toast({ title: "Invalid file", description: "This doesn't look like a MAXIMUS RPG save file.", variant: "destructive" });
          return;
        }
        setPendingImportData(data);
        setPendingFileName(file.name);
        setImportConfirmOpen(true);
      } catch {
        toast({ title: "Invalid file", description: "Could not parse the save file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be selected again
    e.target.value = "";
  }

  async function handleConfirmImport() {
    setImportConfirmOpen(false);
    setImportStatus("loading");
    try {
      const res = await fetch("/api/save-game/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingImportData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      // Invalidate all cached queries so the UI refreshes
      queryClient.invalidateQueries();
      setImportStatus("success");
      toast({ title: "Save imported!", description: "Your game data has been restored." });
      setTimeout(() => setImportStatus("idle"), 3000);
    } catch (err) {
      setImportStatus("error");
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setTimeout(() => setImportStatus("idle"), 3000);
    } finally {
      setPendingImportData(null);
      setPendingFileName("");
    }
  }

  const statusIcon = (status: Status) => {
    if (status === "loading") return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
    if (status === "success") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-destructive" />;
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-primary" />
          Save Game
        </h1>
        <p className="text-muted-foreground mt-2">
          Export your progress to share between devices, or import a save file to restore your data.
        </p>
      </div>

      {/* Export Section */}
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
          <span className="text-primary">///</span> Export
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Server Export */}
          <Card className="bg-card/50 hover:bg-card hover:border-primary/50 transition-colors duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-primary" />
                  Full Export
                </CardTitle>
                <Badge variant="outline" className="font-mono bg-background text-primary border-primary/30">
                  Server
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Downloads a complete snapshot directly from the database. Most reliable — guaranteed to include all data.
              </p>
              <Button
                onClick={handleServerExport}
                disabled={exportStatus === "loading"}
                className="w-full gap-2"
              >
                {statusIcon(exportStatus) || <Download className="w-4 h-4" />}
                {exportStatus === "loading" ? "Exporting..." : "Export Save File"}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Export */}
          <Card className="bg-card/50 hover:bg-card hover:border-primary/50 transition-colors duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-muted-foreground" />
                  Quick Export
                </CardTitle>
                <Badge variant="outline" className="font-mono bg-background text-muted-foreground border-muted">
                  Cache
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exports from your browser's local cache. Works offline, but only includes data you've already viewed this session.
              </p>
              <Button
                variant="secondary"
                onClick={handleQuickExport}
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                Quick Save
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Import Section */}
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
          <span className="text-primary">///</span> Import
        </h2>
        <Card className="bg-card/50 hover:bg-card hover:border-destructive/30 transition-colors duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Restore Save File
              </CardTitle>
              {statusIcon(importStatus)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Importing a save file will <strong>replace all current data</strong>. Make sure to export your current progress first if you want to keep it.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.maximus"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={handleFileSelect}
              disabled={importStatus === "loading"}
              className="w-full gap-2 border-dashed border-2"
            >
              {importStatus === "loading" ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Choose Save File (.json)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore save file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace <strong>all your current game data</strong> with the contents of{" "}
              <span className="font-mono text-foreground">{pendingFileName}</span>.
              <br /><br />
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, restore save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

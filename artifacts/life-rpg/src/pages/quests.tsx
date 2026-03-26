import { useState } from "react";
import { 
  useGetDailyQuests, useCompleteDailyQuest, useGenerateDailyQuests,
  useGetSideQuests, useCompleteSideQuest, useCreateSideQuest,
  useGetMainQuests, useCompleteMainQuest, useCreateMainQuest 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel,
} from "@/components/ui/form";
import { Scroll, CheckCircle2, Clock, Sword, Plus } from "lucide-react";
import { STAT_ICONS } from "@/lib/xp";

export default function QuestsPage() {
  const queryClient = useQueryClient();
  
  // Daily Quests
  const { data: dailyQuests } = useGetDailyQuests();
  const completeDailyMutation = useCompleteDailyQuest();
  const generateDailyMutation = useGenerateDailyQuests();

  // Side Quests
  const { data: sideQuests } = useGetSideQuests();
  const completeSideMutation = useCompleteSideQuest();
  const createSideMutation = useCreateSideQuest();
  const [sideQuestOpen, setSideQuestOpen] = useState(false);

  // Main Quests
  const { data: mainQuests } = useGetMainQuests();
  const completeMainMutation = useCompleteMainQuest();
  const createMainMutation = useCreateMainQuest();
  const [mainQuestOpen, setMainQuestOpen] = useState(false);

  const sideForm = useForm({
    defaultValues: { title: "", description: "", xpReward: 50, statReward: "Strength" }
  });

  const mainForm = useForm({
    defaultValues: { title: "", description: "", xpReward: 500 }
  });

  const handleGenerateDaily = () => {
    generateDailyMutation.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries()
    });
  };

  const handleSideSubmit = (data: any) => {
    createSideMutation.mutate({ data: { ...data, xpReward: Number(data.xpReward) } }, {
      onSuccess: () => {
        setSideQuestOpen(false);
        sideForm.reset();
        queryClient.invalidateQueries();
      }
    });
  };

  const handleMainSubmit = (data: any) => {
    createMainMutation.mutate({ data: { ...data, xpReward: Number(data.xpReward) } }, {
      onSuccess: () => {
        setMainQuestOpen(false);
        mainForm.reset();
        queryClient.invalidateQueries();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-3">
          <Scroll className="w-8 h-8" /> Quest Log
        </h1>
        <p className="text-muted-foreground">Complete objectives to earn XP and advance your character.</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
          <TabsTrigger value="daily" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold tracking-wider uppercase">Daily Quests</TabsTrigger>
          <TabsTrigger value="side" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold tracking-wider uppercase">Side Quests</TabsTrigger>
          <TabsTrigger value="main" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold tracking-wider uppercase flex gap-2">
            <Sword className="w-4 h-4" /> Main Quests
          </TabsTrigger>
        </TabsList>

        {/* DAILY QUESTS TAB */}
        <TabsContent value="daily" className="space-y-4 pt-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Today's Bounties</h2>
            {(!dailyQuests || dailyQuests.length === 0) && (
              <Button onClick={handleGenerateDaily} disabled={generateDailyMutation.isPending} className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                Generate New Quests
              </Button>
            )}
          </div>

          {dailyQuests && dailyQuests.length > 0 ? (
            <div className="grid gap-4">
              {dailyQuests.map(quest => (
                <Card key={quest.id} className={`overflow-hidden transition-all duration-300 ${quest.completed ? 'opacity-50 grayscale bg-secondary/20' : 'bg-card border-primary/20 hover:border-primary/50'}`}>
                  <CardContent className="p-0 flex flex-col sm:flex-row">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-lg font-bold ${quest.completed ? 'line-through' : ''}`}>
                          {quest.title}
                        </h3>
                        <Badge variant="outline" className="bg-background text-primary border-primary/30 flex gap-1 items-center">
                          +{quest.xpReward} XP
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{quest.description}</p>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-xl">{STAT_ICONS[quest.statReward] || "✨"}</span>
                        <span className="text-muted-foreground">Boosts {quest.statReward}</span>
                      </div>
                    </div>
                    <div className={`p-6 sm:w-48 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-border ${quest.completed ? 'bg-secondary/50' : 'bg-secondary/20'}`}>
                      {quest.completed ? (
                        <div className="flex flex-col items-center text-emerald-500 gap-2 font-bold tracking-widest">
                          <CheckCircle2 className="w-10 h-10" />
                          COMPLETED
                        </div>
                      ) : (
                        <Button 
                          onClick={() => completeDailyMutation.mutate({ id: quest.id }, { onSuccess: () => queryClient.invalidateQueries() })}
                          disabled={completeDailyMutation.isPending}
                          className="w-full font-bold"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 bg-secondary/20 rounded-lg border border-dashed border-border text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No daily quests generated for today.</p>
            </div>
          )}
        </TabsContent>

        {/* SIDE QUESTS TAB */}
        <TabsContent value="side" className="space-y-4 pt-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Active Side Quests</h2>
            <Dialog open={sideQuestOpen} onOpenChange={setSideQuestOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4" /> Add Quest
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-primary">
                <DialogHeader>
                  <DialogTitle>Create Side Quest</DialogTitle>
                </DialogHeader>
                <Form {...sideForm}>
                  <form onSubmit={sideForm.handleSubmit(handleSideSubmit)} className="space-y-4">
                    <FormField control={sideForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={sideForm.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={sideForm.control} name="xpReward" render={({ field }) => (
                        <FormItem><FormLabel>XP Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={sideForm.control} name="statReward" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stat Boost</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select stat" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.keys(STAT_ICONS).map(stat => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="w-full" disabled={createSideMutation.isPending}>Add Quest</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sideQuests?.map(quest => (
              <Card key={quest.id} className={quest.completed ? 'opacity-50' : 'bg-card hover:border-primary/50 transition-colors'}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className={`text-lg ${quest.completed ? 'line-through' : ''}`}>{quest.title}</CardTitle>
                    <Badge variant="secondary" className="text-primary border-primary/20">+{quest.xpReward} XP</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">{quest.description}</p>
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-4">
                    <span>{STAT_ICONS[quest.statReward] || "✨"}</span> {quest.statReward} Focus
                  </div>
                  {quest.completed ? (
                    <Button disabled variant="secondary" className="w-full text-emerald-500 font-bold border-emerald-500 border bg-emerald-500/10"><CheckCircle2 className="w-4 h-4 mr-2" /> Completed</Button>
                  ) : (
                    <Button 
                      className="w-full" variant="outline"
                      onClick={() => completeSideMutation.mutate({ id: quest.id }, { onSuccess: () => queryClient.invalidateQueries() })}
                      disabled={completeSideMutation.isPending}
                    >
                      Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* MAIN QUESTS TAB */}
        <TabsContent value="main" className="space-y-4 pt-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-accent flex items-center gap-2">
              <Sword className="w-5 h-5" /> Epic Life Goals
            </h2>
            <Dialog open={mainQuestOpen} onOpenChange={setMainQuestOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/80 text-accent-foreground gap-2">
                  <Plus className="w-4 h-4" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-accent">
                <DialogHeader>
                  <DialogTitle className="text-accent">Create Main Quest</DialogTitle>
                </DialogHeader>
                <Form {...mainForm}>
                  <form onSubmit={mainForm.handleSubmit(handleMainSubmit)} className="space-y-4">
                    <FormField control={mainForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Epic Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={mainForm.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={mainForm.control} name="xpReward" render={({ field }) => (
                      <FormItem><FormLabel>Massive XP Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <Button type="submit" className="w-full bg-accent hover:bg-accent/80" disabled={createMainMutation.isPending}>Declare Quest</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6">
            {mainQuests?.map(quest => (
              <Card key={quest.id} className={`overflow-hidden border-2 ${quest.completed ? 'opacity-60 border-border' : 'border-accent shadow-[0_0_15px_rgba(139,92,246,0.1)]'} bg-card`}>
                <div className={`h-2 w-full ${quest.completed ? 'bg-secondary' : 'bg-gradient-to-r from-accent/50 via-accent to-accent/50'}`} />
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50 text-3xl shrink-0">
                    {quest.completed ? "👑" : "⚔️"}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className={`text-2xl font-bold mb-2 ${quest.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{quest.title}</h3>
                    <p className="text-muted-foreground">{quest.description}</p>
                  </div>
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <Badge className="bg-accent/20 text-accent border-accent px-4 py-1 text-lg font-mono">
                      +{quest.xpReward} XP
                    </Badge>
                    {quest.completed ? (
                      <div className="text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-5 h-5" /> ACHIEVED
                      </div>
                    ) : (
                      <Button 
                        onClick={() => completeMainMutation.mutate({ id: quest.id }, { onSuccess: () => queryClient.invalidateQueries() })}
                        disabled={completeMainMutation.isPending}
                        className="bg-accent hover:bg-accent/80 w-full"
                      >
                        Claim Victory
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

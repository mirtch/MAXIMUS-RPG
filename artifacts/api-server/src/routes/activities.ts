import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ACTIVITIES = [
  {
    id: 1,
    name: "gym",
    description: "Gym workout (1 hour)",
    category: "fitness",
    xpGains: [
      { statName: "strength", amount: 40 },
      { statName: "discipline", amount: 10 },
    ],
    xpLosses: [],
  },
  {
    id: 2,
    name: "running",
    description: "Running / Cardio (20 min)",
    category: "fitness",
    xpGains: [
      { statName: "stamina", amount: 30 },
      { statName: "health", amount: 10 },
    ],
    xpLosses: [],
  },
  {
    id: 3,
    name: "basketball",
    description: "Basketball (1 hour)",
    category: "athletics",
    xpGains: [
      { statName: "athletics", amount: 50 },
      { statName: "stamina", amount: 20 },
    ],
    xpLosses: [
      { statName: "health", amount: 10 },
    ],
  },
  {
    id: 4,
    name: "study",
    description: "Studying (1 hour)",
    category: "intellect",
    xpGains: [
      { statName: "intellect", amount: 35 },
      { statName: "focus", amount: 15 },
    ],
    xpLosses: [],
  },
  {
    id: 5,
    name: "deepWork",
    description: "Deep focus work (1 hour)",
    category: "focus",
    xpGains: [
      { statName: "focus", amount: 40 },
      { statName: "discipline", amount: 15 },
    ],
    xpLosses: [],
  },
  {
    id: 6,
    name: "piano",
    description: "Piano practice (1 hour)",
    category: "creativity",
    xpGains: [
      { statName: "creativity", amount: 40 },
      { statName: "focus", amount: 20 },
    ],
    xpLosses: [],
  },
  {
    id: 7,
    name: "socialized",
    description: "Talked to new person",
    category: "charisma",
    xpGains: [
      { statName: "charisma", amount: 25 },
    ],
    xpLosses: [],
  },
  {
    id: 8,
    name: "plannedDay",
    description: "Planned the day",
    category: "discipline",
    xpGains: [
      { statName: "discipline", amount: 20 },
    ],
    xpLosses: [],
  },
  {
    id: 9,
    name: "coldShower",
    description: "Cold shower (2-3 min)",
    category: "discipline",
    xpGains: [
      { statName: "discipline", amount: 15 },
      { statName: "health", amount: 10 },
    ],
    xpLosses: [],
  },
  {
    id: 10,
    name: "sleep8h",
    description: "8+ hours sleep",
    category: "health",
    xpGains: [
      { statName: "health", amount: 30 },
      { statName: "focus", amount: 10 },
    ],
    xpLosses: [],
  },
  {
    id: 11,
    name: "junkFood",
    description: "Ate junk food",
    category: "bad_habit",
    xpGains: [],
    xpLosses: [
      { statName: "health", amount: 20 },
      { statName: "discipline", amount: 10 },
    ],
  },
  {
    id: 12,
    name: "phoneOveruse",
    description: "5+ hours on phone",
    category: "bad_habit",
    xpGains: [],
    xpLosses: [
      { statName: "focus", amount: 30 },
      { statName: "discipline", amount: 20 },
    ],
  },
  {
    id: 13,
    name: "party",
    description: "Party/night out",
    category: "social",
    xpGains: [
      { statName: "charisma", amount: 20 },
    ],
    xpLosses: [
      { statName: "health", amount: 15 },
      { statName: "discipline", amount: 15 },
    ],
  },
];

router.get("/activities", async (_req, res): Promise<void> => {
  res.json(ACTIVITIES);
});

export default router;

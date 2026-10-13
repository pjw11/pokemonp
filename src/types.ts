export type Stat = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
export type Stats = Record<Stat, number>;
export interface Species {
  id: string;
  name: string;
  ko: string;
  num: number;
  forme: string;
  baseSpecies: string;
  types: string[];
  stats: Stats;
  weightkg: number;
  abilities: string[];
  requiredItem?: string;
  imageId: number;
  imageIsBase: boolean;
  moves: string[];
  regulations: string[];
}
export interface MoveData {
  id: string;
  name: string;
  ko: string;
  type: string;
  category: "Physical" | "Special";
  power: number;
  accuracy: number | true;
  priority: number;
  multihit?: number | [number, number];
  flags: Record<string, number>;
  target: string;
  willCrit?: boolean;
  overrideOffensiveStat?: string;
  overrideDefensiveStat?: string;
  overrideOffensivePokemon?: string;
  overrideDefensivePokemon?: string;
}
export interface Named {
  id: string;
  name: string;
  ko: string;
  description?: string;
}
export interface Data {
  meta: {
    checkedAt: string;
    showdownCommit: string;
    pokeapiCommit: string;
    spritesCommit: string;
    officialVerified: boolean;
  };
  typeNames: Record<string, string>;
  pokemon: Species[];
  moves: MoveData[];
  items: Named[];
  abilities: Named[];
}
export interface Fighter {
  id: string;
  points: Stats;
  nature: string;
  item: string;
  ability: string;
  boosts: Stats;
  status: "" | "par" | "brn" | "psn" | "slp" | "frz";
  hpPercent: number;
  tailwind: boolean;
  abilityOn: boolean;
  fastBackup?: { nature: string; points: Stats };
  scarfBackup?: string;
}
export interface Conditions {
  weather: "" | "Sun" | "Rain" | "Sand" | "Snow";
  terrain: "" | "Electric" | "Grassy" | "Psychic" | "Misty";
  doubles: boolean;
  spread: boolean;
  reflect: boolean;
  lightScreen: boolean;
  critical: boolean;
  trickRoom: boolean;
  helpingHand: boolean;
  hits: number;
}
export const STATS: Stat[] = ["hp", "atk", "def", "spa", "spd", "spe"];
export const STAT_LABELS: Record<Stat, string> = {
  hp: "HP",
  atk: "공격",
  def: "방어",
  spa: "특수공격",
  spd: "특수방어",
  spe: "스피드",
};
export const EMPTY: Stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export const DEFAULT_CONDITIONS: Conditions = {
  weather: "",
  terrain: "",
  doubles: true,
  spread: true,
  reflect: false,
  lightScreen: false,
  critical: false,
  trickRoom: false,
  helpingHand: false,
  hits: 3,
};

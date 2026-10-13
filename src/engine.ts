import { calculate, Generations, Pokemon, Move, Field } from "@smogon/calc";
import type {
  Species,
  Fighter,
  Conditions,
  MoveData,
  Stats,
  Stat,
} from "./types";
import { STATS, EMPTY } from "./types";
const gen = Generations.get(9);
export const NATURES: Record<
  string,
  { ko: string; plus?: Stat; minus?: Stat }
> = {
  Serious: { ko: "성실 (보정 없음)" },
  Adamant: { ko: "고집 · 공격↑ 특공↓", plus: "atk", minus: "spa" },
  Jolly: { ko: "명랑 · 스피드↑ 특공↓", plus: "spe", minus: "spa" },
  Modest: { ko: "조심 · 특공↑ 공격↓", plus: "spa", minus: "atk" },
  Timid: { ko: "겁쟁이 · 스피드↑ 공격↓", plus: "spe", minus: "atk" },
  Bold: { ko: "대담 · 방어↑ 공격↓", plus: "def", minus: "atk" },
  Calm: { ko: "차분 · 특방↑ 공격↓", plus: "spd", minus: "atk" },
  Brave: { ko: "용감 · 공격↑ 스피드↓", plus: "atk", minus: "spe" },
  Quiet: { ko: "냉정 · 특공↑ 스피드↓", plus: "spa", minus: "spe" },
  Relaxed: { ko: "무사태평 · 방어↑ 스피드↓", plus: "def", minus: "spe" },
  Sassy: { ko: "건방 · 특방↑ 스피드↓", plus: "spd", minus: "spe" },
  Lonely: { ko: "외로움 · 공격↑ 방어↓", plus: "atk", minus: "def" },
  Naughty: { ko: "개구쟁이 · 공격↑ 특방↓", plus: "atk", minus: "spd" },
  Impish: { ko: "장난꾸러기 · 방어↑ 특공↓", plus: "def", minus: "spa" },
  Lax: { ko: "촐랑 · 방어↑ 특방↓", plus: "def", minus: "spd" },
  Hasty: { ko: "성급 · 스피드↑ 방어↓", plus: "spe", minus: "def" },
  Naive: { ko: "천진난만 · 스피드↑ 특방↓", plus: "spe", minus: "spd" },
  Mild: { ko: "의젓 · 특공↑ 방어↓", plus: "spa", minus: "def" },
  Rash: { ko: "덜렁 · 특공↑ 특방↓", plus: "spa", minus: "spd" },
  Gentle: { ko: "얌전 · 특방↑ 방어↓", plus: "spd", minus: "def" },
  Careful: { ko: "신중 · 특방↑ 특공↓", plus: "spd", minus: "spa" },
  Hardy: { ko: "노력 (보정 없음)" },
  Docile: { ko: "온순 (보정 없음)" },
  Bashful: { ko: "수줍음 (보정 없음)" },
  Quirky: { ko: "변덕 (보정 없음)" },
};
export function initialFighter(s: Species, defender = false): Fighter {
  const special = s.stats.spa > s.stats.atk;
  return {
    id: s.id,
    points: {
      ...EMPTY,
      hp: defender ? 32 : 2,
      [defender ? "def" : special ? "spa" : "atk"]: 32,
      ...(!defender ? { spe: 32 } : { spd: 2 }),
    },
    nature: defender ? "Impish" : special ? "Timid" : "Jolly",
    item: s.requiredItem || "",
    ability: s.abilities.includes("Rough Skin") ? "Rough Skin" : s.abilities[0],
    boosts: { ...EMPTY },
    status: "",
    hpPercent: 100,
    tailwind: false,
    abilityOn: false,
  };
}
export function totalPoints(f: Fighter) {
  return Object.values(f.points).reduce((a, b) => a + b, 0);
}
export function setPoint(f: Fighter, key: Stat, value: number): Fighter {
  const max = Math.min(32, 66 - totalPoints(f) + f.points[key]);
  return {
    ...f,
    points: {
      ...f.points,
      [key]: Math.max(0, Math.min(max, Math.floor(Number(value) || 0))),
    },
    fastBackup: undefined,
  };
}
export function statValues(s: Species, f: Fighter): Stats {
  const nature = NATURES[f.nature] || NATURES.Serious;
  return Object.fromEntries(
    STATS.map((key) => {
      const base = s.stats[key] + f.points[key] + (key === "hp" ? 75 : 20);
      return [
        key,
        key === "hp"
          ? base
          : Math.floor(
              base *
                (nature.plus === key ? 1.1 : nature.minus === key ? 0.9 : 1),
            ),
      ];
    }),
  ) as Stats;
}
export function boosted(value: number, stage: number) {
  return Math.floor(value * (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)));
}
export function speed(s: Species, f: Fighter, c: Conditions) {
  let n = boosted(statValues(s, f).spe, f.boosts.spe);
  // Combine modifiers before Pokémon rounding, as in Gen 9 (Showdown champions).
  let mod = 4096;
  function chain(next: number) {
    mod = Math.floor((mod * next + 2048) / 4096);
  }
  const weatherBoost =
    (c.weather === "Rain" && f.ability === "Swift Swim") ||
    (c.weather === "Sun" && f.ability === "Chlorophyll") ||
    (c.weather === "Sand" && f.ability === "Sand Rush") ||
    (c.weather === "Snow" && f.ability === "Slush Rush");
  if (weatherBoost || (f.ability === "Unburden" && f.abilityOn && !f.item))
    chain(8192);
  if (f.ability === "Quick Feet" && f.status) chain(6144);
  if (c.terrain === "Electric" && f.ability === "Surge Surfer") chain(8192);
  if (f.ability === "Slow Start" && f.abilityOn) chain(2048);
  if (f.item === "Choice Scarf") chain(6144);
  if (
    [
      "Iron Ball",
      "Macho Brace",
      "Power Anklet",
      "Power Band",
      "Power Belt",
      "Power Bracer",
      "Power Lens",
      "Power Weight",
    ].includes(f.item)
  )
    chain(2048);
  if (f.tailwind) chain(8192);
  n = Math.max(1, Math.floor((n * mod + 2047) / 4096));
  if (f.status === "par" && f.ability !== "Quick Feet") n = Math.floor(n / 2);
  return Math.max(1, Math.min(10000, n));
}
export function toggleFast(s: Species, f: Fighter): Fighter {
  if (!f.fastBackup && f.points.spe === 32 && NATURES[f.nature]?.plus === "spe")
    return { ...f, nature: "Serious", points: { ...f.points, spe: 0 } };
  if (f.fastBackup)
    return {
      ...f,
      nature: f.fastBackup.nature,
      points: { ...f.fastBackup.points },
      fastBackup: undefined,
    };
  const next = {
    ...f,
    points: { ...f.points, spe: 32 },
    nature: s.stats.spa > s.stats.atk ? "Timid" : "Jolly",
    fastBackup: { nature: f.nature, points: { ...f.points } },
  };
  let excess = totalPoints(next) - 66;
  for (const key of ["hp", "spd", "def", "spa", "atk"] as Stat[]) {
    if (excess <= 0) break;
    let v = Math.min(next.points[key], excess);
    next.points[key] -= v;
    excess -= v;
  }
  return next;
}
export function makePokemon(s: Species, f: Fighter, curHP?: number) {
  const evs = Object.fromEntries(
    STATS.map((k) => [k, f.points[k] === 0 ? 0 : 8 * f.points[k] - 4]),
  );
  const stats = statValues(s, f);
  return new Pokemon(gen, s.name, {
    level: 50,
    nature: f.nature,
    item: f.item,
    ability: f.ability,
    abilityOn: f.abilityOn,
    status: f.status,
    boosts: f.boosts,
    evs,
    curHP: curHP ?? Math.max(1, Math.floor((stats.hp * f.hpPercent) / 100)),
    overrides: {
      baseStats: s.stats,
      types: s.types as [never, never],
      weightkg: s.weightkg,
      abilities: { 0: s.abilities[0] } as never,
    },
  });
}
export type Distribution = Map<number, number>;
function distribution(rolls: number[]): Distribution {
  const d = new Map<number, number>();
  for (const v of rolls) d.set(v, (d.get(v) || 0) + 1 / rolls.length);
  return d;
}
export function convolve(
  a: Distribution,
  b: Distribution,
  cap = Infinity,
): Distribution {
  const result = new Map<number, number>();
  for (const [x, p] of a)
    for (const [y, q] of b) {
      const key = Math.min(cap, x + y);
      result.set(key, (result.get(key) || 0) + p * q);
    }
  return result;
}
export function koChances(d: Distribution, hp: number, limit = 4) {
  let cumulative: Distribution = new Map([[0, 1]]);
  const out = [];
  for (let n = 1; n <= limit; n++) {
    cumulative = convolve(cumulative, d, hp);
    const chance = cumulative.get(hp) || 0;
    out.push({ n, chance: Math.min(1, Math.max(0, chance)) });
  }
  return out;
}
export function damage(
  a: Species,
  af: Fighter,
  b: Species,
  bf: Fighter,
  m: MoveData,
  c: Conditions,
) {
  const attacker = makePokemon(a, af),
    defender = makePokemon(b, bf);
  const move = new Move(gen, m.name, {
    isCrit: c.critical,
    hits: typeof m.multihit === "number" ? m.multihit : c.hits,
    ability: af.ability,
    item: af.item,
    overrides: {
      basePower: m.power,
      type: m.type as never,
      category: m.category,
      flags: m.flags as never,
      target: (!c.spread &&
      ["allAdjacent", "allAdjacentFoes"].includes(m.target)
        ? "normal"
        : m.target) as never,
      multihit: m.multihit,
      willCrit: m.willCrit,
      overrideOffensiveStat: m.overrideOffensiveStat as never,
      overrideDefensiveStat: m.overrideDefensiveStat as never,
      overrideOffensivePokemon: m.overrideOffensivePokemon as never,
      overrideDefensivePokemon: m.overrideDefensivePokemon as never,
    },
  });
  const field = new Field({
    gameType: c.doubles ? "Doubles" : "Singles",
    weather: c.weather || undefined,
    terrain: c.terrain || undefined,
    attackerSide: { isHelpingHand: c.helpingHand, isTailwind: af.tailwind },
    defenderSide: {
      isReflect: c.reflect,
      isLightScreen: c.lightScreen,
      isTailwind: bf.tailwind,
    },
  });
  const halfHP = ["Super Fang", "Nature's Madness", "Ruination"].includes(
    m.name,
  );
  const hp = defender.curHP();
  function runAtHP(remaining: number) {
    const target = makePokemon(b, bf, remaining);
    const result = calculate(
      gen,
      makePokemon(a, af),
      target,
      move.clone(),
      field.clone(),
    );
    // damage-calc doesn't implement the HP callback for these fixed-damage moves.
    // Probe with the same move/type/flags to retain immunities, then apply Champions' callback.
    if (halfHP || m.name === "Endeavor") {
      const probeMove = new Move(gen, m.name, {
        overrides: { ...move.overrides, basePower: 1 },
      });
      const probe = calculate(
        gen,
        makePokemon(a, af),
        target,
        probeMove,
        field.clone(),
      );
      let amount =
        probe.range()[1] > 0
          ? halfHP
            ? Math.max(1, Math.floor(remaining / 2))
            : Math.max(0, remaining - attacker.curHP())
          : 0;
      if (halfHP && af.ability === "Parental Bond" && remaining > amount)
        amount += Math.max(1, Math.floor((remaining - amount) / 2));
      result.damage = amount;
    }
    return result;
  }
  const result = runAtHP(hp);
  function damageDistribution(raw: typeof result): Distribution {
    if (typeof raw.damage === "number") return distribution([raw.damage]);
    if (Array.isArray(raw.damage[0])) {
      let out: Distribution = new Map([[0, 1]]);
      for (const rolls of raw.damage as number[][])
        out = convolve(out, distribution(rolls));
      return out;
    }
    let out = distribution(raw.damage as number[]);
    if (raw.move.hits > 1) {
      const single = out;
      for (let i = 1; i < raw.move.hits; i++) out = convolve(out, single);
    }
    return out;
  }
  const d = damageDistribution(result);
  const values = [...d.keys()].sort((a, b) => a - b),
    range: [number, number] = [values[0] || 0, values.at(-1) || 0];
  let subsequent = d;
  // Full-HP defensive abilities apply to the first attack only when no recovery is present.
  if (
    hp === defender.maxHP() &&
    ["Multiscale", "Shadow Shield"].includes(bf.ability) &&
    range[1] > 0
  ) {
    subsequent = damageDistribution(runAtHP(hp - 1));
  }
  let chances = [];
  let cumulative = d;
  for (let n = 1; n <= 4; n++) {
    if (n > 1) cumulative = convolve(cumulative, subsequent, hp);
    const chance = [...cumulative].reduce(
      (sum, [amount, p]) => sum + (amount >= hp ? p : 0),
      0,
    );
    chances.push({ n, chance: Math.min(1, Math.max(0, chance)) });
  }
  const nextMin = Math.min(...subsequent.keys()),
    nextMax = Math.max(...subsequent.keys());
  let possible =
    range[1] >= hp
      ? 1
      : nextMax > 0
        ? 1 + Math.ceil((hp - range[1]) / nextMax)
        : Infinity;
  let guaranteed =
    range[0] >= hp
      ? 1
      : nextMin > 0
        ? 1 + Math.ceil((hp - range[0]) / nextMin)
        : Infinity;
  // HP-dependent attacks must be recalculated against each remaining-HP state.
  const hpDependent = [
    "Brine",
    "Crush Grip",
    "Wring Out",
    "Super Fang",
    "Nature's Madness",
    "Ruination",
    "Endeavor",
  ].includes(m.name);
  if (hpDependent) {
    const cache = new Map<number, Distribution>([[hp, d]]);
    const atHP = (remaining: number) => {
      const hit = cache.get(remaining);
      if (hit) return hit;
      const out = damageDistribution(runAtHP(remaining));
      cache.set(remaining, out);
      return out;
    };
    let remainingStates: Distribution = new Map([[hp, 1]]);
    chances = [];
    for (let n = 1; n <= 4; n++) {
      const next: Distribution = new Map();
      for (const [remaining, p] of remainingStates) {
        if (remaining === 0) {
          next.set(0, (next.get(0) || 0) + p);
          continue;
        }
        for (const [amount, q] of atHP(remaining)) {
          const r = Math.max(0, remaining - amount);
          next.set(r, (next.get(r) || 0) + p * q);
        }
      }
      remainingStates = next;
      chances.push({ n, chance: Math.min(1, next.get(0) || 0) });
    }
    const extreme = (maximum: boolean) => {
      let remaining = hp;
      for (let n = 1; n <= hp; n++) {
        const amounts = [...atHP(remaining).keys()],
          amount = maximum ? Math.max(...amounts) : Math.min(...amounts);
        if (amount <= 0) return Infinity;
        remaining -= amount;
        if (remaining <= 0) return n;
      }
      return Infinity;
    };
    possible = extreme(true);
    guaranteed = extreme(false);
  }
  const label =
    range[1] === 0
      ? "효과 없음"
      : guaranteed === Infinity
        ? possible === Infinity
          ? "KO 불가"
          : `난수 ${possible}타`
        : possible === guaranteed
          ? `확정 ${guaranteed}타`
          : `난수 ${possible}타`;
  const warnings: string[] = [];
  if (
    [
      "Focus Sash",
      "Focus Band",
      "Sitrus Berry",
      "Leftovers",
      "Figy Berry",
      "Wiki Berry",
      "Mago Berry",
      "Aguav Berry",
      "Iapapa Berry",
    ].includes(bf.item)
  )
    warnings.push("기합·회복 도구의 생존 효과는 타수에 포함하지 않습니다.");
  if (["Disguise", "Sturdy", "Ice Face"].includes(bf.ability))
    warnings.push(
      "탈·옹골참·아이스페이스의 생존 효과는 타수에 포함하지 않습니다.",
    );
  if (hpDependent)
    warnings.push("타수별로 남은 HP에 따른 위력 변화를 다시 계산합니다.");
  if (bf.ability === "Spicy Spray")
    warnings.push(
      "접촉 후 화상 등 기술 사용 뒤의 효과는 반복 타수에 반영하지 않습니다.",
    );
  if (m.multihit)
    warnings.push(
      `연속기 ${result.move.hits}회 명중 기준입니다. 각 타격의 난수는 독립적으로 계산합니다.`,
    );
  if (
    [
      "Draco Meteor",
      "Overheat",
      "Leaf Storm",
      "Close Combat",
      "Superpower",
      "Hammer Arm",
      "Make It Rain",
      "Fleur Cannon",
      "Headlong Rush",
      "V-create",
      "Clanging Scales",
    ].includes(m.name)
  )
    warnings.push("기술 사용 후 능력치 변화는 반복 타수에 반영하지 않습니다.");
  const unsupported = ["Megasol"];
  if (unsupported.includes(af.ability) || unsupported.includes(bf.ability))
    warnings.push(
      "이 챔피언스 전용 특성의 고유 효과는 현재 계산 엔진에서 검증되지 않았습니다.",
    );
  return {
    range,
    hp,
    maxHP: defender.maxHP(),
    chances,
    possible,
    guaranteed,
    label,
    distribution: d,
    warnings,
    rolls: Array.from({ length: 16 }, (_, i) => {
      if (typeof result.damage === "number") return result.damage;
      if (Array.isArray(result.damage[0]))
        return (result.damage as number[][]).reduce(
          (s, r) => s + (r[Math.min(i, r.length - 1)] || 0),
          0,
        );
      return (
        (result.damage as number[])[Math.min(i, result.damage.length - 1)] *
        Math.max(1, result.move.hits)
      );
    }),
  };
}

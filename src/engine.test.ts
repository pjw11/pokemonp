import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  NATURES,
  initialFighter,
  statValues,
  speed,
  setPoint,
  totalPoints,
  toggleFast,
  damage,
  koChances,
  makePokemon,
} from "./engine";
import { DEFAULT_CONDITIONS, EMPTY, STATS } from "./types";
import type { Data } from "./types";
const data: Data = JSON.parse(
  fs.readFileSync("public/data/champions.json", "utf8"),
);
const species = (id: string) => data.pokemon.find((p) => p.id === id)!;
const move = (id: string) => data.moves.find((p) => p.id === id)!;
const a = species("garchomp"),
  b = species("dragonite");
describe("Champions stat points and speed", () => {
  it("uses level-50 Champions stats, nature and scarf rounding", () => {
    const f = initialFighter(a);
    expect(statValues(a, f)).toEqual({
      hp: 185,
      atk: 182,
      def: 115,
      spa: 90,
      spd: 105,
      spe: 169,
    });
    expect(speed(a, { ...f, item: "Choice Scarf" }, DEFAULT_CONDITIONS)).toBe(
      253,
    );
    expect(
      speed(
        a,
        { ...f, item: "Choice Scarf", tailwind: true },
        DEFAULT_CONDITIONS,
      ),
    ).toBe(507);
    expect(speed(a, { ...f, status: "par" }, DEFAULT_CONDITIONS)).toBe(84);
  });
  it("matches stat-point formula for every available form and point value", () => {
    for (const s of data.pokemon)
      for (const p of [0, 1, 2, 31, 32]) {
        const f = {
          ...initialFighter(s),
          nature: "Serious",
          points: Object.fromEntries(STATS.map((k) => [k, p])) as typeof EMPTY,
        };
        const pk = makePokemon(s, f),
          expected = statValues(s, f);
        for (const k of STATS)
          expect(pk.rawStats[k], `${s.name}: ${k}=${p}`).toBe(expected[k]);
      }
  });
  it("enforces per-stat 32 and total 66 point limits", () => {
    const f = initialFighter(a);
    expect(totalPoints(setPoint(f, "def", 32))).toBe(66);
    expect(setPoint(f, "def", 32).points.def).toBe(0);
    const reduced = setPoint(f, "atk", 20);
    expect(setPoint(reduced, "def", 32).points.def).toBe(12);
    expect(setPoint(reduced, "hp", -1).points.hp).toBe(0);
  });
  it("restores previous speed and nature after a fastest toggle", () => {
    const f = {
      ...initialFighter(a),
      nature: "Adamant",
      points: { ...EMPTY, atk: 32, hp: 2, spe: 10 },
    };
    const fast = toggleFast(a, f);
    expect(fast.nature).toBe("Jolly");
    expect(fast.points.spe).toBe(32);
    const restored = toggleFast(a, fast);
    expect(restored.points.spe).toBe(10);
    expect(restored.nature).toBe("Adamant");
  });
  it("restores a defensive point spread that fastest temporarily redistributed", () => {
    const f = initialFighter(b, true),
      fast = toggleFast(b, f);
    expect(totalPoints(fast)).toBe(66);
    expect(fast.points.spe).toBe(32);
    expect(toggleFast(b, fast).points).toEqual(f.points);
    expect(toggleFast(b, fast).nature).toBe(f.nature);
  });
  it("applies rain ability and status modifiers in the correct order", () => {
    const s = species("swampertmega"),
      f = {
        ...initialFighter(s),
        item: "",
        ability: "Swift Swim",
        tailwind: true,
        status: "par" as const,
      };
    const raw = statValues(s, f).spe;
    expect(speed(s, f, { ...DEFAULT_CONDITIONS, weather: "Rain" })).toBe(
      raw * 2,
    );
  });
});
describe("damage and KO probabilities", () => {
  it("calculates a known matchup and type immunity", () => {
    const f = initialFighter(a),
      g = initialFighter(b, true);
    const r = damage(a, f, b, g, move("dragonclaw"), DEFAULT_CONDITIONS);
    expect(r.range).toEqual([102, 122]);
    expect(r.label).toBe("확정 2타");
    expect(r.chances[1].chance).toBeCloseTo(1);
    const immune = damage(a, f, b, g, move("earthquake"), DEFAULT_CONDITIONS);
    expect(immune.range).toEqual([0, 0]);
    expect(immune.label).toBe("효과 없음");
    expect(immune.chances.every((x) => x.chance === 0)).toBe(true);
  });
  it("convolves independent rolls rather than adding percentages", () => {
    const r = koChances(
      new Map([
        [40, 0.5],
        [60, 0.5],
      ]),
      100,
    );
    expect(r[0].chance).toBe(0);
    expect(r[1].chance).toBe(0.75);
    expect(r[2].chance).toBe(1);
  });
  it("stops applying Multiscale after the first attack without recovery", () => {
    const f = initialFighter(a),
      g = { ...initialFighter(b, true), ability: "Multiscale" };
    const r = damage(a, f, b, g, move("dragonclaw"), DEFAULT_CONDITIONS);
    expect(r.range).toEqual([51, 61]);
    expect(r.guaranteed).toBe(3);
    expect(r.possible).toBe(3);
    expect(r.chances[2].chance).toBeCloseTo(1);
  });
  it("recalculates half-current-HP damage each turn down to the last HP", () => {
    const s = data.pokemon.find((p) => p.moves.includes("superfang"))!;
    const r = damage(
      s,
      initialFighter(s),
      b,
      initialFighter(b, true),
      move("superfang"),
      DEFAULT_CONDITIONS,
    );
    expect(r.range).toEqual([99, 99]);
    expect(r.guaranteed).toBe(9);
    expect(r.chances.every((c) => c.chance === 0)).toBe(true);
    const last = damage(
      s,
      initialFighter(s),
      b,
      { ...initialFighter(b, true), hpPercent: 1 },
      move("superfang"),
      DEFAULT_CONDITIONS,
    );
    expect(last.range).toEqual([1, 1]);
    expect(last.guaranteed).toBe(1);
  });
  it("applies critical hit, burn, spread and defensive screens", () => {
    const f = initialFighter(a),
      g = initialFighter(species("tyranitar"), true),
      s = species("tyranitar"),
      m = move("earthquake");
    const base = damage(a, f, s, g, m, {
      ...DEFAULT_CONDITIONS,
      doubles: false,
    });
    expect(
      damage(a, { ...f, status: "brn" }, s, g, m, {
        ...DEFAULT_CONDITIONS,
        doubles: false,
      }).range[1],
    ).toBeLessThan(base.range[1]);
    expect(
      damage(a, f, s, g, m, {
        ...DEFAULT_CONDITIONS,
        doubles: false,
        reflect: true,
      }).range[1],
    ).toBeLessThan(base.range[1]);
    expect(damage(a, f, s, g, m, DEFAULT_CONDITIONS).range[1]).toBeLessThan(
      base.range[1],
    );
    expect(
      damage(a, f, s, g, m, {
        ...DEFAULT_CONDITIONS,
        doubles: false,
        critical: true,
      }).range[1],
    ).toBeGreaterThan(base.range[1]);
  });
  it("sums independent multi-hit damage distributions", () => {
    const cloyster = species("mamoswine"),
      f = { ...initialFighter(cloyster), ability: "Thick Fat" },
      g = initialFighter(b, true);
    const r2 = damage(cloyster, f, b, g, move("iciclespear"), {
        ...DEFAULT_CONDITIONS,
        hits: 2,
      }),
      r5 = damage(cloyster, f, b, g, move("iciclespear"), {
        ...DEFAULT_CONDITIONS,
        hits: 5,
      });
    expect(r5.range[0]).toBe((r2.range[0] * 5) / 2);
    expect(r5.range[1]).toBe((r2.range[1] * 5) / 2);
    expect(
      [...r5.distribution.values()].reduce((x, y) => x + y, 0),
    ).toBeCloseTo(1);
  });
  it("loads every legal form with a legal attacking move", () => {
    for (const s of data.pokemon) {
      if (s.id === "ditto") {
        expect(s.moves).toHaveLength(0);
        continue;
      }
      const m =
        data.moves.find((m) => s.moves.includes(m.id) && m.power >= 60) ||
        data.moves.find((m) => s.moves.includes(m.id))!;
      const r = damage(
        s,
        initialFighter(s),
        b,
        initialFighter(b, true),
        m,
        DEFAULT_CONDITIONS,
      );
      expect(
        r.range.every((n) => Number.isFinite(n) && n >= 0),
        s.name + " " + m.name,
      ).toBe(true);
    }
  });
});
describe("data integrity", () => {
  it("ships all artwork and complete Korean searchable names", () => {
    for (const s of data.pokemon) {
      expect(fs.existsSync(`public/pokemon/${s.imageId}.webp`), s.name).toBe(
        true,
      );
      expect(s.ko).toMatch(/[가-힣]/);
      expect(s.moves.every((m) => data.moves.some((x) => x.id === m))).toBe(
        true,
      );
    }
    expect(species("raichualola").ko).toContain("라이츄");
    expect(species("aegislashblade").ko).toContain("킬가르도");
  });
  it("excludes unavailable, mythical, restricted and inaccessible battle-only forms", () => {
    for (const id of [
      "fluttermane",
      "zacian",
      "mew",
      "arceus",
      "terapagosterastal",
      "ogerpontealtera",
    ])
      expect(data.pokemon.some((s) => s.id === id)).toBe(false);
    expect(
      data.pokemon.filter((s) => s.regulations.includes("mc")),
    ).toHaveLength(382);
  });
});

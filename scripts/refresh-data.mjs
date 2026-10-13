import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
const root = fileURLToPath(new URL("..", import.meta.url));
const commit = "3a766f2cfb5e51c1e428cfe87d0dba91a8f01640";
const source =
  process.env.SHOWDOWN_SOURCE_DIR || "/tmp/champions-lab-sources/showdown";
if (!existsSync(source + "/.git")) {
  mkdirSync(source, { recursive: true });
  execFileSync("git", ["init", source], { stdio: "ignore" });
  execFileSync("git", [
    "-C",
    source,
    "remote",
    "add",
    "origin",
    "https://github.com/smogon/pokemon-showdown.git",
  ]);
  execFileSync(
    "git",
    ["-C", source, "fetch", "--depth", "1", "origin", commit],
    { stdio: "inherit" },
  );
  execFileSync("git", ["-C", source, "checkout", "--detach", "FETCH_HEAD"], {
    stdio: "ignore",
  });
}
if (
  execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim() !== commit
)
  throw Error("Showdown source commit mismatch");
function walk(p) {
  return readdirSync(p).flatMap((f) => {
    let x = p + "/" + f;
    return statSync(x).isDirectory()
      ? walk(x)
      : x.endsWith(".ts") && !x.endsWith(".d.ts")
        ? [x]
        : [];
  });
}
buildSync({
  entryPoints: ["sim", "lib", "data", "config"].flatMap((d) =>
    walk(source + "/" + d),
  ),
  outdir: source + "/dist",
  outbase: source,
  format: "cjs",
  logLevel: "error",
  tsconfig: source + "/tsconfig.json",
});
const require = createRequire(import.meta.url),
  { Dex } = require(source + "/dist/sim/dex.js");
const names = JSON.parse(
  execFileSync("python", ["scripts/fetch-assets.py", "names"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }),
);
const typeNames = {
  Normal: "노말",
  Fire: "불꽃",
  Water: "물",
  Electric: "전기",
  Grass: "풀",
  Ice: "얼음",
  Fighting: "격투",
  Poison: "독",
  Ground: "땅",
  Flying: "비행",
  Psychic: "에스퍼",
  Bug: "벌레",
  Rock: "바위",
  Ghost: "고스트",
  Dragon: "드래곤",
  Dark: "악",
  Steel: "강철",
  Fairy: "페어리",
};
const slug = (n) =>
  n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
const formTokens = {
  Mega: "메가",
  Alola: "알로라",
  Galar: "가라르",
  Hisui: "히스이",
  Paldea: "팔데아",
  Therian: "영물",
  Incarnate: "화신",
  Wash: "워시",
  Heat: "히트",
  Mow: "커트",
  Frost: "프로스트",
  Fan: "스핀",
  Blade: "블레이드",
  Shield: "실드",
  Dusk: "황혼",
  Midnight: "한밤중",
  Midday: "한낮",
  Female: "암컷",
  Male: "수컷",
  Small: "소형",
  Large: "대형",
  Super: "특대",
  Average: "보통",
  Zen: "달마",
  School: "군집",
  Solo: "단독",
};
function localName(s, im) {
  const base = names.species[s.num] || s.baseSpecies;
  if (!s.forme) return base;
  if (names.formnames[im] && names.formnames[im] !== base) {
    const n = names.formnames[im];
    return n.includes(base) ? n : base + " (" + n + ")";
  }
  if (s.forme.startsWith("Mega"))
    return "메가" + base + s.forme.slice(4).replaceAll("-", "");
  return (
    base +
    " (" +
    s.forme
      .split("-")
      .map((t) => formTokens[t] || t)
      .join(" ") +
    ")"
  );
}
const available = (s) =>
  s.exists &&
  s.num > 0 &&
  !s.isNonstandard &&
  !s.tags.some((t) => ["Mythical", "Restricted Legendary"].includes(t));
function makeDex(mod) {
  const dex = Dex.mod(mod);
  const eligible = dex.species
    .all()
    .filter(
      (s) =>
        available(s) &&
        (!s.battleOnly ||
          (Array.isArray(s.battleOnly) ? s.battleOnly : [s.battleOnly]).some(
            (b) => available(dex.species.get(b)),
          )),
    );
  return { dex, eligible };
}
const current = makeDex("champions"),
  previous = makeDex("championsregmb");
const moves = current.dex.moves
  .all()
  .filter(
    (m) => !m.isNonstandard && m.category !== "Status" && m.id !== "struggle",
  )
  .map((m) => ({
    id: m.id,
    name: m.name,
    ko: names.moves[names.moveIds[m.id]] || m.name,
    type: m.type,
    category: m.category,
    power: m.basePower,
    accuracy: m.accuracy,
    priority: m.priority,
    multihit: m.multihit,
    flags: m.flags,
    target: m.target,
    willCrit: m.willCrit,
    overrideOffensiveStat: m.overrideOffensiveStat,
    overrideDefensiveStat: m.overrideDefensiveStat,
    overrideOffensivePokemon: m.overrideOffensivePokemon,
    overrideDefensivePokemon: m.overrideDefensivePokemon,
  }));
const moveIds = new Set(moves.map((m) => m.id));
const union = new Map(
  [...previous.eligible, ...current.eligible].map((s) => [s.id, s]),
);
const pokemon = [...union.values()]
  .map((s) => {
    const dex = current.eligible.some((x) => x.id === s.id)
      ? current.dex
      : previous.dex;
    const img = names.pokemon[slug(s.name)] ||
      names.pokemon[slug(s.baseSpecies)] || { id: s.num };
    const learnsets = dex.species.getFullLearnset(s.id);
    const learn = [
      ...new Set(learnsets.flatMap((l) => Object.keys(l.learnset))),
    ].filter((m) => moveIds.has(m));
    return {
      id: s.id,
      name: s.name,
      ko: localName(s, img.id),
      num: s.num,
      forme: s.forme,
      baseSpecies: s.baseSpecies,
      types: s.types,
      stats: s.baseStats,
      weightkg: s.weightkg,
      abilities: Object.values(s.abilities),
      requiredItem: s.requiredItem,
      imageId: Number(img.id),
      imageIsBase: slug(s.name) !== img.identifier,
      moves: learn,
      regulations: [
        ...(current.eligible.some((x) => x.id === s.id) ? ["mc"] : []),
        ...(previous.eligible.some((x) => x.id === s.id) ? ["mb"] : []),
      ],
    };
  })
  .sort((a, b) => a.num - b.num || a.id.localeCompare(b.id));
const items = current.dex.items
  .all()
  .filter((i) => !i.isNonstandard && i.num > 0 && !i.name.endsWith("Mail"))
  .map((i) => ({
    id: i.id,
    name: i.name,
    ko: names.items[names.itemIds[slug(i.name)]] || i.name,
  }));
const abilities = current.dex.abilities
  .all()
  .filter((a) => !a.isNonstandard)
  .map((a) => ({
    id: a.id,
    name: a.name,
    ko: names.abilities[names.abilityIds[a.id]] || a.name,
    description: a.shortDesc || a.desc,
  }));
const data = {
  meta: {
    checkedAt: "2026-10-13",
    showdownCommit: commit,
    pokeapiCommit: "81d20919845b6a445969b9265aab5cec6b04cece",
    spritesCommit: "0dc105d5b12416932f29b594078282ab4be045f5",
    defaultRegulation: "mc",
    source: "Pokémon Showdown Champions / PokeAPI",
    officialVerified: false,
    level: 50,
    maxPoints: 66,
    maxStatPoints: 32,
  },
  typeNames,
  pokemon,
  moves,
  items,
  abilities,
};
mkdirSync(root + "/public/data", { recursive: true });
writeFileSync(root + "/public/data/champions.json", JSON.stringify(data));
console.log(
  `Saved ${pokemon.length} forms, ${moves.length} damaging moves, ${items.length} items. Reg M-C: ${current.eligible.length}; Reg M-B: ${previous.eligible.length}`,
);
execFileSync("python", ["scripts/fetch-assets.py", "artwork"], {
  cwd: root,
  stdio: "inherit",
});

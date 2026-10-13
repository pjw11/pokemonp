import { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Database,
  ExternalLink,
  FlaskConical,
  Gauge,
  Info,
  Layers,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Trash2,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type {
  Data,
  Species,
  Fighter,
  Conditions,
  MoveData,
  Stat,
} from "./types";
import { STATS, STAT_LABELS, EMPTY, DEFAULT_CONDITIONS } from "./types";
import {
  NATURES,
  initialFighter,
  totalPoints,
  setPoint,
  statValues,
  speed,
  toggleFast,
  damage,
} from "./engine";
type Page = "damage" | "speed" | "dex" | "saved";
type Saved = {
  id: string;
  name: string;
  attacker: Fighter;
  defender: Fighter;
  conditions: Conditions;
  move: string;
  regulation: string;
  date: string;
};
const POPULAR = [
  "garchomp",
  "dragonite",
  "gengar",
  "incineroar",
  "tyranitar",
  "metagross",
  "charizard",
  "greninja",
  "gyarados",
  "gardevoir",
  "sylveon",
  "rotomwash",
  "aegislash",
  "sneasler",
  "archaludon",
];
const TYPES: Record<string, string> = {
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
const named = (names: Data["items"], value: string) =>
  names.find((n) => n.name === value)?.ko || value;
const percent = (n: number) =>
  Math.abs(n * 100 - 100) < 0.0000001
    ? "100"
    : (n * 100).toFixed(1).replace(".0", "");
function initials(v: string) {
  const chars = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  return [...v]
    .map((c) => {
      const n = c.charCodeAt(0) - 44032;
      return n >= 0 && n <= 11171 ? chars[Math.floor(n / 588)] : c;
    })
    .join("");
}
export function matches(s: { ko: string; name: string }, q: string) {
  const query = q.toLowerCase().replaceAll(" ", "");
  return (
    !query ||
    s.ko.toLowerCase().replaceAll(" ", "").includes(query) ||
    s.name.toLowerCase().replaceAll(" ", "").includes(query) ||
    initials(s.ko).includes(query)
  );
}
function Types({ types }: { types: string[] }) {
  return (
    <div className="type-list">
      {types.map((t) => (
        <span key={t} className={"type type-" + t.toLowerCase()}>
          {TYPES[t] || t}
        </span>
      ))}
    </div>
  );
}
function PokemonImage({
  s,
  className = "",
}: {
  s: Species;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={"/pokemon/" + s.imageId + ".webp"}
      alt={s.ko}
      loading="lazy"
    />
  );
}
function Toggle({
  checked,
  onChange,
  children,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={"toggle " + (checked ? "active" : "")}
    >
      {children}
      <span className="switch">
        <span />
      </span>
    </button>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("input,button")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button,input,select,a[href]",
          ) || [],
        );
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CHAMPIONS LAB</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" aria-label="닫기" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Picker({
  data,
  legal,
  onChoose,
  onClose,
  selected,
}: {
  data: Data;
  legal: Species[];
  onChoose: (s: Species) => void;
  onClose: () => void;
  selected: string;
}) {
  const [q, setQ] = useState(""),
    [type, setType] = useState("");
  const filtered = useMemo(
    () =>
      legal
        .filter((p) => matches(p, q) && (!type || p.types.includes(type)))
        .sort((a, b) =>
          q
            ? a.num - b.num
            : (POPULAR.indexOf(a.id) < 0 ? 1000 : POPULAR.indexOf(a.id)) -
              (POPULAR.indexOf(b.id) < 0 ? 1000 : POPULAR.indexOf(b.id)),
        ),
    [legal, q, type],
  );
  return (
    <Modal title="포켓몬 선택" onClose={onClose} wide>
      <div className="picker-search">
        <Search size={19} />
        <input
          autoFocus
          aria-label="포켓몬 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="포켓몬 이름, 영문 이름 또는 초성 검색"
        />
        <select
          aria-label="타입 필터"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">모든 타입</option>
          {Object.entries(data.typeNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="picker-meta">
        <span>{q ? "검색 결과" : "바로 선택하기"}</span>
        <span>{filtered.length}개 폼</span>
      </div>
      <div className="picker-grid">
        {filtered.map((s) => (
          <button
            key={s.id}
            className={
              "picker-pokemon " + (selected === s.id ? "selected" : "")
            }
            aria-label={s.ko + " 선택"}
            onClick={() => onChoose(s)}
          >
            <PokemonImage s={s} />
            <div>
              <strong>{s.ko}</strong>
              <small>
                #{String(s.num).padStart(3, "0")} · {s.name}
              </small>
              <Types types={s.types} />
            </div>
            {selected === s.id && <Check size={16} />}
          </button>
        ))}
        {!filtered.length && (
          <div className="empty-state">
            <Search />
            <h3>검색 결과가 없어요</h3>
            <p>
              현재 규칙에 포함된 포켓몬만 검색됩니다. 다른 이름을 입력해 주세요.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
function FighterCard({
  s,
  f,
  setF,
  data,
  side,
  onSearch,
}: {
  s: Species;
  f: Fighter;
  setF: (f: Fighter) => void;
  data: Data;
  side: "attacker" | "defender";
  onSearch: () => void;
}) {
  const isA = side === "attacker",
    stats = statValues(s, f),
    fast = f.points.spe === 32 && NATURES[f.nature]?.plus === "spe";
  function preset(mode: string) {
    if (mode === "attack") {
      const sp = s.stats.spa > s.stats.atk;
      setF({
        ...f,
        points: { ...EMPTY, hp: 2, [sp ? "spa" : "atk"]: 32, spe: 32 },
        nature: sp ? "Timid" : "Jolly",
        fastBackup: undefined,
      });
    } else
      setF({
        ...f,
        points: {
          ...EMPTY,
          hp: 32,
          [s.stats.def < s.stats.spd ? "def" : "spd"]: 32,
          spe: 2,
        },
        nature: s.stats.def < s.stats.spd ? "Bold" : "Calm",
        fastBackup: undefined,
      });
  }
  return (
    <section
      className={"fighter-card " + side}
      aria-label={isA ? "공격 포켓몬 설정" : "방어 포켓몬 설정"}
    >
      <div className="card-topline">
        <span className="card-label">
          <span className="side-symbol">
            {isA ? <Swords size={14} /> : <Shield size={14} />}
          </span>
          {isA ? "공격 포켓몬" : "방어 포켓몬"}
          <small>{isA ? "ATTACKER" : "DEFENDER"}</small>
        </span>
        <button
          className="icon-button small"
          title="이 포켓몬 설정 초기화"
          aria-label={isA ? "공격 설정 초기화" : "방어 설정 초기화"}
          onClick={() => setF(initialFighter(s, !isA))}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <button className="species-select" onClick={onSearch}>
        <div>
          <strong>{s.ko}</strong>
          <span>{s.name}</span>
        </div>
        <div className="search-icon">
          <Search size={17} />
          <ChevronDown size={14} />
        </div>
      </button>
      <div className="pokemon-hero">
        <div className="hero-details">
          <span className="dex-number">
            NO. {String(s.num).padStart(3, "0")}
          </span>
          <Types types={s.types} />
          <div className="hero-stat">
            <small>
              {isA ? (s.stats.atk >= s.stats.spa ? "공격" : "특수공격") : "HP"}{" "}
              실수치
            </small>
            <strong>
              {isA
                ? s.stats.atk >= s.stats.spa
                  ? stats.atk
                  : stats.spa
                : stats.hp}
              <span>Lv.50</span>
            </strong>
          </div>
        </div>
        <div className="art-halo" />
        <PokemonImage s={s} className="hero-art" />
      </div>
      <div className="card-selects">
        <label>
          특성
          <select
            aria-label={(isA ? "공격" : "방어") + " 특성"}
            value={f.ability}
            onChange={(e) => setF({ ...f, ability: e.target.value })}
          >
            {s.abilities.map((a) => (
              <option key={a} value={a}>
                {named(data.abilities, a)}
              </option>
            ))}
          </select>
        </label>
        <label>
          지닌 도구
          <select
            value={f.item}
            disabled={!!s.requiredItem}
            onChange={(e) =>
              setF({ ...f, item: e.target.value, scarfBackup: undefined })
            }
          >
            <option value="">도구 없음</option>
            {data.items.map((i) => (
              <option key={i.id} value={i.name}>
                {i.ko}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="quick-toggles">
        <Toggle checked={fast} onChange={() => setF(toggleFast(s, f))}>
          <Zap size={14} />
          <span>최속</span>
        </Toggle>
        <Toggle
          checked={f.item === "Choice Scarf"}
          disabled={!!s.requiredItem}
          onChange={() =>
            setF(
              f.item === "Choice Scarf"
                ? { ...f, item: f.scarfBackup || "", scarfBackup: undefined }
                : { ...f, item: "Choice Scarf", scarfBackup: f.item },
            )
          }
        >
          <Wind size={14} />
          <span>구애스카프</span>
        </Toggle>
      </div>
      {s.requiredItem && (
        <small className="form-note">
          메가 폼은 전용 메가스톤으로 고정됩니다.
        </small>
      )}
      <label className="nature-select">
        성격
        <select
          value={f.nature}
          onChange={(e) =>
            setF({ ...f, nature: e.target.value, fastBackup: undefined })
          }
        >
          {Object.entries(NATURES).map(([id, n]) => (
            <option key={id} value={id}>
              {n.ko}
            </option>
          ))}
        </select>
      </label>
      <div className="points-heading">
        <div>
          <SlidersHorizontal size={14} />
          <strong>능력 포인트</strong>
          <span>노력치 조정</span>
        </div>
        <span className="point-total">
          {totalPoints(f)}
          <small> / 66</small>
        </span>
      </div>
      <div className="stat-table">
        <div className="stat-table-head">
          <span>능력치</span>
          <span>포인트 배분</span>
          <span>실수치</span>
        </div>
        {STATS.map((stat) => (
          <div
            key={stat}
            className={"stat-row " + (stat === "spe" ? "speed-row" : "")}
          >
            <label htmlFor={side + "-" + stat}>{STAT_LABELS[stat]}</label>
            <div className="stat-control">
              <input
                id={side + "-" + stat}
                aria-label={
                  (isA ? "공격" : "방어") + " " + STAT_LABELS[stat] + " 포인트"
                }
                type="range"
                min="0"
                max="32"
                value={f.points[stat]}
                style={
                  {
                    "--range-fill": (f.points[stat] / 32) * 100 + "%",
                  } as React.CSSProperties
                }
                onChange={(e) =>
                  setF(setPoint(f, stat, Number(e.target.value)))
                }
              />
              <input
                aria-label={
                  (isA ? "공격" : "방어") +
                  " " +
                  STAT_LABELS[stat] +
                  " 포인트 직접 입력"
                }
                type="number"
                min="0"
                max={Math.min(32, 66 - totalPoints(f) + f.points[stat])}
                value={f.points[stat]}
                onChange={(e) =>
                  setF(setPoint(f, stat, Number(e.target.value)))
                }
              />
            </div>
            <strong>{stats[stat]}</strong>
          </div>
        ))}
      </div>
      <div className="presets">
        <span>빠른 배분</span>
        <button onClick={() => preset("attack")}>
          공격형 <Plus size={11} />
        </button>
        <button onClick={() => preset("defense")}>
          내구형 <Plus size={11} />
        </button>
      </div>
      <details className="advanced">
        <summary>
          상태·랭크 세부 설정 <ChevronDown size={14} />
        </summary>
        <div className="advanced-content">
          <div className="two-inputs">
            <label>
              상태 이상
              <select
                value={f.status}
                onChange={(e) =>
                  setF({ ...f, status: e.target.value as Fighter["status"] })
                }
              >
                <option value="">정상</option>
                <option value="par">마비</option>
                <option value="brn">화상</option>
                <option value="psn">독</option>
                <option value="slp">잠듦</option>
                <option value="frz">얼음</option>
              </select>
            </label>
            <label>
              현재 HP (%)
              <input
                type="number"
                min={1}
                max={100}
                value={f.hpPercent}
                onChange={(e) =>
                  setF({
                    ...f,
                    hpPercent: Math.max(
                      1,
                      Math.min(100, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </label>
          </div>
          <div className="boost-inputs">
            {STATS.filter((k) => k !== "hp").map((k) => (
              <label key={k}>
                {STAT_LABELS[k]} 랭크
                <select
                  value={f.boosts[k]}
                  onChange={(e) =>
                    setF({
                      ...f,
                      boosts: { ...f.boosts, [k]: Number(e.target.value) },
                    })
                  }
                >
                  {Array.from({ length: 13 }, (_, i) => i - 6).map((n) => (
                    <option key={n} value={n}>
                      {n > 0 ? "+" : ""}
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <Toggle
            checked={f.tailwind}
            onChange={() => setF({ ...f, tailwind: !f.tailwind })}
          >
            <Wind size={13} />
            순풍
          </Toggle>
          <Toggle
            checked={f.abilityOn}
            onChange={() => setF({ ...f, abilityOn: !f.abilityOn })}
          >
            <Sparkles size={13} />
            조건부 특성 발동
          </Toggle>
          <small>곡예·슬로스타트 등 조건이 필요한 특성에 적용됩니다.</small>
        </div>
      </details>
    </section>
  );
}
function Sources({ data, onClose }: { data: Data; onClose: () => void }) {
  return (
    <Modal title="계산 기준과 데이터 출처" onClose={onClose}>
      <div className="sources-content">
        <div className="notice">
          <Info size={19} />
          <p>
            Reg M-C를 기본으로 사용하는 <strong>비공식 계산 도구</strong>입니다.
            공식 사이트의 현재 시즌 공지는 이 환경에서 접근할 수 없어 직접
            대조하지 못했습니다. 공식 대회에 사용하기 전 공지를 확인해 주세요.
          </p>
        </div>
        <h3>데이터 스냅샷 · {data.meta.checkedAt}</h3>
        <p>
          사용 가능 목록·폼·종족값·기술 위력: Pokémon Showdown의 Champions 모드
          및 Flat Rules. 환상·제한 전설과 사용 불가 폼을 제외합니다.
        </p>
        <a
          target="_blank"
          rel="noreferrer"
          href={
            "https://github.com/smogon/pokemon-showdown/tree/" +
            data.meta.showdownCommit +
            "/data/mods/champions"
          }
        >
          Pokémon Showdown Champions <ExternalLink size={14} />
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href={
            "https://github.com/PokeAPI/pokeapi/tree/" + data.meta.pokeapiCommit
          }
        >
          한국어 이름 · PokeAPI <ExternalLink size={14} />
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href={
            "https://github.com/PokeAPI/sprites/tree/" + data.meta.spritesCommit
          }
        >
          포켓몬 아트워크 · PokeAPI sprites <ExternalLink size={14} />
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://github.com/smogon/damage-calc"
        >
          데미지 엔진 · @smogon/calc 0.12.0 <ExternalLink size={14} />
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://champions.pokemon.com/"
        >
          Pokémon Champions 공식 사이트 <ExternalLink size={14} />
        </a>
        <h3>능력치와 계산 조건</h3>
        <p>
          레벨 50, 능력 포인트 총 66·각 32, 개체값 31 기준입니다. HP = 종족값 +
          포인트 + 75, 다른 능력 = ⌊(종족값 + 포인트 + 20) × 성격 보정⌋.
        </p>
        <p>
          16종 난수의 확률 분포를 합성하여 반복 타수별 KO 확률을 계산합니다.
          명중을 전제로 같은 조건을 반복하며, 턴 사이 회복·반동·상태 피해·기술에
          따른 능력 변화·기합의띠 등 생존 효과를 포함하지 않습니다. 확정은 이
          조건에서의 최저 난수 기준입니다.
        </p>
        <p>
          스피드 비교는 랭크·도구·순풍·마비·날씨 특성을 반영합니다. 기술의
          우선도, 행동 순서를 바꾸는 특성·도구는 비교하지 않습니다. 트릭룸에서는
          낮은 스피드가 먼저입니다.
        </p>
        <p>
          메가 폼은 직접 선택하며 전용 메가스톤으로 고정됩니다. 폼별 아트워크가
          없는 경우 기본 폼 이미지를 사용합니다. 새 전용 특성의 미검증 효과는
          결과에 표시합니다.
        </p>
        <small>
          Pokémon 및 관련 이미지는 Nintendo / Creatures / GAME FREAK의
          자산입니다. 본 사이트는 공식 서비스와 관계가 없습니다.
        </small>
      </div>
    </Modal>
  );
}
function ConditionsPanel({
  c,
  setC,
}: {
  c: Conditions;
  setC: (c: Conditions) => void;
}) {
  return (
    <section className="field-panel">
      <div className="section-title">
        <span className="section-icon">
          <CloudSun size={17} />
        </span>
        <div>
          <h3>배틀 환경</h3>
          <span>양쪽 포켓몬에 즉시 반영됩니다</span>
        </div>
      </div>
      <div className="field-controls">
        <label>
          날씨
          <select
            value={c.weather}
            onChange={(e) =>
              setC({ ...c, weather: e.target.value as Conditions["weather"] })
            }
          >
            <option value="">날씨 없음</option>
            <option value="Sun">쾌청</option>
            <option value="Rain">비</option>
            <option value="Sand">모래바람</option>
            <option value="Snow">설경</option>
          </select>
        </label>
        <label>
          필드
          <select
            value={c.terrain}
            onChange={(e) =>
              setC({ ...c, terrain: e.target.value as Conditions["terrain"] })
            }
          >
            <option value="">필드 없음</option>
            <option value="Electric">일렉트릭</option>
            <option value="Grassy">그래스</option>
            <option value="Psychic">사이코</option>
            <option value="Misty">미스트</option>
          </select>
        </label>
        <div className="field-toggle-grid">
          <Toggle
            checked={c.reflect}
            onChange={() => setC({ ...c, reflect: !c.reflect })}
          >
            리플렉터
          </Toggle>
          <Toggle
            checked={c.lightScreen}
            onChange={() => setC({ ...c, lightScreen: !c.lightScreen })}
          >
            빛의장막
          </Toggle>
          <Toggle
            checked={c.helpingHand}
            onChange={() => setC({ ...c, helpingHand: !c.helpingHand })}
          >
            도우미
          </Toggle>
          <Toggle
            checked={c.spread}
            onChange={() => setC({ ...c, spread: !c.spread })}
            disabled={!c.doubles}
          >
            광역기 대상 2마리
          </Toggle>
        </div>
      </div>
    </section>
  );
}
function SpeedResult({
  a,
  af,
  b,
  bf,
  c,
}: {
  a: Species;
  af: Fighter;
  b: Species;
  bf: Fighter;
  c: Conditions;
}) {
  const sa = speed(a, af, c),
    sb = speed(b, bf, c),
    tie = sa === sb,
    aFirst = !tie && (c.trickRoom ? sa < sb : sa > sb);
  let needed: number | undefined;
  for (
    let p = 0;
    p <= Math.min(32, 66 - totalPoints(af) + af.points.spe);
    p++
  ) {
    const n = speed(a, { ...af, points: { ...af.points, spe: p } }, c);
    if (c.trickRoom ? n < sb : n > sb) {
      needed = p;
      break;
    }
  }
  return (
    <div className="speed-result">
      <div className="result-eyebrow">
        <Gauge size={16} />
        스피드 비교
        <span className="live-label">
          <i />
          실시간
        </span>
      </div>
      <div className="speed-number-pair">
        <div>
          <small>{a.ko}</small>
          <strong className={aFirst ? "winning" : ""}>{sa}</strong>
        </div>
        <span>VS</span>
        <div>
          <small>{b.ko}</small>
          <strong className={!aFirst && !tie ? "winning" : ""}>{sb}</strong>
        </div>
      </div>
      <div className={"speed-verdict " + (tie ? "tie" : "")}>
        <Zap size={18} />
        <strong>
          {tie ? "동속 · 선공 확률 50%" : (aFirst ? a.ko : b.ko) + " 선공"}
        </strong>
        <span>
          {tie
            ? "행동 순서는 무작위로 결정됩니다"
            : Math.abs(sa - sb) +
              " 차이 · " +
              (c.trickRoom ? "트릭룸 기준" : "스피드 기준")}
        </span>
      </div>
      <div className="speed-detail-row">
        <span>공격 측 기본 실수치</span>
        <strong>{statValues(a, af).spe}</strong>
      </div>
      <div className="speed-detail-row">
        <span>방어 측 기본 실수치</span>
        <strong>{statValues(b, bf).spe}</strong>
      </div>
      <div className="speed-tip">
        <Target size={17} />
        <div>
          <strong>
            {needed === undefined
              ? "현재 조건에서 추월 불가"
              : needed === 0
                ? "스피드 투자 없이 선공 가능"
                : `최소 ${needed} 포인트로 선공`}
          </strong>
          <p>현재 성격·도구·상태·남은 포인트 기준</p>
        </div>
      </div>
      <p className="small-note">
        기술 우선도 및 행동 순서 특성·도구는 제외합니다. 동속 확률은 동일
        우선도를 전제로 합니다.
      </p>
    </div>
  );
}
function DamageResult({
  a,
  af,
  b,
  bf,
  m,
  c,
  data,
  onMove,
  setC,
}: {
  a: Species;
  af: Fighter;
  b: Species;
  bf: Fighter;
  m: MoveData;
  c: Conditions;
  data: Data;
  onMove: () => void;
  setC: (c: Conditions) => void;
}) {
  const result = useMemo(() => {
    try {
      return { value: damage(a, af, b, bf, m, c), error: null };
    } catch (e) {
      return {
        value: null,
        error: e instanceof Error ? e.message : "계산에 실패했습니다",
      };
    }
  }, [a, af, b, bf, m, c]);
  const r = result.value;
  const hitOptions =
    typeof m.multihit === "number"
      ? [m.multihit]
      : m.multihit
        ? Array.from(
            { length: m.multihit[1] - m.multihit[0] + 1 },
            (_, i) => i + (m.multihit as [number, number])[0],
          )
        : [];
  return (
    <section className="result-card">
      <div className="result-eyebrow">
        <Activity size={15} />
        계산 결과
        <span className="live-label">
          <i />
          실시간
        </span>
      </div>
      <div className="move-selection">
        <label>사용 기술</label>
        <button onClick={onMove}>
          <div>
            <strong>{m.ko}</strong>
            <span>
              <span className={"type type-" + m.type.toLowerCase()}>
                {TYPES[m.type]}
              </span>
              {m.category === "Physical" ? "물리" : "특수"} · 위력{" "}
              {m.power || "변동"}
            </span>
          </div>
          <ChevronDown size={17} />
        </button>
      </div>
      <div className="result-options">
        <Toggle
          checked={c.critical}
          onChange={() => setC({ ...c, critical: !c.critical })}
        >
          <Target size={14} />
          급소
        </Toggle>
        {m.multihit && (
          <label className="hit-count">
            명중 횟수
            <select
              aria-label="연속기 명중 횟수"
              disabled={typeof m.multihit === "number"}
              value={typeof m.multihit === "number" ? m.multihit : c.hits}
              onChange={(e) => setC({ ...c, hits: Number(e.target.value) })}
            >
              {hitOptions.map((n) => (
                <option key={n} value={n}>
                  {n}회
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {r ? (
        <>
          <div className="damage-highlight">
            <span>예상 데미지</span>
            <h2>
              {((r.range[0] / r.maxHP) * 100).toFixed(1)}
              <span> – </span>
              {((r.range[1] / r.maxHP) * 100).toFixed(1)}
              <small>%</small>
            </h2>
            <p>
              {r.range[0]} – {r.range[1]} HP <span>/ {r.maxHP}</span>
            </p>
            <div className="hp-track">
              <div
                className="hp-guaranteed"
                style={{
                  width: Math.min(100, (r.range[0] / r.maxHP) * 100) + "%",
                }}
              />
              <div
                className="hp-random"
                style={{
                  left: Math.min(100, (r.range[0] / r.maxHP) * 100) + "%",
                  width:
                    Math.min(
                      100 - (r.range[0] / r.maxHP) * 100,
                      ((r.range[1] - r.range[0]) / r.maxHP) * 100,
                    ) + "%",
                }}
              />
            </div>
            <div className="hp-legend">
              <span>
                <i />
                최소 데미지
              </span>
              <span>
                <i />
                난수 범위
              </span>
              <span>현재 HP {r.hp}</span>
            </div>
          </div>
          <div className="ko-verdict">
            <span className="verdict-icon">
              <Swords size={22} />
            </span>
            <div>
              <h3>{r.label}</h3>
              <p>
                {r.guaranteed === Infinity
                  ? "이 조건에서는 KO에 도달하지 않습니다"
                  : r.possible === r.guaranteed
                    ? "최저 난수에서도 쓰러뜨립니다"
                    : `최저 난수 기준 확정 ${r.guaranteed}타`}
              </p>
            </div>
            <Check size={17} />
          </div>
          <div className="ko-list">
            <div className="ko-list-title">
              <strong>타수별 KO 확률</strong>
              <span>명중 기준</span>
            </div>
            {r.chances.map(({ n, chance }) => (
              <div
                key={n}
                className={
                  "ko-row " + (chance >= 1 - 0.00000001 ? "certain" : "")
                }
              >
                <span>{n}타</span>
                <div className="chance-track">
                  <span style={{ width: chance * 100 + "%" }} />
                </div>
                <strong>{percent(chance)}%</strong>
              </div>
            ))}
          </div>
          <details className="roll-detail">
            <summary>
              16개 난수 자세히 보기 <ChevronDown size={14} />
            </summary>
            <div className="roll-grid">
              {r.rolls.map((n, i) => (
                <span key={i}>
                  <small>{85 + i}%</small>
                  <strong>{n}</strong>
                </span>
              ))}
            </div>
            {m.multihit && (
              <p className="small-note">
                표는 모든 타격에 같은 난수가 나온 경우입니다. KO 확률은 각
                타격의 독립 난수로 계산합니다.
              </p>
            )}
          </details>
          <div className="result-footnote">
            <Info size={13} />
            <span>
              같은 조건에서 반복 공격할 때의 결과입니다.
              <br />턴 사이 회복·능력 변화·생존 효과 제외
            </span>
          </div>
          {r.warnings.map((w) => (
            <p className="calculation-warning" key={w}>
              {w}
            </p>
          ))}
        </>
      ) : (
        <div className="calculation-warning">
          <h3>계산을 완료하지 못했습니다</h3>
          <p>{result.error}</p>
          <p>다른 기술 또는 폼을 선택해 주세요.</p>
        </div>
      )}
    </section>
  );
}
function MovePicker({
  moves,
  chosen,
  onChoose,
  onClose,
}: {
  moves: MoveData[];
  chosen: string;
  onChoose: (m: MoveData) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = moves
    .filter((m) => matches(m, q))
    .sort((a, b) => b.power - a.power);
  return (
    <Modal title="공격 기술 선택" onClose={onClose}>
      <div className="picker-search">
        <Search size={18} />
        <input
          autoFocus
          placeholder="배울 수 있는 기술 검색"
          aria-label="기술 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="picker-meta">
        <span>선택한 포켓몬의 공격 기술</span>
        <span>{filtered.length}개</span>
      </div>
      <div className="move-picker-list">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => onChoose(m)}
            className={chosen === m.id ? "selected" : ""}
          >
            <div>
              <strong>{m.ko}</strong>
              <small>{m.name}</small>
            </div>
            <span className={"type type-" + m.type.toLowerCase()}>
              {TYPES[m.type]}
            </span>
            <span>{m.category === "Physical" ? "물리" : "특수"}</span>
            <strong>{m.power || "변동"}</strong>
            {chosen === m.id ? <Check size={15} /> : <ChevronRight size={15} />}
          </button>
        ))}
        {!filtered.length && (
          <div className="empty-state">
            배울 수 있는 공격 기술을 찾을 수 없습니다.
          </div>
        )}
      </div>
    </Modal>
  );
}
function SpeedTable({
  data,
  legal,
  a,
  af,
  c,
  onSelect,
}: {
  data: Data;
  legal: Species[];
  a: Species;
  af: Fighter;
  c: Conditions;
  onSelect: (s: Species) => void;
}) {
  const [q, setQ] = useState(""),
    [onlyFaster, setOnlyFaster] = useState(false),
    [limit, setLimit] = useState(12);
  const as = speed(a, af, c);
  const list = useMemo(
    () =>
      legal
        .map((s) => {
          const f = initialFighter(s);
          f.item = s.requiredItem || "";
          const n = speed(s, f, c);
          return { s, n, raw: statValues(s, f).spe };
        })
        .filter(
          ({ s, n }) =>
            matches(s, q) && (!onlyFaster || (c.trickRoom ? n < as : n > as)),
        )
        .sort((x, y) => (c.trickRoom ? x.n - y.n : y.n - x.n)),
    [legal, q, onlyFaster, as, c],
  );
  return (
    <section className="speed-table-panel">
      <div className="speed-table-header">
        <div className="section-title">
          <span className="section-icon">
            <Layers size={17} />
          </span>
          <div>
            <h3>스피드 티어</h3>
            <span>현재 규칙 · 최속 32P · 스카프·순풍·상태 없음</span>
          </div>
        </div>
        <div className="speed-table-filters">
          <button
            className={"filter-pill " + (onlyFaster ? "active" : "")}
            onClick={() => {
              setOnlyFaster(!onlyFaster);
              setLimit(12);
            }}
          >
            <SlidersHorizontal size={13} />
            나보다 선공
          </button>
          <div className="table-search">
            <Search size={15} />
            <input
              aria-label="스피드 티어 검색"
              placeholder="포켓몬 검색"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(12);
              }}
            />
          </div>
        </div>
      </div>
      <div className="speed-table-scroll">
        <table>
          <thead>
            <tr>
              <th>포켓몬</th>
              <th>타입</th>
              <th>스피드 종족값</th>
              <th>최속 실수치</th>
              <th>내 포켓몬과 비교</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map(({ s, n }) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(s);
                }}
                aria-label={s.ko + " 비교 대상으로 선택"}
              >
                <td>
                  <PokemonImage s={s} />
                  <div>
                    <strong>{s.ko}</strong>
                    <small>{s.name}</small>
                  </div>
                </td>
                <td>
                  <Types types={s.types} />
                </td>
                <td>{s.stats.spe}</td>
                <td>
                  <strong>{n}</strong>
                </td>
                <td>
                  <span
                    className={
                      "speed-diff " +
                      (n === as
                        ? "equal"
                        : (c.trickRoom ? n < as : n > as)
                          ? "faster"
                          : "slower")
                    }
                  >
                    {n === as
                      ? "동속"
                      : (c.trickRoom ? n < as : n > as)
                        ? "상대 선공"
                        : "내 포켓몬 선공"}
                    {n !== as && <small>{Math.abs(n - as)} 차이</small>}
                  </span>
                  <ChevronRight size={15} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="empty-state">조건에 맞는 포켓몬이 없습니다.</div>
        )}
      </div>
      {list.length > limit && (
        <button className="load-more" onClick={() => setLimit((n) => n + 24)}>
          더 보기 · {limit} / {list.length}
          <ChevronDown size={15} />
        </button>
      )}
      <div className="table-note">
        <Info size={13} />
        포켓몬을 선택하면 방어 측 비교 대상에 적용합니다. 날씨 특성과 현재 배틀
        필드를 반영합니다.
      </div>
    </section>
  );
}
function DexPage({
  data,
  legal,
  onSelect,
}: {
  data: Data;
  legal: Species[];
  onSelect: (s: Species) => void;
}) {
  const [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [limit, setLimit] = useState(36);
  const list = legal.filter(
    (p) => matches(p, q) && (!type || p.types.includes(type)),
  );
  return (
    <>
      <div className="dex-toolbar">
        <div className="picker-search">
          <Search size={19} />
          <input
            aria-label="도감 검색"
            placeholder="이름 또는 초성으로 검색하세요"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(36);
            }}
          />
        </div>
        <select
          aria-label="도감 타입 필터"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setLimit(36);
          }}
        >
          <option value="">모든 타입</option>
          {Object.entries(data.typeNames).map(([id, ko]) => (
            <option key={id} value={id}>
              {ko}
            </option>
          ))}
        </select>
        <span>{list.length}개 폼</span>
      </div>
      <div className="dex-grid">
        {list.slice(0, limit).map((s) => (
          <button key={s.id} className="dex-card" onClick={() => onSelect(s)}>
            <span className="dex-number">
              #{String(s.num).padStart(3, "0")}
            </span>
            <PokemonImage s={s} />
            <h3>{s.ko}</h3>
            <small>{s.name}</small>
            <Types types={s.types} />
            <div className="dex-stats">
              {STATS.map((k) => (
                <span key={k}>
                  <small>{STAT_LABELS[k]}</small>
                  <strong>{s.stats[k]}</strong>
                </span>
              ))}
            </div>
            <div className="dex-card-footer">
              <span>
                종족값 합계 {Object.values(s.stats).reduce((x, y) => x + y, 0)}
              </span>
              <ArrowUpRight size={15} />
            </div>
          </button>
        ))}
      </div>
      {!list.length && <div className="empty-state">검색 결과가 없어요.</div>}
      {list.length > limit && (
        <button className="load-more" onClick={() => setLimit((n) => n + 36)}>
          포켓몬 더 보기 <ChevronDown size={16} />
        </button>
      )}
      <div className="table-note">
        <Info size={13} />
        도감을 누르면 공격 포켓몬으로 선택합니다. 일부 폼은 기본 폼의 이미지를
        공유합니다.
      </div>
    </>
  );
}
export default function App() {
  const [data, setData] = useState<Data | null>(null),
    [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState<Page>("damage"),
    [regulation, setRegulation] = useState("mc"),
    [aF, setAF] = useState<Fighter | null>(null),
    [bF, setBF] = useState<Fighter | null>(null),
    [c, setC] = useState(DEFAULT_CONDITIONS),
    [move, setMove] = useState("dragonclaw"),
    [picker, setPicker] = useState<"attacker" | "defender" | "move" | null>(
      null,
    ),
    [sources, setSources] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false),
    [toast, setToast] = useState(""),
    [saveOpen, setSaveOpen] = useState(false),
    [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("champions-lab-saved") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/champions.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("data");
        return r.json();
      })
      .then((d: Data) => {
        setData(d);
        setAF(initialFighter(d.pokemon.find((p) => p.id === "garchomp")!));
        setBF(
          initialFighter(d.pokemon.find((p) => p.id === "dragonite")!, true),
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoadError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  const legal = useMemo(
    () => data?.pokemon.filter((p) => p.regulations.includes(regulation)) || [],
    [data, regulation],
  );
  if (loadError)
    return (
      <div className="boot-screen">
        <FlaskConical size={42} />
        <h1>데이터를 불러오지 못했습니다</h1>
        <p>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p>
        <button onClick={() => location.reload()}>다시 시도</button>
      </div>
    );
  if (!data || !aF || !bF)
    return (
      <div className="boot-screen">
        <FlaskConical size={42} />
        <h1>챔피언스 랩</h1>
        <p>배틀 데이터를 준비하고 있습니다…</p>
      </div>
    );
  const a = data.pokemon.find((p) => p.id === aF.id)!,
    b = data.pokemon.find((p) => p.id === bF.id)!;
  const availableMoves = data.moves.filter((m) => a.moves.includes(m.id));
  const m = availableMoves.find((m) => m.id === move) || availableMoves[0];
  function choose(s: Species, side: "attacker" | "defender") {
    if (side === "attacker") {
      setAF(initialFighter(s));
      const allowed = data!.moves.filter((m) => s.moves.includes(m.id));
      const best = allowed.find(
        (m) =>
          s.types.includes(m.type) &&
          (s.stats.atk >= s.stats.spa
            ? m.category === "Physical"
            : m.category === "Special") &&
          m.power >= 75 &&
          m.power <= 100,
      );
      setMove(best?.id || allowed[0]?.id || "");
    } else setBF(initialFighter(s, true));
    setPicker(null);
  }
  function updateReg(value: string) {
    setRegulation(value);
    const next = data!.pokemon.filter((p) => p.regulations.includes(value));
    if (!next.some((p) => p.id === aF!.id))
      choose(next.find((p) => p.id === "garchomp") || next[0], "attacker");
    if (!next.some((p) => p.id === bF!.id))
      choose(next.find((p) => p.id === "dragonite") || next[0], "defender");
  }
  function store(next: Saved[]) {
    try {
      localStorage.setItem("champions-lab-saved", JSON.stringify(next));
      setSaved(next);
      return true;
    } catch {
      setToast("브라우저 저장 공간에 접근할 수 없습니다.");
      return false;
    }
  }
  function saveMatch() {
    const entry: Saved = {
      id: crypto.randomUUID(),
      name: saveName.trim() || `${a.ko} vs ${b.ko}`,
      attacker: aF!,
      defender: bF!,
      conditions: c,
      move: m?.id || "",
      regulation,
      date: new Date().toLocaleDateString("ko-KR"),
    };
    if (store([entry, ...saved])) {
      setSaveOpen(false);
      setToast("매치업을 이 브라우저에 저장했습니다.");
    }
  }
  const nav = [
    { id: "damage" as Page, name: "데미지 계산기", icon: Swords },
    { id: "speed" as Page, name: "스피드 계산기", icon: Gauge },
    { id: "dex" as Page, name: "포켓몬 도감", icon: Database },
    { id: "saved" as Page, name: "저장한 매치업", icon: Bookmark },
  ];
  const titles = {
    damage: {
      title: "승부를 바꾸는 숫자.",
      desc: "확정 몇 타부터 스피드 한 끗까지. 다음 수를 정확하게 준비하세요.",
    },
    speed: {
      title: "한 끗 빠르게, 한 수 먼저.",
      desc: "최속, 스카프, 순풍. 선공에 필요한 스피드를 실시간으로 비교하세요.",
    },
    dex: {
      title: "당신의 다음 파트너.",
      desc: "현재 규칙의 포켓몬, 타입, 종족값을 한눈에. 이름으로 바로 찾아보세요.",
    },
    saved: {
      title: "준비해 둔, 승리의 한 수.",
      desc: "자주 쓰는 매치업을 저장하고 언제든 이어서 계산하세요.",
    },
  };
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobileMenu ? "mobile-open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("damage");
            setMobileMenu(false);
          }}
        >
          <div className="brand-mark">
            <FlaskConical size={23} />
            <span />
          </div>
          <div>
            CHAMPIONS
            <strong>
              LAB<span>®</span>
            </strong>
          </div>
        </a>
        <div className="workspace-label">YOUR BATTLE WORKSPACE</div>
        <nav>
          {nav.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "nav-active" : ""}
              onClick={() => {
                setPage(id);
                setMobileMenu(false);
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
              {id === "saved" && saved.length > 0 ? (
                <small>{saved.length}</small>
              ) : page === id ? (
                <i />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <Sparkles size={20} />
            </div>
            <span>작은 차이, 큰 승리.</span>
            <p>
              완벽한 한 수는
              <br />
              정확한 계산에서 시작됩니다.
            </p>
            <div className="tip-line">
              <i />
              <i />
              <i />
            </div>
          </div>
          <button className="source-link" onClick={() => setSources(true)}>
            <Info size={16} />
            데이터 출처 및 계산 기준
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-status">
            <span>
              <i />
              ALL SYSTEMS READY
            </span>
            <small>비공식 Pokémon 배틀 도구</small>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <div className="sidebar-overlay" onClick={() => setMobileMenu(false)} />
      )}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label="메뉴 열기"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <FlaskConical size={14} />
            <span>배틀 연구실</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === page)?.name}</strong>
          </div>
          <button className="data-version" onClick={() => setSources(true)}>
            <span className="status-dot" />
            커뮤니티 기준 · {data.meta.checkedAt}
            <Info size={13} />
          </button>
        </header>
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              POKÉMON CHAMPIONS <span>·</span> BATTLE LAB
            </div>
            <h1>{titles[page].title}</h1>
            <p>{titles[page].desc}</p>
          </div>
          <div className="heading-decoration">
            <div className="orbit-ring" />
            <Zap size={33} />
            <span>01 / LAB</span>
          </div>
        </section>
        <div className="workspace-toolbar">
          <div className="page-tabs">
            {nav.slice(0, 2).map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => setPage(id)}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>
          <div className="rule-controls">
            <span className="rule-label">배틀 규칙</span>
            <select
              aria-label="레귤레이션"
              value={regulation}
              onChange={(e) => updateReg(e.target.value)}
            >
              <option value="mc">Regulation M-C</option>
              <option value="mb">Regulation M-B</option>
            </select>
            <div className="battle-mode">
              <button
                className={!c.doubles ? "active" : ""}
                onClick={() => setC({ ...c, doubles: false })}
              >
                싱글
              </button>
              <button
                className={c.doubles ? "active" : ""}
                onClick={() => setC({ ...c, doubles: true })}
              >
                더블
              </button>
            </div>
          </div>
        </div>
        {(page === "damage" || page === "speed") && (
          <>
            <div className="matchup-heading">
              <div>
                <span className="section-index">01</span>
                <h2>매치업 설정</h2>
                <span className="subtle">Lv.50 · {legal.length}개 폼</span>
              </div>
              <div className="matchup-actions">
                <button
                  title="공수 교체"
                  onClick={() => {
                    setAF(bF);
                    setBF(aF);
                    setMove(
                      data.moves.find(
                        (m) =>
                          b.moves.includes(m.id) &&
                          b.types.includes(m.type) &&
                          m.power >= 75,
                      )?.id || b.moves[0],
                    );
                    setToast("공격과 방어 포켓몬을 교체했습니다.");
                  }}
                >
                  <ArrowLeftRight size={14} />
                  <span>공수 교체</span>
                </button>
                <button
                  onClick={() => {
                    setSaveName(a.ko + " vs " + b.ko);
                    setSaveOpen(true);
                  }}
                >
                  <Bookmark size={14} />
                  <span>매치업 저장</span>
                </button>
              </div>
            </div>
            <div className="lab-grid">
              <FighterCard
                s={a}
                f={aF}
                setF={setAF}
                data={data}
                side="attacker"
                onSearch={() => setPicker("attacker")}
              />
              <FighterCard
                s={b}
                f={bF}
                setF={setBF}
                data={data}
                side="defender"
                onSearch={() => setPicker("defender")}
              />
              <div className="results-column">
                {page === "damage" && m ? (
                  <DamageResult
                    a={a}
                    af={aF}
                    b={b}
                    bf={bF}
                    m={m}
                    c={c}
                    data={data}
                    onMove={() => setPicker("move")}
                    setC={setC}
                  />
                ) : page === "damage" ? (
                  <section className="result-card transform-note">
                    <div className="result-eyebrow">
                      <Info size={16} />
                      변신 전 포켓몬
                    </div>
                    <h3>메타몽은 변신이 필요해요.</h3>
                    <p>
                      변신 전에는 공격 기술이 없습니다. 현재 스피드는 변신 전
                      기준이며, 변신 후 능력치 복사는 아직 지원하지 않습니다.
                    </p>
                    <button onClick={() => setPage("speed")}>
                      변신 전 스피드 비교 <ArrowRight size={15} />
                    </button>
                  </section>
                ) : null}
                <section className="speed-card">
                  <SpeedResult a={a} af={aF} b={b} bf={bF} c={c} />
                  <Toggle
                    checked={c.trickRoom}
                    onChange={() => setC({ ...c, trickRoom: !c.trickRoom })}
                  >
                    <Layers size={14} />
                    트릭룸
                  </Toggle>
                </section>
                {page === "speed" && (
                  <div className="mini-guide">
                    <span className="eyebrow">QUICK GUIDE</span>
                    <h3>스피드, 쉽게 맞추세요.</h3>
                    <p>
                      <Zap size={15} />
                      <strong>최속</strong>스피드 32P + 상승 성격
                    </p>
                    <p>
                      <Wind size={15} />
                      <strong>스카프</strong>지닌 도구로 스피드 ×1.5
                    </p>
                    <p>
                      <SlidersHorizontal size={15} />
                      <strong>세부 조정</strong>포인트 1씩 바로 계산
                    </p>
                    <div className="small-note">
                      최속 설정에 포인트가 부족하면 다른 능력 포인트를 줄여 총
                      66P를 유지합니다.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <ConditionsPanel c={c} setC={setC} />
            {page === "speed" ? (
              <SpeedTable
                data={data}
                legal={legal}
                a={a}
                af={aF}
                c={c}
                onSelect={(s) => {
                  setBF(initialFighter(s));
                  setToast(s.ko + "의 최속 설정을 비교 대상에 적용했습니다.");
                }}
              />
            ) : (
              <section className="speed-banner">
                <div className="banner-icon">
                  <Gauge size={24} />
                </div>
                <div>
                  <h3>데미지만큼 중요한, 선공 한 끗.</h3>
                  <p>
                    현재 매치업의 스피드를 비교하고 필요한 포인트를 찾아보세요.
                  </p>
                </div>
                <button onClick={() => setPage("speed")}>
                  스피드 계산기로 <ArrowRight size={16} />
                </button>
              </section>
            )}
          </>
        )}
        {page === "dex" && (
          <DexPage
            data={data}
            legal={legal}
            onSelect={(s) => {
              choose(s, "attacker");
              setPage("damage");
              setToast(s.ko + "을(를) 공격 포켓몬으로 선택했습니다.");
            }}
          />
        )}
        {page === "saved" && (
          <div className="saved-page">
            {!saved.length ? (
              <div className="saved-empty">
                <div>
                  <Bookmark size={30} />
                </div>
                <h2>아직 저장된 매치업이 없어요</h2>
                <p>
                  계산기에서 ‘매치업 저장’을 눌러
                  <br />
                  자주 쓰는 조합을 모아보세요.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setPage("damage")}
                >
                  계산하러 가기 <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="saved-grid">
                {saved.map((entry) => {
                  const sa = data.pokemon.find(
                      (p) => p.id === entry.attacker.id,
                    ),
                    sb = data.pokemon.find((p) => p.id === entry.defender.id);
                  if (!sa || !sb) return null;
                  return (
                    <article key={entry.id} className="saved-card">
                      <div className="saved-card-top">
                        <span>
                          REG {entry.regulation === "mc" ? "M-C" : "M-B"} ·{" "}
                          {entry.date}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={entry.name + " 삭제"}
                          onClick={() => {
                            store(saved.filter((s) => s.id !== entry.id));
                            setToast("매치업을 삭제했습니다.");
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="saved-pokemon-pair">
                        <PokemonImage s={sa} />
                        <span>VS</span>
                        <PokemonImage s={sb} />
                      </div>
                      <h3>{entry.name}</h3>
                      <p>
                        {sa.ko} → {sb.ko}
                      </p>
                      <button
                        className="saved-load"
                        onClick={() => {
                          setAF(entry.attacker);
                          setBF(entry.defender);
                          setC(entry.conditions);
                          setMove(entry.move);
                          setRegulation(entry.regulation);
                          setPage("damage");
                          setToast("저장한 매치업을 불러왔습니다.");
                        }}
                      >
                        계산 이어하기 <ArrowUpRight size={16} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
            <p className="small-note saved-note">
              매치업은 현재 브라우저에 저장됩니다. 브라우저 데이터를 삭제하면
              함께 삭제됩니다.
            </p>
          </div>
        )}
        <footer className="main-footer">
          <span>
            <span className="footer-mark">
              <FlaskConical size={13} />
            </span>
            CHAMPIONS LAB <small>Think ahead. Battle better.</small>
          </span>
          <button onClick={() => setSources(true)}>
            비공식 도구 · 데이터 및 계산 기준 <ArrowUpRight size={12} />
          </button>
        </footer>
      </main>
      {picker === "attacker" || picker === "defender" ? (
        <Picker
          data={data}
          legal={legal}
          selected={picker === "attacker" ? a.id : b.id}
          onClose={() => setPicker(null)}
          onChoose={(s) => choose(s, picker)}
        />
      ) : null}
      {picker === "move" && m && (
        <MovePicker
          moves={availableMoves}
          chosen={m.id}
          onClose={() => setPicker(null)}
          onChoose={(m) => {
            setMove(m.id);
            setPicker(null);
          }}
        />
      )}
      {sources && <Sources data={data} onClose={() => setSources(false)} />}
      {saveOpen && (
        <Modal title="매치업 저장" onClose={() => setSaveOpen(false)}>
          <form
            className="save-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveMatch();
            }}
          >
            <label>
              매치업 이름
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={70}
                placeholder={a.ko + " vs " + b.ko}
              />
            </label>
            <p>포켓몬, 포인트, 기술, 배틀 환경을 함께 저장합니다.</p>
            <button type="submit" className="primary-button">
              <Bookmark size={16} />이 브라우저에 저장
            </button>
          </form>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

export type TrophyDefinition = {
  id: string;
  name: string;
  emoji: string;
  unlockDays: number;
  description: string;
};

export const TROPHY_CATALOG: TrophyDefinition[] = [
  {
    id: "first-table-mini",
    name: "First Table 微缩模型",
    emoji: "🍽️",
    unlockDays: 1,
    description: "累计登录 1 天解锁",
  },
  {
    id: "detective-hat",
    name: "侦探帽",
    emoji: "🕵️‍♂️",
    unlockDays: 3,
    description: "累计登录 3 天解锁",
  },
  {
    id: "raincoat",
    name: "雨衣",
    emoji: "🧥",
    unlockDays: 5,
    description: "累计登录 5 天解锁",
  },
  {
    id: "umbrella",
    name: "透明小伞",
    emoji: "☂️",
    unlockDays: 7,
    description: "累计登录 7 天解锁",
  },
  {
    id: "map-scroll",
    name: "地图卷轴",
    emoji: "🗺️",
    unlockDays: 10,
    description: "累计登录 10 天解锁",
  },
  {
    id: "golden-bowl",
    name: "金饭碗",
    emoji: "🥇",
    unlockDays: 14,
    description: "累计登录 14 天解锁",
  },
];

export function getUnlockedTrophyIds(loginDays: number) {
  return TROPHY_CATALOG.filter((t) => loginDays >= t.unlockDays).map(
    (t) => t.id
  );
}

export function getTrophyById(id: string) {
  return TROPHY_CATALOG.find((t) => t.id === id);
}

export function getTrophyByName(name: string) {
  return TROPHY_CATALOG.find((t) => t.name === name);
}

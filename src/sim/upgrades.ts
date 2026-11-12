import type { Inventory } from './tiles';

export type UpgradeId = 'battery' | 'pick' | 'pack' | 'boots' | 'armor' | 'lamp' | 'fab' | 'turret';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  maxLevel: number;
  cost(level: number): Inventory;
  /** Raids cleared needed to buy the next level (raid blueprints); default none. */
  needRaids?(level: number): number;
}

const scale = (base: number, level: number) => Math.ceil(base * Math.pow(1.55, level));

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'battery',
    name: 'Battery cell',
    desc: '+60 battery',
    maxLevel: 8,
    cost: (l) => ({ iron_scrap: scale(4, l), ...(l >= 3 ? { copper_wire: scale(3, l - 3) } : {}) }),
  },
  {
    id: 'pick',
    name: 'Drill bit',
    desc: '+35% dig speed',
    maxLevel: 8,
    cost: (l) => ({ iron_scrap: scale(5, l), ...(l >= 2 ? { copper_wire: scale(4, l - 2) } : {}) }),
  },
  {
    id: 'pack',
    name: 'Cargo pack',
    desc: '+12 carry slots',
    maxLevel: 8,
    cost: (l) => ({ rust: scale(12, l), iron_scrap: scale(2, l) }),
  },
  {
    id: 'boots',
    name: 'Servo boots',
    desc: '+0.5 speed',
    maxLevel: 5,
    cost: (l) => ({ copper_wire: scale(4, l), iron_scrap: scale(5, l) }),
  },
  {
    id: 'armor',
    name: 'Plating',
    desc: '+20 max health',
    maxLevel: 5,
    cost: (l) => ({ metal: scale(10, l), iron_scrap: scale(5, l) }),
  },
  {
    id: 'lamp',
    name: 'Suit lamp',
    desc: '+1.5 tiles of light',
    maxLevel: 4,
    cost: (l) => ({ iron_scrap: scale(7, l), copper_wire: scale(2, l) }),
  },
  {
    id: 'fab',
    name: 'Fabricator',
    desc: 'Unlocks machines',
    maxLevel: 2,
    cost: (l) => (l === 0 ? { iron_scrap: 6, rust: 10 } : { metal: 6, copper_wire: 4, iron_scrap: 8 }),
  },
  {
    id: 'turret',
    name: 'Turret core',
    desc: 'Mk II/III: +50% dmg, +1.5 range',
    maxLevel: 2,
    cost: (l) => (l === 0 ? { metal: 10, copper_wire: 6, crystal: 3 } : { metal: 16, circuit: 6, crystal: 6 }),
    // Raid blueprints: Mk II after 3 cleared raids, Mk III after 9 (raids.ts RAID_BLUEPRINTS).
    needRaids: (l) => (l === 0 ? 3 : 9),
  },
];

export type Levels = Partial<Record<UpgradeId, number>>;

export const upgradeById = (id: string): UpgradeDef | undefined => UPGRADES.find((u) => u.id === id);

export interface Derived {
  maxBattery: number;
  digPower: number;
  packCap: number;
  speed: number;
  maxHp: number;
  /** Suit lamp light radius in tiles. */
  lampRadius: number;
}

export function derive(l: Levels): Derived {
  const g = (id: UpgradeId) => l[id] ?? 0;
  return {
    maxBattery: 240 + 60 * g('battery'),
    digPower: 1 + 0.35 * g('pick'),
    packCap: 30 + 12 * g('pack'),
    speed: 7 + 0.5 * g('boots'),
    maxHp: 100 + 20 * g('armor'),
    lampRadius: 6.5 + 1.5 * g('lamp'),
  };
}

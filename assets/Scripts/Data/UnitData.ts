/** 兵种分类 */
export enum UnitCategory {
    MELEE = 'melee',
    RANGED = 'ranged',
    SPECIAL = 'special',
    ULTIMATE = 'ultimate',
}

/** 兵种外观配置 */
export interface UnitVisualConfig {
    fillColor: { r: number; g: number; b: number };
    strokeColor: { r: number; g: number; b: number };
    radius: number;
}

/** 兵种属性 */
export interface UnitStats {
    maxHp: number;
    attackDamage: number;
    attackInterval: number;
    attackRange: number;
    /** 溅射半径（法师 AOE 专用） */
    splashRadius?: number;
    /** 单次治疗量（治疗兵专用） */
    healAmount?: number;
    /** 减速倍率，0~1（减速塔专用） */
    slowFactor?: number;
}

/** 兵种数据定义 */
export interface UnitDataDef {
    id: string;
    name: string;
    description: string;
    category: UnitCategory;
    cost: number;
    buildCd: number;
    stats: UnitStats;
    visual: UnitVisualConfig;
    tags: string[];
}

/** 所有兵种配置 */
export const UNIT_TYPES: UnitDataDef[] = [
    // ===== 近战 =====
    {
        id: 'shield_guard', name: '盾卫兵',
        description: '高血量近战肉盾', category: UnitCategory.MELEE,
        cost: 15, buildCd: 2.0,
        stats: { maxHp: 200, attackDamage: 8, attackInterval: 1.5, attackRange: 40 },
        visual: { fillColor: { r: 50, g: 120, b: 200 }, strokeColor: { r: 100, g: 200, b: 255 }, radius: 28 },
        tags: ['tank'],
    },
    {
        id: 'spearman', name: '枪兵',
        description: '对空单位', category: UnitCategory.MELEE,
        cost: 18, buildCd: 1.8,
        stats: { maxHp: 120, attackDamage: 15, attackInterval: 1.2, attackRange: 60 },
        visual: { fillColor: { r: 60, g: 160, b: 220 }, strokeColor: { r: 120, g: 220, b: 255 }, radius: 22 },
        tags: ['antiAir'],
    },
    {
        id: 'berserker', name: '狂战士',
        description: '高输出低防御', category: UnitCategory.MELEE,
        cost: 22, buildCd: 1.5,
        stats: { maxHp: 80, attackDamage: 25, attackInterval: 0.8, attackRange: 35 },
        visual: { fillColor: { r: 220, g: 60, b: 60 }, strokeColor: { r: 255, g: 120, b: 100 }, radius: 20 },
        tags: ['highDps'],
    },
    // ===== 远程 =====
    {
        id: 'archer', name: '弓箭手',
        description: '标准远程输出', category: UnitCategory.RANGED,
        cost: 20, buildCd: 2.0,
        stats: { maxHp: 60, attackDamage: 18, attackInterval: 1.5, attackRange: 200 },
        visual: { fillColor: { r: 50, g: 180, b: 80 }, strokeColor: { r: 100, g: 255, b: 130 }, radius: 18 },
        tags: ['ranged'],
    },
    {
        id: 'crossbow', name: '弩手',
        description: '穿透攻击', category: UnitCategory.RANGED,
        cost: 25, buildCd: 2.5,
        stats: { maxHp: 50, attackDamage: 30, attackInterval: 2.0, attackRange: 180 },
        visual: { fillColor: { r: 80, g: 200, b: 60 }, strokeColor: { r: 130, g: 255, b: 100 }, radius: 20 },
        tags: ['ranged', 'pierce'],
    },
    {
        id: 'mage', name: '法师',
        description: '范围魔法攻击', category: UnitCategory.RANGED,
        cost: 30, buildCd: 3.0,
        stats: { maxHp: 40, attackDamage: 35, attackInterval: 2.5, attackRange: 160, splashRadius: 80 },
        visual: { fillColor: { r: 180, g: 60, b: 200 }, strokeColor: { r: 220, g: 120, b: 255 }, radius: 18 },
        tags: ['ranged', 'splash'],
    },
    // ===== 特殊 =====
    {
        id: 'healer', name: '治疗兵',
        description: '持续恢复附近友方单位', category: UnitCategory.SPECIAL,
        cost: 25, buildCd: 3.0,
        // attackRange = 治疗范围，attackInterval = 治疗间隔，healAmount = 单次治疗量
        stats: { maxHp: 80, attackDamage: 0, attackInterval: 1.5, attackRange: 150, healAmount: 12 },
        visual: { fillColor: { r: 60, g: 220, b: 180 }, strokeColor: { r: 120, g: 255, b: 220 }, radius: 20 },
        tags: ['heal'],
    },
    {
        id: 'slow_tower', name: '减速塔',
        description: '降低附近敌人移动速度', category: UnitCategory.SPECIAL,
        cost: 20, buildCd: 2.0,
        // attackRange = 减速范围，slowFactor = 减速倍率
        stats: { maxHp: 60, attackDamage: 0, attackInterval: 99, attackRange: 150, slowFactor: 0.5 },
        visual: { fillColor: { r: 100, g: 200, b: 220 }, strokeColor: { r: 150, g: 240, b: 255 }, radius: 22 },
        tags: ['slow'],
    },
    {
        id: 'miner', name: '矿工',
        description: '每隔一段时间额外产出能量点', category: UnitCategory.SPECIAL,
        cost: 15, buildCd: 4.0,
        stats: { maxHp: 50, attackDamage: 0, attackInterval: 99, attackRange: 0 },
        visual: { fillColor: { r: 200, g: 180, b: 50 }, strokeColor: { r: 255, g: 220, b: 100 }, radius: 16 },
        tags: ['mine'],
    },
    // ===== 终极 =====
    {
        id: 'dreadnought', name: '无畏战甲',
        description: '终极单位，高伤害范围攻击', category: UnitCategory.ULTIMATE,
        cost: 60, buildCd: 8.0,
        stats: { maxHp: 400, attackDamage: 50, attackInterval: 1.0, attackRange: 120 },
        visual: { fillColor: { r: 220, g: 180, b: 30 }, strokeColor: { r: 255, g: 220, b: 80 }, radius: 35 },
        tags: ['highDps', 'tank', 'aoe'],
    },
];

export function getUnitData(id: string): UnitDataDef | undefined {
    return UNIT_TYPES.find(u => u.id === id);
}

export function getUnitsByCategory(category: UnitCategory): UnitDataDef[] {
    return UNIT_TYPES.filter(u => u.category === category);
}

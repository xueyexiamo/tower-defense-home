import { Node } from 'cc';
import { Unit } from './Unit';
import { UnitDataDef } from '../Data/UnitData';

export interface IUnitBehavior {
    /** 每帧更新（矿工产能量、治疗、减速等） */
    onUpdate?(unit: Unit, dt: number): void;
    /** 攻击命中后的回调（溅射等） */
    onAttack?(unit: Unit, target: Node, damage: number): void;
    onSpawn?(unit: Unit): void;
    onDestroy?(unit: Unit): void;
}

/** 近战行为 */
export class MeleeBehavior implements IUnitBehavior {
    // 目标选择由 BattleManager 统一处理，保留扩展位
}

/** 远程行为 */
export class RangedBehavior implements IUnitBehavior {
    // 目标选择由 BattleManager 统一处理，保留扩展位
}

/** 群体伤害行为 */
export class SplashBehavior extends RangedBehavior {
    onAttack(unit: Unit, target: Node, damage: number) {
        const radius = unit.config?.splashRadius ?? 80;
        unit.onSplashAttack?.(target.getPosition(), radius, damage);
    }
}

/** 治疗行为 */
export class HealerBehavior implements IUnitBehavior {
    private healTimer: number = 0;

    onUpdate(unit: Unit, dt: number) {
        const interval = unit.config?.attackInterval ?? 1.5;
        this.healTimer += dt;
        if (this.healTimer < interval) return;
        this.healTimer = 0;

        const range = unit.config?.attackRange ?? 150;
        const amount = unit.config?.healAmount ?? 10;
        unit.onHealNearby?.(range, amount);
    }
}

/** 减速行为 */
export class SlowBehavior implements IUnitBehavior {
    private slowTimer: number = 0;

    onUpdate(unit: Unit, dt: number) {
        this.slowTimer += dt;
        if (this.slowTimer < 0.5) return;
        this.slowTimer = 0;

        const range = unit.config?.attackRange ?? 150;
        const factor = unit.config?.slowFactor ?? 0.5;
        unit.onSlowEnemies?.(range, factor, 1.0);
    }
}

/** 矿工行为 */
export class MinerBehavior implements IUnitBehavior {
    private mineTimer: number = 0;
    private mineInterval: number = 3.0;
    private onMineEnergy: ((amount: number) => void) | null;

    constructor(onMine: (amount: number) => void) {
        this.onMineEnergy = onMine;
    }

    onUpdate(_unit: Unit, dt: number) {
        this.mineTimer += dt;
        if (this.mineTimer >= this.mineInterval) {
            this.mineTimer = 0;
            this.onMineEnergy?.(10);
        }
    }

    onSpawn(_unit: Unit) { this.mineTimer = 0; }
}

export function createBehavior(data: UnitDataDef, onMineEnergy: (amount: number) => void): IUnitBehavior {
    switch (data.id) {
        case 'shield_guard': case 'spearman': case 'berserker': return new MeleeBehavior();
        case 'archer': case 'crossbow': return new RangedBehavior();
        case 'mage': return new SplashBehavior();
        case 'healer': return new HealerBehavior();
        case 'slow_tower': return new SlowBehavior();
        case 'miner': return new MinerBehavior(onMineEnergy);
        default: return new MeleeBehavior();
    }
}

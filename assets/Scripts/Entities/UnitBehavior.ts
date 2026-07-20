import { _decorator, Component, Node, Vec3 } from 'cc';
import { Unit } from './Unit';
import { UnitCategory, UnitDataDef } from '../Data/UnitData';
import { BattleConfig } from '../Data/BattleConfig';

export interface IUnitBehavior {
    updateTarget(unit: Unit, enemies: { node: Node; isBoss: boolean }[], dt: number): { node: Node; isBoss: boolean } | null;
    onAttack?(unit: Unit, target: Node, damage: number): void;
    onSpawn?(unit: Unit): void;
    onDestroy?(unit: Unit): void;
}

/** 近战行为 */
export class MeleeBehavior implements IUnitBehavior {
    updateTarget(unit: Unit, enemies: { node: Node; isBoss: boolean }[], dt: number): { node: Node; isBoss: boolean } | null {
        if (enemies.length === 0) return null;
        const pos = unit.node.getPosition();
        const range = unit.config?.attackRange ?? BattleConfig.UNIT_ATTACK_RANGE;
        let nearest: { node: Node; isBoss: boolean } | null = null;
        let minDist = range;
        for (const e of enemies) {
            const dist = Vec3.distance(pos, e.node.getPosition());
            if (dist <= minDist) { minDist = dist; nearest = e; }
        }
        return nearest;
    }
}

/** 远程行为 */
export class RangedBehavior implements IUnitBehavior {
    updateTarget(unit: Unit, enemies: { node: Node; isBoss: boolean }[], dt: number): { node: Node; isBoss: boolean } | null {
        if (enemies.length === 0) return null;
        const pos = unit.node.getPosition();
        const range = unit.config?.attackRange ?? BattleConfig.UNIT_ATTACK_RANGE;
        if (unit.priorityBoss) {
            const boss = enemies.find(e => e.isBoss);
            if (boss && Vec3.distance(pos, boss.node.getPosition()) <= range) return boss;
        }
        let nearest: { node: Node; isBoss: boolean } | null = null;
        let minDist = range;
        for (const e of enemies) {
            const dist = Vec3.distance(pos, e.node.getPosition());
            if (dist <= minDist) { minDist = dist; nearest = e; }
        }
        return nearest;
    }
}

/** 群体伤害行为 */
export class SplashBehavior extends RangedBehavior {
    onAttack(unit: Unit, target: Node, damage: number) {}
}

/** 治疗行为 */
export class HealerBehavior implements IUnitBehavior {
    updateTarget(_unit: Unit, _enemies: { node: Node; isBoss: boolean }[], _dt: number): { node: Node; isBoss: boolean } | null {
        return null;
    }
    onSpawn(_unit: Unit) {}
    onAttack(_unit: Unit, _target: Node, _damage: number) {}
}

/** 减速行为 */
export class SlowBehavior implements IUnitBehavior {
    updateTarget(_unit: Unit, _enemies: { node: Node; isBoss: boolean }[], _dt: number): { node: Node; isBoss: boolean } | null {
        return null;
    }
    onAttack(_unit: Unit, _target: Node, _damage: number) {}
}

/** 矿工行为 */
export class MinerBehavior implements IUnitBehavior {
    private mineTimer: number = 0;
    private mineInterval: number = 3.0;
    private onMineEnergy: ((amount: number) => void) | null;

    constructor(onMine: (amount: number) => void) {
        this.onMineEnergy = onMine;
    }

    updateTarget(_unit: Unit, _enemies: { node: Node; isBoss: boolean }[], _dt: number): { node: Node; isBoss: boolean } | null {
        return null;
    }

    onSpawn(_unit: Unit) { this.mineTimer = 0; }
    onAttack(_unit: Unit, _target: Node, _damage: number) {}

    updateMine(dt: number) {
        this.mineTimer += dt;
        if (this.mineTimer >= this.mineInterval) {
            this.mineTimer = 0;
            this.onMineEnergy?.(10);
        }
    }
}

export function createBehavior(data: UnitDataDef, onMineEnergy: (amount: number) => void): IUnitBehavior {
    switch (data.id) {
        case 'shield_guard': case 'spearman': case 'berserker': return new MeleeBehavior();
        case 'archer': case 'crossbow': return new RangedBehavior();
        case 'mage': return new SplashBehavior();
        case 'healer': return new HealerBehavior();
        case 'slow_tower': return new SlowBehavior();
        case 'miner': return new MinerBehavior(onMineEnergy);
        case 'dreadnought': return new MeleeBehavior();
        default: return new MeleeBehavior();
    }
}

import { _decorator, Component, Node, Vec3, Graphics, Color } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { UnitVisualConfig } from '../Data/UnitData';
import { IUnitBehavior } from './UnitBehavior';

const { ccclass } = _decorator;

export interface UnitConfig {
    unitId: string;
    unitName: string;
    maxHp: number;
    attackRange: number;
    attackDamage: number;
    attackInterval: number;
    cost: number;
    splashRadius?: number;
    slowFactor?: number;
    healAmount?: number;
    visual: UnitVisualConfig;
}

@ccclass('Unit')
export class Unit extends Component {
    private _config: UnitConfig | null = null;
    private _hp: number = 0;
    private _maxHp: number = 0;
    private _isDead: boolean = false;
    private _attackTimer: number = 0;
    private _priorityBoss: boolean = false;
    private _gridCol: number = -1;
    private _gridRow: number = -1;
    private gfx: Graphics | null = null;
    private hpBar: Graphics | null = null;
    private _behavior: IUnitBehavior | null = null;

    public findTarget: (() => { node: Node; isBoss: boolean } | null) | null = null;
    public onAttackTarget: ((targetNode: Node, damage: number) => void) | null = null;
    public onDestroyed: ((unit: Unit) => void) | null = null;
    /** 溅射攻击：对目标周围 radius 内敌人造成伤害（法师） */
    public onSplashAttack: ((center: Vec3, radius: number, damage: number) => void) | null = null;
    /** 治疗范围内受损友军（治疗兵） */
    public onHealNearby: ((range: number, amount: number) => void) | null = null;
    /** 对范围内敌人施加减速（减速塔） */
    public onSlowEnemies: ((range: number, factor: number, duration: number) => void) | null = null;

    get isDead(): boolean { return this._isDead; }
    get gridCol(): number { return this._gridCol; }
    get gridRow(): number { return this._gridRow; }
    get maxHp(): number { return this._maxHp; }
    get hp(): number { return this._hp; }
    get config(): UnitConfig | null { return this._config; }
    get priorityBoss(): boolean { return this._priorityBoss; }

    setBehavior(behavior: IUnitBehavior) {
        this._behavior = behavior;
        behavior.onSpawn?.(this);
    }

    get behavior(): IUnitBehavior | null { return this._behavior; }

    init(config: UnitConfig, col: number, row: number) {
        this._config = config;
        this._maxHp = config.maxHp;
        this._hp = config.maxHp;
        this._gridCol = col;
        this._gridRow = row;
        this._isDead = false;
        this._attackTimer = 0;

        this.drawVisual();
    }

    private drawVisual() {
        const g = this.getComponent(Graphics) || this.addComponent(Graphics);
        this.gfx = g;
        const v = this._config?.visual;
        g.fillColor = v
            ? new Color(v.fillColor.r, v.fillColor.g, v.fillColor.b)
            : new Color(50, 150, 255);
        g.strokeColor = v
            ? new Color(v.strokeColor.r, v.strokeColor.g, v.strokeColor.b)
            : new Color(150, 200, 255);
        g.lineWidth = 2;
        g.circle(0, 0, v?.radius ?? 25);
        g.fill();
        g.stroke();

        // 血条
        const hb = this.addComponent(Graphics);
        this.hpBar = hb;
        this.updateHpBar();
    }

    private updateHpBar() {
        if (!this.hpBar) return;
        this.hpBar.clear();
        const pct = this._hp / this._maxHp;
        const barWidth = 40;
        if (pct > 0.5) this.hpBar.fillColor = Color.GREEN;
        else if (pct > 0.25) this.hpBar.fillColor = Color.YELLOW;
        else this.hpBar.fillColor = Color.RED;
        this.hpBar.fillRect(-barWidth / 2, 30, barWidth * pct, 5);
    }

    takeDamage(amount: number) {
        if (this._isDead) return;
        this._hp -= amount;
        if (this._hp <= 0) {
            this._hp = 0;
            this._isDead = true;
            this.onDestroyed?.(this);
            this.gfx?.clear();
            this.node.destroy();
            return;
        }
        this.updateHpBar();
    }

    repair(amount: number) {
        if (this._isDead) return;
        this._hp = Math.min(this._hp + amount, this._maxHp);
        this.updateHpBar();
    }

    repairWithEnergy(energyManager: { spend: (amount: number) => boolean; current: number }): boolean {
        const cost = Math.ceil(this._maxHp * BattleConfig.UNIT_REPAIR_COST_RATIO);
        if (energyManager.spend(cost)) {
            const healAmount = Math.ceil(this._maxHp * BattleConfig.UNIT_REPAIR_PCT);
            this.repair(healAmount);
            return true;
        }
        return false;
    }

    togglePriorityBoss(): boolean {
        this._priorityBoss = !this._priorityBoss;
        return this._priorityBoss;
    }

    update(dt: number) {
        if (this._isDead || !this._config) return;

        // 行为策略的每帧更新（矿工产能量、治疗、减速等）
        this._behavior?.onUpdate?.(this, dt);

        this._attackTimer += dt;
        if (this._attackTimer < this._config.attackInterval) return;
        this._attackTimer = 0;

        const target = this.findTarget?.();
        if (!target) return;
        this.onAttackTarget?.(target.node, this._config.attackDamage);
        this._behavior?.onAttack?.(this, target.node, this._config.attackDamage);
    }

    destroySelf(): number {
        this._isDead = true;
        const cost = this._config?.cost ?? BattleConfig.UNIT_COST;
        const refund = Math.ceil(cost * BattleConfig.UNIT_DESTROY_REFUND_RATIO);
        this.onDestroyed?.(this);
        this.gfx?.clear();
        this.node.destroy();
        return refund;
    }
}

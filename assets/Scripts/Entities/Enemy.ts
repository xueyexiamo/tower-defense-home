import { _decorator, Component, Node, Vec3, Graphics, Color } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass } = _decorator;

export interface EnemyConfig {
    hp: number;
    speed: number;
    reward: number;
    isBoss?: boolean;
}

@ccclass('Enemy')
export class Enemy extends Component {
    private _hp: number = 0;
    private _maxHp: number = 0;
    private _speed: number = 0;
    private _reward: number = 0;
    private _waypointIndex: number = 0;
    private _isDead: boolean = false;
    private _isBoss: boolean = false;
    private _slowFactor: number = 1;
    private _slowTimer: number = 0;
    private gfx: Graphics | null = null;

    public onReachedEnd: ((enemy: Enemy) => void) | null = null;
    public onKilled: ((enemy: Enemy) => void) | null = null;

    get isDead(): boolean { return this._isDead; }
    get reward(): number { return this._reward; }
    get isBoss(): boolean { return this._isBoss; }
    get hp(): number { return this._hp; }
    get maxHp(): number { return this._maxHp; }

    /** 施加减速，取最小倍率并刷新持续时间（减速塔） */
    applySlow(factor: number, duration: number) {
        this._slowFactor = Math.min(this._slowFactor, factor);
        this._slowTimer = Math.max(this._slowTimer, duration);
    }

    init(config: EnemyConfig) {
        this._maxHp = config.hp;
        this._hp = config.hp;
        this._speed = config.speed;
        this._reward = config.reward;
        this._waypointIndex = 0;
        this._isDead = false;
        this._isBoss = !!config.isBoss;

        const waypoints = BattleConfig.PATH_WAYPOINTS;
        if (waypoints.length > 0) {
            this.node.setPosition(waypoints[0].x, waypoints[0].y);
        }

        this.drawVisual();
    }

    private drawVisual() {
        const g = this.getComponent(Graphics) || this.addComponent(Graphics);
        this.gfx = g;
        const color = this._isBoss ? new Color(255, 50, 50) : new Color(200, 50, 50);
        g.fillColor = color;
        g.strokeColor = new Color(255, 200, 200);
        g.lineWidth = 2;

        const size = this._isBoss ? 35 : 20;
        g.circle(0, 0, size);
        g.fill();
        g.stroke();
    }

    update(dt: number) {
        if (this._isDead) return;

        const waypoints = BattleConfig.PATH_WAYPOINTS;
        if (this._waypointIndex >= waypoints.length) {
            this.onReachedEnd?.(this);
            this.node.destroy();
            return;
        }

        const target = waypoints[this._waypointIndex];
        const pos = this.node.getPosition();
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this._waypointIndex++;
            return;
        }

        const speed = this._slowTimer > 0 ? this._speed * this._slowFactor : this._speed;
        if (this._slowTimer > 0) {
            this._slowTimer -= dt;
            if (this._slowTimer <= 0) {
                this._slowTimer = 0;
                this._slowFactor = 1;
            }
        }

        const moveDist = speed * dt;
        const ratio = Math.min(moveDist / dist, 1);
        this.node.setPosition(
            pos.x + dx * ratio,
            pos.y + dy * ratio
        );
    }

    takeDamage(amount: number) {
        if (this._isDead) return;
        this._hp -= amount;
        if (this._hp <= 0) {
            this._hp = 0;
            this._isDead = true;
            this.onKilled?.(this);
            this.gfx?.clear();
            this.node.destroy();
        }
    }
}

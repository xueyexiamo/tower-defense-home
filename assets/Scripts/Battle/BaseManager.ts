import { _decorator, Component, Graphics, Color } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass } = _decorator;

@ccclass('BaseManager')
export class BaseManager extends Component {
    private _hp: number = BattleConfig.BASE_MAX_HP;
    private _maxHp: number = BattleConfig.BASE_MAX_HP;
    private _defeated: boolean = false;

    public onHpChanged: ((current: number, max: number) => void) | null = null;
    public onDefeated: (() => void) | null = null;

    get hp(): number { return this._hp; }
    get maxHp(): number { return this._maxHp; }
    get isDefeated(): boolean { return this._defeated; }

    onLoad() {
        this.node.setPosition(BattleConfig.BASE_POSITION.x, BattleConfig.BASE_POSITION.y);

        const g = this.addComponent(Graphics);
        g.fillColor = new Color(50, 200, 100);
        g.strokeColor = new Color(100, 255, 150);
        g.lineWidth = 3;
        g.moveTo(-30, -30);
        g.lineTo(30, -30);
        g.lineTo(30, 30);
        g.lineTo(-30, 30);
        g.close();
        g.fill();
        g.stroke();
    }

    takeDamage(amount: number) {
        if (this._defeated) return;
        this._hp -= amount;
        if (this._hp <= 0) {
            this._hp = 0;
            this._defeated = true;
            this.onHpChanged?.(this._hp, this._maxHp);
            this.onDefeated?.();
            return;
        }
        this.onHpChanged?.(this._hp, this._maxHp);
    }

    reset() {
        this._hp = this._maxHp;
        this._defeated = false;
        this.onHpChanged?.(this._hp, this._maxHp);
    }
}

import { _decorator, Component } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass } = _decorator;

@ccclass('EnergyManager')
export class EnergyManager extends Component {
    private _current: number = 0;
    private _maxEnergy: number = 0;
    private _listeners: Array<(current: number) => void> = [];

    onLoad() {
        this._current = BattleConfig.INITIAL_ENERGY;
    }

    get current(): number {
        return this._current;
    }

    addListener(callback: (current: number) => void) {
        this._listeners.push(callback);
    }

    add(amount: number) {
        this._current += amount;
        if (this._maxEnergy > 0 && this._current > this._maxEnergy) {
            this._current = this._maxEnergy;
        }
        this.notifyChanged();
    }

    spend(amount: number): boolean {
        if (this._current >= amount) {
            this._current -= amount;
            this.notifyChanged();
            return true;
        }
        return false;
    }

    reset() {
        this._current = BattleConfig.INITIAL_ENERGY;
        this.notifyChanged();
    }

    private notifyChanged() {
        for (const cb of this._listeners) {
            cb(this._current);
        }
    }
}

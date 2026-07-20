import { _decorator, Component, Node, Vec3 } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { getUnitData } from '../Data/UnitData';
import { createBehavior } from '../Entities/UnitBehavior';
import { GridManager } from './GridManager';
import { EnergyManager } from './EnergyManager';
import { WaveManager } from './WaveManager';
import { BaseManager } from './BaseManager';
import { Unit, UnitConfig } from '../Entities/Unit';
import { Enemy, EnemyConfig } from '../Entities/Enemy';

const { ccclass } = _decorator;

export enum BattleState {
    WAITING,
    PLAYING,
    VICTORY,
    DEFEAT,
}

@ccclass('BattleManager')
export class BattleManager extends Component {
    private _state: BattleState = BattleState.WAITING;
    private _units: Unit[] = [];

    public gridManager: GridManager | null = null;
    public energyManager: EnergyManager | null = null;
    public waveManager: WaveManager | null = null;
    public baseManager: BaseManager | null = null;

    private _enemyNodes: { node: Node; isBoss: boolean }[] = [];

    public onStateChanged: ((state: BattleState) => void) | null = null;
    public onUnitsChanged: ((units: Unit[]) => void) | null = null;

    get state(): BattleState { return this._state; }

    onLoad() {
        this._state = BattleState.WAITING;
    }

    startBattle() {
        this._state = BattleState.PLAYING;
        this.onStateChanged?.(BattleState.PLAYING);

        this.waveManager?.startWithDelay();

        if (this.waveManager) {
            this.waveManager.onSpawnEnemy = (config) => this.spawnEnemy(config);
            this.waveManager.onAllWavesCleared = () => this.onVictory();
        }

        if (this.baseManager) {
            this.baseManager.onDefeated = () => this.onDefeat();
        }
    }

    private spawnEnemy(config: EnemyConfig) {
        const node = new Node('Enemy');
        this.node.addChild(node);

        const enemy = node.addComponent(Enemy);
        enemy.init(config);

        this._enemyNodes.push({ node, isBoss: !!config.isBoss });
        this.waveManager?.registerEnemy(enemy);

        enemy.onKilled = (e) => {
            this.removeEnemyRef(node);
            if (this.energyManager) {
                this.energyManager.add(e.reward);
            }
        };
        enemy.onReachedEnd = (e) => {
            this.removeEnemyRef(node);
            if (this.baseManager) {
                this.baseManager.takeDamage(BattleConfig.ENEMY_DAMAGE);
            }
        };
    }

    private removeEnemyRef(node: Node) {
        const idx = this._enemyNodes.findIndex(e => e.node === node);
        if (idx >= 0) this._enemyNodes.splice(idx, 1);
    }

    /** 获取敌人列表，供 Unit behavior 使用 */
    getEnemyNodes(): { node: Node; isBoss: boolean }[] {
        return this._enemyNodes;
    }

    buildUnit(col: number, row: number, unitType: string = 'shield_guard'): boolean {
        if (!this.gridManager || !this.energyManager) return false;
        if (this._state !== BattleState.PLAYING) return false;

        const unitData = getUnitData(unitType);
        if (!unitData) {
            console.warn(`[BattleManager] Unknown unit type: ${unitType}`);
            return false;
        }

        if (this.gridManager.getCell(col, row)?.occupied) return false;
        if (!this.energyManager.spend(unitData.cost)) return false;

        const node = new Node('Unit');
        this.node.addChild(node);

        const pos = this.gridManager.getCellWorldPos(col, row);
        if (pos) node.setPosition(pos);

        const unit = node.addComponent(Unit);
        unit.init({
            unitId: unitData.id,
            unitName: unitData.name,
            maxHp: unitData.stats.maxHp,
            attackRange: unitData.stats.attackRange,
            attackDamage: unitData.stats.attackDamage,
            attackInterval: unitData.stats.attackInterval,
        }, col, row);

        // 注入行为策略
        const behavior = createBehavior(unitData, (amount: number) => {
            if (this.energyManager) this.energyManager.add(amount);
        });
        unit.setBehavior(behavior);

        // 矿工：每帧更新能量点产出
        unit.behaviorUpdateExtra = (dt: number) => {
            const miner = (unit.behavior as any);
            if (miner && typeof miner.updateMine === 'function') {
                miner.updateMine(dt);
            }
        };

        this.gridManager.placeUnit(col, row, unitData.id);

        unit.findTarget = () => this.findNearestEnemy(node.getPosition(), unit.priorityBoss);
        unit.onAttackTarget = (targetNode, damage) => this.damageEnemy(targetNode, damage);
        unit.onDestroyed = (u) => {
            const idx = this._units.indexOf(u);
            if (idx >= 0) this._units.splice(idx, 1);
            if (this.gridManager && u.gridCol >= 0) {
                this.gridManager.removeUnit(u.gridCol, u.gridRow);
            }
            this.onUnitsChanged?.(this._units);
        };

        this._units.push(unit);
        this.onUnitsChanged?.(this._units);
        return true;
    }

    private findNearestEnemy(fromPos: Vec3, priorityBoss: boolean): { node: Node; isBoss: boolean } | null {
        const enemies = priorityBoss
            ? this._enemyNodes.filter(e => e.isBoss)
            : this._enemyNodes;

        if (enemies.length === 0) return null;

        let nearest = enemies[0];
        let minDist = Vec3.distance(fromPos, nearest.node.getPosition());

        for (let i = 1; i < enemies.length; i++) {
            const dist = Vec3.distance(fromPos, enemies[i].node.getPosition());
            if (dist < minDist) {
                minDist = dist;
                nearest = enemies[i];
            }
        }
        return nearest;
    }

    private damageEnemy(targetNode: Node, damage: number) {
        const enemy = targetNode.getComponent(Enemy);
        if (enemy) {
            enemy.takeDamage(damage);
        }
    }

    repairUnit(unit: Unit): boolean {
        if (!this.energyManager) return false;
        return unit.repairWithEnergy(this.energyManager);
    }

    destroyUnit(unit: Unit): number {
        const refund = unit.destroySelf();
        if (this.energyManager) {
            this.energyManager.add(refund);
        }
        return refund;
    }

    getUnits(): Unit[] {
        return this._units;
    }

    private onVictory() {
        if (this._state !== BattleState.PLAYING) return;
        this._state = BattleState.VICTORY;
        this.onStateChanged?.(BattleState.VICTORY);
    }

    private onDefeat() {
        if (this._state !== BattleState.PLAYING) return;
        this._state = BattleState.DEFEAT;
        this.onStateChanged?.(BattleState.DEFEAT);
    }

    reset() {
        for (const { node } of this._enemyNodes) {
            node.destroy();
        }
        this._enemyNodes = [];

        for (const unit of this._units) {
            unit.node.destroy();
        }
        this._units = [];

        this.energyManager?.reset();
        this.baseManager?.reset();

        this._state = BattleState.WAITING;
        this.onStateChanged?.(BattleState.WAITING);
        this.onUnitsChanged?.([]);
    }
}

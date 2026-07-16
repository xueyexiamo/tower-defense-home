import { _decorator, Component } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { Enemy, EnemyConfig } from '../Entities/Enemy';

const { ccclass } = _decorator;

@ccclass('WaveManager')
export class WaveManager extends Component {
    private _currentWaveIndex: number = -1;
    private _totalWaves: number = 0;
    private _spawning: boolean = false;
    private _spawnedCount: number = 0;
    private _spawnTimer: number = 0;
    private _postWaveTimer: number = 0;
    private _waitingPostWave: boolean = false;
    private _activeEnemies: Enemy[] = [];
    private _allCleared: boolean = false;

    public onSpawnEnemy: ((config: EnemyConfig) => void) | null = null;
    public onWaveChanged: ((waveIndex: number, totalWaves: number) => void) | null = null;
    public onAllWavesCleared: (() => void) | null = null;

    get currentWave(): number { return this._currentWaveIndex + 1; }
    get totalWaves(): number { return this._totalWaves; }
    get activeEnemyCount(): number { return this._activeEnemies.length; }
    get allWavesCleared(): boolean { return this._allCleared; }
    get isSpawning(): boolean { return this._spawning; }

    onLoad() {
        this._totalWaves = BattleConfig.WAVE_CONFIGS.length;
    }

    startWithDelay(delay: number = BattleConfig.ENEMY_START_WAVE_DELAY) {
        this.scheduleOnce(() => {
            this.startNextWave();
        }, delay);
    }

    registerEnemy(enemy: Enemy) {
        this._activeEnemies.push(enemy);
        enemy.onKilled = (e) => this.onEnemyRemoved(e);
        enemy.onReachedEnd = (e) => this.onEnemyRemoved(e);
    }

    private onEnemyRemoved(enemy: Enemy) {
        const idx = this._activeEnemies.indexOf(enemy);
        if (idx >= 0) this._activeEnemies.splice(idx, 1);
        this.checkWaveState();
    }

    private startNextWave() {
        if (this._currentWaveIndex + 1 >= this._totalWaves) {
            this._allCleared = true;
            this.onAllWavesCleared?.();
            return;
        }

        this._currentWaveIndex++;
        this._spawning = true;
        this._spawnedCount = 0;
        this._spawnTimer = 0;
        this._waitingPostWave = false;
        this.onWaveChanged?.(this._currentWaveIndex, this._totalWaves);
    }

    update(dt: number) {
        if (this._allCleared || !this._spawning) return;

        if (this._waitingPostWave) {
            this._postWaveTimer -= dt;
            if (this._postWaveTimer <= 0 && this._activeEnemies.length === 0) {
                this.startNextWave();
            }
            return;
        }

        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0) {
            this.spawnOne();
        }
    }

    private spawnOne() {
        const cfg = BattleConfig.WAVE_CONFIGS[this._currentWaveIndex];
        if (this._spawnedCount >= cfg.enemyCount) {
            this._spawning = false;
            this._waitingPostWave = true;
            this._postWaveTimer = BattleConfig.POST_WAVE_DELAY;
            return;
        }

        const isBoss = !!cfg.isBossWave && this._spawnedCount === 0;
        this.onSpawnEnemy?.({
            hp: cfg.enemyHP,
            speed: cfg.enemySpeed,
            reward: cfg.reward,
            isBoss,
        });

        this._spawnedCount++;
        this._spawnTimer = cfg.spawnInterval;
    }

    private checkWaveState() {
        if (this._activeEnemies.length === 0 && this._waitingPostWave) {
            this.startNextWave();
        }
    }

    requestNextWave() {
        if (this._spawning || this._waitingPostWave) return;
        if (this._allCleared) return;
        this.startNextWave();
    }
}

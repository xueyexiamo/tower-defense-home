# 核心战斗 Demo 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个可在 Cocos Creator 中运行的塔防战斗 Demo，覆盖单地图的核心战斗循环：建造兵种、击杀敌人、能量点循环、胜负判定。

**Architecture:** 使用 Cocos Creator 3.x (TypeScript)。所有战斗实体在运行时通过脚本创建，不需要手动编辑场景文件。战斗管理器是核心循环调度器，GridManager 管理网格，Unit/Enemy/Base 是实体组件。

**Tech Stack:** Cocos Creator 3.x, TypeScript, Cocos Creator asset pipeline

## Global Constraints

- 所有文件名使用 PascalCase（类名）或全小写 kebab-case（配置文件）
- 代码文件放在 `assets/Scripts/` 下，按功能子目录组织
- 不依赖第三方 npm 包，仅使用 Cocos Creator 内置 API
- 场景文件（`.scene`）手动创建为 JSON，所有的游戏逻辑在脚本中初始化
- 先不引入美术资源，用 Cocos Creator 内置的 `Graphics` 组件画基本形状

---

## Task 1: 项目脚手架

**Files:**
- Create: `project.json`
- Create: `package.json`
- Create: `.gitignore`
- Create: `assets/Scripts/Bootstrap.ts`

**Interfaces:**
- Consumes: 无
- Produces: 可被 Cocos Creator 打开并运行的空项目，启动时进入战斗场景

- [ ] **Step 1: 创建项目配置文件**

创建 `project.json`（Cocos Creator 3.x 项目配置）：

```json
{
  "version": "3.8.0",
  "engine": "cocos-creator-lib",
  "platform": "mini-game",
  "packages": ["cocos"]
}
```

创建 `package.json`：

```json
{
  "name": "tower-defense-home",
  "version": "0.1.0",
  "private": true,
  "description": "塔防家园 - 宇宙题材塔防游戏 Cocos Creator 项目"
}
```

创建 `.gitignore`：

```
library/
local/
temp/
build/
*.meta
.DS_Store
```

- [ ] **Step 2: 创建引导脚本和场景**

创建一个最小场景文件 `assets/Scenes/Battle.scene`，作为 Cocos Creator 场景 JSON。同时创建引导脚本 Bootstrap.ts：

```typescript
import { _decorator, Component, Node, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
    onLoad() {
        // 场景加载完成，后续由各 Manager 初始化
        console.log('[Bootstrap] Battle scene loaded');
    }

    start() {
        console.log('[Bootstrap] Starting battle...');
    }
}
```

场景文件 `assets/Scenes/Battle.scene`：

```json
{
  "version": "3.8.0",
  "canvas": {
    "width": 720,
    "height": 1280
  },
  "nodeTree": [
    {
      "name": "Canvas",
      "parent": null,
      "children": ["BattleRoot"],
      "position": {"x": 0, "y": 0},
      "scale": {"x": 1, "y": 1}
    },
    {
      "name": "BattleRoot",
      "parent": "Canvas",
      "children": [],
      "position": {"x": 0, "y": 0},
      "components": [
        {
          "type": "cc.Script",
          "script": "Bootstrap"
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: 项目脚手架 - Cocos Creator 3.x 项目初始化 + 引导脚本"
```

---

## Task 2: 战斗配置与常量定义

**Files:**
- Create: `assets/Scripts/Data/BattleConfig.ts`

**Interfaces:**
- Consumes: 无
- Produces: `BattleConfig` 全局常量对象，所有战斗相关数字配置集中于此

- [ ] **Step 1: 创建配置类型**

```typescript
/**
 * 战斗全局配置常量
 * 所有数字配置集中在此文件，方便后期调整
 */

export const BattleConfig = {
    // === 网格 ===
    GRID_COLS: 8,
    GRID_ROWS: 6,
    GRID_CELL_SIZE: 80,           // 每个网格像素尺寸
    GRID_OFFSET_X: 40,            // 网格区域左上角 X
    GRID_OFFSET_Y: 500,           // 网格区域左上角 Y

    // === 基地 ===
    BASE_MAX_HP: 100,
    BASE_POSITION: { x: 360, y: 150 },

    // === 能量点 ===
    INITIAL_ENERGY: 50,
    ENERGY_DROP_PER_KILL: 5,

    // === 兵种 ===
    UNIT_COST: 20,                // 建造消耗能量点
    UNIT_ATTACK_RANGE: 150,
    UNIT_ATTACK_DAMAGE: 10,
    UNIT_ATTACK_INTERVAL: 1.0,    // 攻击间隔（秒）
    UNIT_MAX_HP: 100,
    UNIT_REPAIR_COST_RATIO: 0.3,  // 修复消耗 = 最大血量 * 0.3
    UNIT_REPAIR_PCT: 0.3,         // 每次修复恢复 30% 最大血量
    UNIT_DESTROY_REFUND_RATIO: 0.5, // 销毁返还 50% 能量点
    UNIT_BUILD_CD: 1.0,           // 建造冷却（秒）

    // === 敌人 ===
    ENEMY_MAX_HP: 50,
    ENEMY_SPEED: 60,              // 移动速度（像素/秒）
    ENEMY_DAMAGE: 5,              // 对基地伤害
    ENEMY_REWARD_ENERGY: 5,       // 击杀后掉落能量点
    ENEMY_SPAWN_INTERVAL: 2.0,    // 生成间隔（秒）
    ENEMY_START_WAVE_DELAY: 3.0,  // 开局延迟（秒）

    // === 波次 ===
    WAVE_CONFIGS: [
        // 第一波：5 个普通敌人
        { enemyCount: 5, enemyHP: 50, enemySpeed: 60, spawnInterval: 1.5, reward: 5 },
        // 第二波：8 个普通敌人
        { enemyCount: 8, enemyHP: 60, enemySpeed: 65, spawnInterval: 1.2, reward: 5 },
        // 第三波：10 个混合敌人
        { enemyCount: 10, enemyHP: 80, enemySpeed: 70, spawnInterval: 1.0, reward: 6 },
        // 第四波：1 个 Boss + 6 个小兵
        { enemyCount: 7, enemyHP: 200, enemySpeed: 40, spawnInterval: 2.0, reward: 20, isBossWave: true },
    ],

    // === 路径 ===
    // 路径由一系列路点坐标组成，敌人沿路点前进
    PATH_WAYPOINTS: [
        { x: 40, y: 1100 },
        { x: 680, y: 1100 },
        { x: 680, y: 850 },
        { x: 40, y: 850 },
        { x: 40, y: 600 },
        { x: 680, y: 600 },
        { x: 680, y: 350 },
        { x: 360, y: 350 },
        { x: 360, y: 150 },
    ],

    // === 战斗 ===
    POST_WAVE_DELAY: 2.0,         // 波次结束后到下一波开始的延迟
    VICTORY_DELAY: 1.5,           // 胜利后延迟
    DEFEAT_DELAY: 1.5,            // 失败后延迟
};
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Data/BattleConfig.ts
git commit -m "feat: 战斗配置常量定义"
```

---

## Task 3: 网格系统

**Files:**
- Create: `assets/Scripts/Battle/GridManager.ts`

**Interfaces:**
- Consumes: `BattleConfig.GRID_*` 常量
- Produces: `GridManager` 类，提供 `isCellOccupied()`, `placeUnit()`, `removeUnit()`, `getCellWorldPosition()`, `getOccupiedCells()` 方法

- [ ] **Step 1: 创建 GridManager**

```typescript
import { _decorator, Component, Node, Vec3, UITransform, Graphics, Color } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass, property } = _decorator;

export interface GridCell {
    col: number;
    row: number;
    worldPos: Vec3;
    occupied: boolean;
    unitId: string | null;
}

@ccclass('GridManager')
export class GridManager extends Component {
    private grid: GridCell[][] = [];
    private gridRoot: Node;

    onLoad() {
        this.gridRoot = new Node('GridRoot');
        this.node.addChild(this.gridRoot);
        this.initGrid();
        this.drawGrid();
    }

    private initGrid() {
        for (let row = 0; row < BattleConfig.GRID_ROWS; row++) {
            this.grid[row] = [];
            for (let col = 0; col < BattleConfig.GRID_COLS; col++) {
                const x = BattleConfig.GRID_OFFSET_X + col * BattleConfig.GRID_CELL_SIZE + BattleConfig.GRID_CELL_SIZE / 2;
                const y = BattleConfig.GRID_OFFSET_Y - row * BattleConfig.GRID_CELL_SIZE - BattleConfig.GRID_CELL_SIZE / 2;
                this.grid[row][col] = {
                    col, row,
                    worldPos: new Vec3(x, y, 0),
                    occupied: false,
                    unitId: null,
                };
            }
        }
    }

    private drawGrid() {
        const g = this.gridRoot.addComponent(Graphics);
        g.strokeColor = new Color(100, 180, 255, 150);
        g.lineWidth = 2;

        for (let row = 0; row < BattleConfig.GRID_ROWS; row++) {
            for (let col = 0; col < BattleConfig.GRID_COLS; col++) {
                const cell = this.grid[row][col];
                const x = cell.worldPos.x - BattleConfig.GRID_CELL_SIZE / 2;
                const y = cell.worldPos.y - BattleConfig.GRID_CELL_SIZE / 2;
                g.rect(x, y, BattleConfig.GRID_CELL_SIZE, BattleConfig.GRID_CELL_SIZE);
            }
        }
        g.stroke();
    }

    getCell(col: number, row: number): GridCell | null {
        if (row < 0 || row >= BattleConfig.GRID_ROWS || col < 0 || col >= BattleConfig.GRID_COLS) {
            return null;
        }
        return this.grid[row][col];
    }

    getCellAtPos(worldPos: Vec3): GridCell | null {
        for (let row = 0; row < BattleConfig.GRID_ROWS; row++) {
            for (let col = 0; col < BattleConfig.GRID_COLS; col++) {
                const cell = this.grid[row][col];
                const half = BattleConfig.GRID_CELL_SIZE / 2;
                const dx = Math.abs(worldPos.x - cell.worldPos.x);
                const dy = Math.abs(worldPos.y - cell.worldPos.y);
                if (dx < half && dy < half) {
                    return cell;
                }
            }
        }
        return null;
    }

    isCellOccupied(col: number, row: number): boolean {
        const cell = this.getCell(col, row);
        return cell ? cell.occupied : true; // 无效格子视为已占用
    }

    placeUnit(col: number, row: number, unitId: string): boolean {
        const cell = this.getCell(col, row);
        if (!cell || cell.occupied) return false;
        cell.occupied = true;
        cell.unitId = unitId;
        return true;
    }

    removeUnit(col: number, row: number) {
        const cell = this.getCell(col, row);
        if (cell) {
            cell.occupied = false;
            cell.unitId = null;
        }
    }

    getCellWorldPos(col: number, row: number): Vec3 | null {
        const cell = this.getCell(col, row);
        return cell ? cell.worldPos.clone() : null;
    }

    /** 获取所有未被占用的格子 */
    getFreeCells(): GridCell[] {
        const free: GridCell[] = [];
        for (let row = 0; row < BattleConfig.GRID_ROWS; row++) {
            for (let col = 0; col < BattleConfig.GRID_COLS; col++) {
                if (!this.grid[row][col].occupied) {
                    free.push(this.grid[row][col]);
                }
            }
        }
        return free;
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Battle/GridManager.ts
git commit -m "feat: 网格系统 - GridManager"
```

---

## Task 4: 能量点管理器

**Files:**
- Create: `assets/Scripts/Battle/EnergyManager.ts`

**Interfaces:**
- Consumes: `BattleConfig.INITIAL_ENERGY`
- Produces: `EnergyManager` 单例，提供 `current`, `add(amount)`, `spend(amount): boolean`, `energyChanged` 事件

- [ ] **Step 1: 创建 EnergyManager**

```typescript
import { _decorator, Component } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass } = _decorator;

@ccclass('EnergyManager')
export class EnergyManager extends Component {
    private _current: number = 0;
    private _maxEnergy: number = 0; // 0 = 无上限

    /** 能量点变化回调 */
    public onEnergyChanged: ((current: number) => void) | null = null;

    onLoad() {
        this._current = BattleConfig.INITIAL_ENERGY;
    }

    get current(): number {
        return this._current;
    }

    /** 获取能量点 */
    add(amount: number) {
        this._current += amount;
        if (this._maxEnergy > 0 && this._current > this._maxEnergy) {
            this._current = this._maxEnergy;
        }
        this.notifyChanged();
    }

    /** 消耗能量点，成功返回 true */
    spend(amount: number): boolean {
        if (this._current >= amount) {
            this._current -= amount;
            this.notifyChanged();
            return true;
        }
        return false;
    }

    /** 获取无上限 */
    get isUnlimited(): boolean {
        return this._maxEnergy <= 0;
    }

    reset() {
        this._current = BattleConfig.INITIAL_ENERGY;
        this.notifyChanged();
    }

    private notifyChanged() {
        if (this.onEnergyChanged) {
            this.onEnergyChanged(this._current);
        }
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Battle/EnergyManager.ts
git commit -m "feat: 能量点系统 - EnergyManager"
```

---

## Task 5: 敌人实体

**Files:**
- Create: `assets/Scripts/Entities/Enemy.ts`

**Interfaces:**
- Consumes: `BattleConfig.ENEMY_*`, `BattleConfig.PATH_WAYPOINTS`
- Produces: `Enemy` 组件类，提供 `init(config)`, `takeDamage(amount)`, `isDead` 属性

- [ ] **Step 1: 创建 Enemy 组件

```typescript
import { _decorator, Component, Node, Vec3, UITransform, Graphics, Color, math } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass, property } = _decorator;

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
    private gfx: Graphics | null = null;

    /** 到达终点回调 (对基地造成伤害) */
    public onReachedEnd: ((enemy: Enemy) => void) | null = null;
    /** 被击杀回调 (掉落能量点) */
    public onKilled: ((enemy: Enemy) => void) | null = null;

    get isDead(): boolean { return this._isDead; }
    get reward(): number { return this._reward; }
    get isBoss(): boolean { return this._isBoss; }
    get hp(): number { return this._hp; }
    get maxHp(): number { return this._maxHp; }

    init(config: EnemyConfig) {
        this._maxHp = config.hp;
        this._hp = config.hp;
        this._speed = config.speed;
        this._reward = config.reward;
        this._waypointIndex = 0;
        this._isDead = false;
        this._isBoss = !!config.isBoss;

        // 设置位置到第一个路点
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
            // 到达终点
            this.onReachedEnd?.(this);
            this.destroyEnemy();
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

        const moveDist = this._speed * dt;
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
            this.destroyEnemy();
        }
    }

    private destroyEnemy() {
        this.gfx?.clear();
        this.node.destroy();
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Entities/Enemy.ts
git commit -m "feat: 敌人实体 - Enemy 组件"
```

---

## Task 6: 兵种实体（我方单位）

**Files:**
- Create: `assets/Scripts/Entities/Unit.ts`

**Interfaces:**
- Consumes: `BattleConfig.UNIT_*`, `EnergyManager`
- Produces: `Unit` 组件类，提供 `init(config)`, `takeDamage(amount)`, `isDead`, `repair()`, `destroySelf()` 方法

- [ ] **Step 1: 创建 Unit 组件

```typescript
import { _decorator, Component, Node, Vec3, Graphics, Color, math } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass, property } = _decorator;

export interface UnitConfig {
    unitId: string;
    unitName: string;
    maxHp: number;
    attackRange: number;
    attackDamage: number;
    attackInterval: number;
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

    /** 找到最近的敌人回调 */
    public findTarget: (() => { node: Node; isBoss: boolean } | null) | null = null;
    /** 攻击敌人回调 */
    public onAttackTarget: ((targetNode: Node, damage: number) => void) | null = null;
    /** 单位被销毁回调 */
    public onDestroyed: ((unit: Unit) => void) | null = null;

    get isDead(): boolean { return this._isDead; }
    get gridCol(): number { return this._gridCol; }
    get gridRow(): number { return this._gridRow; }
    get maxHp(): number { return this._maxHp; }
    get hp(): number { return this._hp; }
    get config(): UnitConfig | null { return this._config; }

    init(config: UnitConfig, col: number, row: number) {
        this._config = config;
        this._maxHp = config.maxHp;
        this._hp = config.maxHp;
        this._gridCol = col;
        this._gridRow = row;
        this._isDead = false;
        this._attackTimer = 0;

        this.drawVisual();
        this.drawHpBar();
    }

    private drawVisual() {
        const g = this.getComponent(Graphics) || this.addComponent(Graphics);
        this.gfx = g;
        g.fillColor = new Color(50, 150, 255);
        g.strokeColor = new Color(150, 200, 255);
        g.lineWidth = 2;
        g.circle(0, 0, 25);
        g.fill();
        g.stroke();
    }

    private drawHpBar() {
        const hb = this.node.getChildByName('HpBar')?.getComponent(Graphics)
            || this.node.addComponent(Graphics);
        this.hpBar = hb;
    }

    private updateHpBar() {
        if (!this.hpBar) return;
        this.hpBar.clear();
        const pct = this._hp / this._maxHp;
        const barWidth = 40;
        this.hpBar.fillColor = pct > 0.5 ? Color.GREEN : (pct > 0.25 ? Color.YELLOW : Color.RED);
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

    /** 消耗能量点修复 */
    repairWithEnergy(energyManager: { spend: (amount: number) => boolean }): boolean {
        const cost = Math.ceil(this._maxHp * BattleConfig.UNIT_REPAIR_COST_RATIO);
        if (energyManager.spend(cost)) {
            const healAmount = Math.ceil(this._maxHp * BattleConfig.UNIT_REPAIR_PCT);
            this.repair(healAmount);
            return true;
        }
        return false;
    }

    togglePriorityBoss() {
        this._priorityBoss = !this._priorityBoss;
        return this._priorityBoss;
    }

    get priorityBoss(): boolean {
        return this._priorityBoss;
    }

    update(dt: number) {
        if (this._isDead || !this._config) return;

        this._attackTimer += dt;

        if (this._attackTimer >= this._config.attackInterval) {
            this._attackTimer = 0;
            const target = this.findTarget?.();
            if (target) {
                this.onAttackTarget?.(target.node, this._config.attackDamage);
            }
        }
    }

    /** 销毁单位（玩家主动操作），返还 50% 能量点 */
    destroySelf(): number {
        this._isDead = true;
        const refund = Math.ceil(BattleConfig.UNIT_COST * BattleConfig.UNIT_DESTROY_REFUND_RATIO);
        this.onDestroyed?.(this);
        this.gfx?.clear();
        this.node.destroy();
        return refund;
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Entities/Unit.ts
git commit -m "feat: 兵种实体 - Unit 组件"
```

---

## Task 7: 波次管理器

**Files:**
- Create: `assets/Scripts/Battle/WaveManager.ts`

**Interfaces:**
- Consumes: `BattleConfig.WAVE_CONFIGS`, `BattleConfig.ENEMY_*`
- Produces: `WaveManager` 类，提供 `currentWave`, `totalWaves`, `allWavesCleared` 属性，`onWaveCleared`, `onAllWavesCleared` 回调

- [ ] **Step 1: 创建 WaveManager

```typescript
import { _decorator, Component, Node, instantiate, Prefab } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { Enemy, EnemyConfig } from '../Entities/Enemy';

const { ccclass } = _decorator;

@ccclass('WaveManager')
export class WaveManager extends Component {
    private _currentWave: number = 0;
    private _totalWaves: number = 0;
    private _spawning: boolean = false;
    private _spawnedCount: number = 0;
    private _spawnTimer: number = 0;
    private _waveDelayTimer: number = 0;
    private _activeEnemies: Enemy[] = [];
    private _allCleared: boolean = false;

    /** 当前波次配置 */
    private _currentWaveConfig: typeof BattleConfig.WAVE_CONFIGS[0] | null = null;
    /** 敌人预制体 */
    private enemyPrefab: Prefab | null = null;

    /** 生成敌人回调 */
    public onSpawnEnemy: ((config: EnemyConfig) => void) | null = null;
    /** 波次清理完成回调 */
    public onWaveCleared: ((waveIndex: number) => void) | null = null;
    /** 所有波次完成回调 */
    public onAllWavesCleared: (() => void) | null = null;

    get currentWave(): number { return this._currentWave; }
    get totalWaves(): number { return this._totalWaves; }
    get activeEnemyCount(): number { return this._activeEnemies.length; }
    get allWavesCleared(): boolean { return this._allCleared; }

    onLoad() {
        this._totalWaves = BattleConfig.WAVE_CONFIGS.length;
    }

    startWaves() {
        this._waveDelayTimer = BattleConfig.ENEMY_START_WAVE_DELAY;
    }

    /** 注册敌人进入管理 */
    registerEnemy(enemy: Enemy) {
        this._activeEnemies.push(enemy);
        enemy.onKilled = (e) => {
            const idx = this._activeEnemies.indexOf(e);
            if (idx >= 0) this._activeEnemies.splice(idx, 1);
            this.checkWaveCleared();
        };
        enemy.onReachedEnd = (e) => {
            const idx = this._activeEnemies.indexOf(e);
            if (idx >= 0) this._activeEnemies.splice(idx, 1);
            this.checkWaveCleared();
        };
    }

    private checkWaveCleared() {
        if (!this._spawning && this._activeEnemies.length === 0) {
            if (this._currentWave >= this._totalWaves) {
                this._allCleared = true;
                this.onAllWavesCleared?.();
            } else {
                this.onWaveCleared?.(this._currentWave);
            }
        }
    }

    update(dt: number) {
        if (this._allCleared) return;
        if (this._currentWave >= this._totalWaves) return;

        // 波次间延迟
        if (this._currentWave === 0 && !this._spawning) {
            this._waveDelayTimer -= dt;
            if (this._waveDelayTimer <= 0) {
                this.startNextWave();
            }
            return;
        }

        if (!this._spawning) return;

        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0) {
            this.spawnEnemy();
        }
    }

    private startNextWave() {
        this._currentWaveConfig = BattleConfig.WAVE_CONFIGS[this._currentWave - 1];
        // Wait, currentWave starts at 0, so the config index is currentWave
        // Actually let me rethink this
        this._currentWaveConfig = BattleConfig.WAVE_CONFIGS[this._currentWave];
        this._spawning = true;
        this._spawnedCount = 0;
        this._spawnTimer = 0;
    }

    private spawnEnemy() {
        if (!this._currentWaveConfig) return;
        if (this._spawnedCount >= this._currentWaveConfig.enemyCount) {
            this._spawning = false;
            this.checkWaveCleared();
            return;
        }

        const cfg = this._currentWaveConfig;
        const isBoss = cfg.isBossWave && this._spawnedCount === 0; // Boss 在首位置出现

        this.onSpawnEnemy?.({
            hp: cfg.enemyHP,
            speed: cfg.enemySpeed,
            reward: cfg.reward,
            isBoss,
        });

        this._spawnedCount++;
        this._spawnTimer = cfg.spawnInterval;
    }

    /** 下一波按钮被点击时调用 */
    requestNextWave() {
        if (this._spawning) return;
        if (this._currentWave >= this._totalWaves) return;
        this._currentWave++;
        this.startNextWave();
    }
}
```

Wait, I have a bug in the wave index logic. Let me fix it.

- [ ] **Step 1 (revised): 创建修正后的 WaveManager

```typescript
import { _decorator, Component, Node, instantiate, Prefab } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { Enemy, EnemyConfig } from '../Entities/Enemy';

const { ccclass } = _decorator;

/**
 * 波次管理器
 * 管理敌人的分批生成。每波敌人按配置间隔自动生成，
 * 当前波次所有敌人生成完毕并且全部死亡/到达终点后，进入下一波。
 */
@ccclass('WaveManager')
export class WaveManager extends Component {
    private _currentWaveIndex: number = -1;    // -1 = 尚未开始
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

    /** 开始第一波前的倒计时 */
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
        this._currentWaveIndex++;
        if (this._currentWaveIndex >= this._totalWaves) {
            this._allCleared = true;
            this.onAllWavesCleared?.();
            return;
        }

        this._spawning = true;
        this._spawnedCount = 0;
        this._spawnTimer = 0;
        this._waitingPostWave = false;
        this.onWaveChanged?.(this._currentWaveIndex, this._totalWaves);
    }

    update(dt: number) {
        if (this._allCleared || !this._spawning) return;

        // 波次后等待，让剩余敌人走完
        if (this._waitingPostWave) {
            this._postWaveTimer -= dt;
            if (this._postWaveTimer <= 0 && this._activeEnemies.length === 0) {
                this.startNextWave();
            }
            return;
        }

        // 生成敌人
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0) {
            this.spawnOne();
        }
    }

    private spawnOne() {
        const cfg = BattleConfig.WAVE_CONFIGS[this._currentWaveIndex];
        if (this._spawnedCount >= cfg.enemyCount) {
            this._spawning = false;
            // 所有敌人生完成，等待敌人清理完毕
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
            // 所有敌人已消灭，立刻开始下一波
            this.startNextWave();
        }
    }

    /** 手动请求下一波（玩家点击"下一波"按钮） */
    requestNextWave() {
        if (this._spawning || this._waitingPostWave) return;
        if (this._allCleared) return;
        this.startNextWave();
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Battle/WaveManager.ts
git commit -m "feat: 波次管理器 - WaveManager"
```

---

## Task 8: 基地与胜负判定

**Files:**
- Create: `assets/Scripts/Battle/BaseManager.ts`

**Interfaces:**
- Consumes: `BattleConfig.BASE_*`
- Produces: `BaseManager` 类，提供 `hp`, `maxHp`, `takeDamage()`, `onHpChanged`, `onDefeated` 事件

- [ ] **Step 1: 创建 BaseManager

```typescript
import { _decorator, Component, Node, Vec3, Graphics, Color } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass } = _decorator;

@ccclass('BaseManager')
export class BaseManager extends Component {
    private _hp: number = BattleConfig.BASE_MAX_HP;
    private _maxHp: number = BattleConfig.BASE_MAX_HP;
    private _defeated: boolean = false;
    private gfx: Graphics | null = null;

    public onHpChanged: ((current: number, max: number) => void) | null = null;
    public onDefeated: (() => void) | null = null;

    get hp(): number { return this._hp; }
    get maxHp(): number { return this._maxHp; }
    get isDefeated(): boolean { return this._defeated; }

    onLoad() {
        this.node.setPosition(BattleConfig.BASE_POSITION.x, BattleConfig.BASE_POSITION.y);

        const g = this.addComponent(Graphics);
        this.gfx = g;
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
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Battle/BaseManager.ts
git commit -m "feat: 基地与胜负判定 - BaseManager"
```

---

## Task 9: 战斗管理器（核心循环）

**Files:**
- Create: `assets/Scripts/Battle/BattleManager.ts`

**Interfaces:**
- Consumes: `GridManager`, `EnergyManager`, `WaveManager`, `BaseManager`, `Unit`, `Enemy`, `BattleConfig`
- Produces: 核心战斗循环控制器，整合所有子系统

- [ ] **Step 1: 创建 BattleManager

```typescript
import { _decorator, Component, Node, Vec3, instantiate, Prefab } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { GridManager } from './GridManager';
import { EnergyManager } from './EnergyManager';
import { WaveManager } from './WaveManager';
import { BaseManager } from './BaseManager';
import { Unit, UnitConfig } from '../Entities/Unit';
import { Enemy, EnemyConfig } from '../Entities/Enemy';

const { ccclass } = _decorator;

/** 战斗状态 */
export enum BattleState {
    WAITING,    // 等待开始
    PLAYING,    // 战斗中
    VICTORY,    // 胜利
    DEFEAT,     // 失败
}

@ccclass('BattleManager')
export class BattleManager extends Component {
    private _state: BattleState = BattleState.WAITING;
    private _units: Unit[] = [];

    // 子系统引用（由外部注入）
    public gridManager: GridManager | null = null;
    public energyManager: EnergyManager | null = null;
    public waveManager: WaveManager | null = null;
    public baseManager: BaseManager | null = null;

    /** 所有敌人的引用，用于查找目标 */
    private _enemyNodes: { node: Node; isBoss: boolean }[] = [];

    public onStateChanged: ((state: BattleState) => void) | null = null;
    /** 兵种列表变化回调（UI 更新） */
    public onUnitsChanged: ((units: Unit[]) => void) | null = null;

    get state(): BattleState { return this._state; }

    onLoad() {
        this._state = BattleState.WAITING;
    }

    start() {
        // 等待外部调用 startBattle()
    }

    /** 开始战斗 */
    startBattle() {
        this._state = BattleState.PLAYING;
        this.onStateChanged?.(BattleState.PLAYING);

        // 开始波次
        this.waveManager?.startWithDelay();

        // 注册波次事件
        if (this.waveManager) {
            this.waveManager.onSpawnEnemy = (config) => this.spawnEnemy(config);
            this.waveManager.onAllWavesCleared = () => this.onVictory();
        }

        // 注册基地事件
        if (this.baseManager) {
            this.baseManager.onDefeated = () => this.onDefeat();
        }
    }

    /** 生成敌人 */
    private spawnEnemy(config: EnemyConfig) {
        const node = new Node('Enemy');
        this.node.addChild(node);

        const enemy = node.addComponent(Enemy);
        enemy.init(config);

        this._enemyNodes.push({ node, isBoss: !!config.isBoss });
        this.waveManager?.registerEnemy(enemy);

        // 敌人被击杀时从列表移除
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

    /** 在指定格子建造兵种 */
    buildUnit(col: number, row: number, unitType: string = 'default'): boolean {
        if (!this.gridManager || !this.energyManager) return false;
        if (this._state !== BattleState.PLAYING) return false;

        // 检查格子是否可用
        if (this.gridManager.getCell(col, row)?.occupied) return false;

        // 检查能量点
        if (!this.energyManager.spend(BattleConfig.UNIT_COST)) return false;

        // 创建兵种节点
        const node = new Node('Unit');
        this.node.addChild(node);

        const pos = this.gridManager.getCellWorldPos(col, row);
        if (pos) node.setPosition(pos);

        const unit = node.addComponent(Unit);
        unit.init({
            unitId: unitType,
            unitName: unitType === 'default' ? '基础兵种' : unitType,
            maxHp: BattleConfig.UNIT_MAX_HP,
            attackRange: BattleConfig.UNIT_ATTACK_RANGE,
            attackDamage: BattleConfig.UNIT_ATTACK_DAMAGE,
            attackInterval: BattleConfig.UNIT_ATTACK_INTERVAL,
        }, col, row);

        // 注册到网格
        this.gridManager.placeUnit(col, row, unitType);

        // 兵种查找目标逻辑
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

    /** 查找最近的敌人 */
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

    /** 攻击敌人 */
    private damageEnemy(targetNode: Node, damage: number) {
        const enemy = targetNode.getComponent(Enemy);
        if (enemy) {
            enemy.takeDamage(damage);
        }
    }

    /** 选中兵种修复 */
    repairUnit(unit: Unit): boolean {
        if (!this.energyManager) return false;
        return unit.repairWithEnergy(this.energyManager);
    }

    /** 选中兵种销毁 */
    destroyUnit(unit: Unit): number {
        const refund = unit.destroySelf();
        if (this.energyManager) {
            this.energyManager.add(refund);
        }
        return refund;
    }

    /** 获取所有兵种 */
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

    /** 重置战斗 */
    reset() {
        // 清理所有敌人
        for (const { node } of this._enemyNodes) {
            node.destroy();
        }
        this._enemyNodes = [];

        // 清理所有兵种
        for (const unit of this._units) {
            unit.node.destroy();
        }
        this._units = [];

        // 重置子系统
        this.energyManager?.reset();
        this.baseManager?.reset();

        this._state = BattleState.WAITING;
        this.onStateChanged?.(BattleState.WAITING);
        this.onUnitsChanged?.([]);
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Battle/BattleManager.ts
git commit -m "feat: 战斗管理器 - BattleManager 核心循环"
```

---

## Task 10: 战斗 UI

**Files:**
- Create: `assets/Scripts/UI/BattleUI.ts`

**Interfaces:**
- Consumes: `BattleManager`, `EnergyManager`, `BaseManager`, `WaveManager`, `GridManager`
- Produces: 完整的战斗界面 HUD：能量点显示、基地血量、波次信息、兵种建造面板、兵种操作菜单

- [ ] **Step 1: 创建 BattleUI

```typescript
import { _decorator, Component, Node, Label, Button, Vec3, Color, UITransform } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { BattleManager, BattleState } from '../Battle/BattleManager';
import { EnergyManager } from '../Battle/EnergyManager';
import { BaseManager } from '../Battle/BaseManager';
import { WaveManager } from '../Battle/WaveManager';
import { GridManager } from '../Battle/GridManager';
import { Unit } from '../Entities/Unit';

const { ccclass, property } = _decorator;

@ccclass('BattleUI')
export class BattleUI extends Component {
    // UI 引用通过代码创建
    private energyLabel: Label | null = null;
    private hpLabel: Label | null = null;
    private waveLabel: Label | null = null;
    private resultLabel: Label | null = null;
    private buildButton: Button | null = null;
    private repairBtn: Button | null = null;
    private destroyBtn: Button | null = null;
    private priorityBtn: Button | null = null;
    private nextWaveBtn: Button | null = null;
    private unitMenuNode: Node | null = null;

    private battleManager: BattleManager | null = null;
    private energyManager: EnergyManager | null = null;
    private waveManager: WaveManager | null = null;
    private baseManager: BaseManager | null = null;
    private gridManager: GridManager | null = null;

    private selectedUnit: Unit | null = null;
    private buildCooldownTimer: number = 0;

    onLoad() {
        this.createUI();
    }

    setManagers(
        battle: BattleManager,
        energy: EnergyManager,
        base: BaseManager,
        wave: WaveManager,
        grid: GridManager
    ) {
        this.battleManager = battle;
        this.energyManager = energy;
        this.baseManager = base;
        this.waveManager = wave;
        this.gridManager = grid;

        // 注册事件
        this.energyManager.onEnergyChanged = (current) => {
            this.updateEnergyLabel(current);
        };

        this.baseManager.onHpChanged = (current, max) => {
            this.updateHpLabel(current, max);
        };

        this.battleManager.onStateChanged = (state) => {
            this.onBattleStateChanged(state);
        };

        this.waveManager.onWaveChanged = (wave, total) => {
            this.updateWaveLabel(wave + 1, total);
        };
    }

    private createUI() {
        const canvas = this.node;

        // === 顶部信息栏 ===
        const infoY = 1240;

        // 能量点
        const energyNode = new Node('EnergyLabel');
        canvas.addChild(energyNode);
        energyNode.setPosition(120, infoY);
        const el = energyNode.addComponent(Label);
        el.string = `⚡ ${BattleConfig.INITIAL_ENERGY}`;
        el.fontSize = 28;
        el.color = new Color(100, 200, 255);
        this.energyLabel = el;

        // 基地血量
        const hpNode = new Node('HpLabel');
        canvas.addChild(hpNode);
        hpNode.setPosition(360, infoY);
        const hl = hpNode.addComponent(Label);
        hl.string = `🏠 ${BattleConfig.BASE_MAX_HP}/${BattleConfig.BASE_MAX_HP}`;
        hl.fontSize = 28;
        hl.color = new Color(100, 255, 100);
        this.hpLabel = hl;

        // 波次信息
        const waveNode = new Node('WaveLabel');
        canvas.addChild(waveNode);
        waveNode.setPosition(600, infoY);
        const wl = waveNode.addComponent(Label);
        wl.string = `波次 1/${BattleConfig.WAVE_CONFIGS.length}`;
        wl.fontSize = 28;
        wl.color = new Color(255, 200, 100);
        this.waveLabel = wl;

        // === 建造面板（底部） ===
        const buildY = 40;
        const buildNode = new Node('BuildPanel');
        canvas.addChild(buildNode);
        buildNode.setPosition(180, buildY);
        const buildBtn = buildNode.addComponent(Button);
        const buildLabel = buildNode.addComponent(Label);
        buildLabel.string = '建造兵种 (20⚡)';
        buildLabel.fontSize = 22;
        buildBtn.node.on('click', () => this.onBuildClicked());
        this.buildButton = buildBtn;

        // 下一波按钮
        const nextWaveNode = new Node('NextWaveButton');
        canvas.addChild(nextWaveNode);
        nextWaveNode.setPosition(540, buildY);
        const nwBtn = nextWaveNode.addComponent(Button);
        const nwLabel = nextWaveNode.addComponent(Label);
        nwLabel.string = '下一波 >>';
        nwLabel.fontSize = 22;
        nwBtn.node.on('click', () => this.waveManager?.requestNextWave());
        this.nextWaveBtn = nwBtn;

        // === 兵种操作菜单（初始隐藏） ===
        const menuNode = new Node('UnitMenu');
        canvas.addChild(menuNode);
        menuNode.setPosition(360, 700);
        menuNode.active = false;
        this.unitMenuNode = menuNode;

        // 修复按钮
        const repairNode = new Node('RepairBtn');
        menuNode.addChild(repairNode);
        repairNode.setPosition(-80, 0);
        const rBtn = repairNode.addComponent(Button);
        const rLbl = repairNode.addComponent(Label);
        rLbl.string = '修复';
        rLbl.fontSize = 20;
        rBtn.node.on('click', () => this.onRepairClicked());

        // 销毁按钮
        const destroyNode = new Node('DestroyBtn');
        menuNode.addChild(destroyNode);
        destroyNode.setPosition(80, 0);
        const dBtn = destroyNode.addComponent(Button);
        const dLbl = destroyNode.addComponent(Label);
        dLbl.string = '销毁';
        dLbl.fontSize = 20;
        dBtn.node.on('click', () => this.onDestroyClicked());

        // 优先攻击 Boss 开关
        const priorityNode = new Node('PriorityBtn');
        menuNode.addChild(priorityNode);
        priorityNode.setPosition(0, -80);
        const pBtn = priorityNode.addComponent(Button);
        const pLbl = priorityNode.addComponent(Label);
        pLbl.string = '优先 Boss: OFF';
        pLbl.fontSize = 18;
        pBtn.node.on('click', () => this.onPriorityClicked());

        // === 战斗结果提示 ===
        const resultNode = new Node('ResultLabel');
        canvas.addChild(resultNode);
        resultNode.setPosition(360, 640);
        const rl = resultNode.addComponent(Label);
        rl.string = '';
        rl.fontSize = 48;
        rl.color = new Color(255, 255, 255);
        rl.node.active = false;
        this.resultLabel = rl;
    }

    // === UI 更新 ===

    private updateEnergyLabel(current: number) {
        if (this.energyLabel) {
            this.energyLabel.string = `⚡ ${current}`;
        }
    }

    private updateHpLabel(current: number, max: number) {
        if (this.hpLabel) {
            this.hpLabel.string = `🏠 ${current}/${max}`;
        }
    }

    private updateWaveLabel(wave: number, total: number) {
        if (this.waveLabel) {
            this.waveLabel.string = `波次 ${wave}/${total}`;
        }
    }

    private onBattleStateChanged(state: BattleState) {
        if (!this.resultLabel) return;
        this.resultLabel.node.active = true;
        switch (state) {
            case BattleState.VICTORY:
                this.resultLabel.string = '胜利!';
                this.resultLabel.color = new Color(100, 255, 100);
                break;
            case BattleState.DEFEAT:
                this.resultLabel.string = '失败!';
                this.resultLabel.color = new Color(255, 50, 50);
                break;
            case BattleState.WAITING:
            case BattleState.PLAYING:
                this.resultLabel.node.active = false;
                break;
        }
    }

    // === 按钮事件 ===

    private onBuildClicked() {
        if (!this.battleManager || !this.gridManager || !this.energyManager) return;
        if (this.battleManager.state !== BattleState.PLAYING) return;

        // 找到第一个空闲格子建造
        const freeCells = this.gridManager.getFreeCells();
        if (freeCells.length === 0) return;

        const cell = freeCells[0];
        this.battleManager.buildUnit(cell.col, cell.row, 'default');
    }

    /** 点击战场上的兵种（由外部调用） */
    selectUnit(unit: Unit) {
        this.selectedUnit = unit;
        if (this.unitMenuNode) {
            this.unitMenuNode.active = true;
            this.unitMenuNode.setPosition(unit.node.getPosition());
        }
    }

    /** 取消选中 */
    deselectUnit() {
        this.selectedUnit = null;
        if (this.unitMenuNode) {
            this.unitMenuNode.active = false;
        }
    }

    private onRepairClicked() {
        if (!this.selectedUnit || !this.battleManager) return;
        this.battleManager.repairUnit(this.selectedUnit);
        this.deselectUnit();
    }

    private onDestroyClicked() {
        if (!this.selectedUnit || !this.battleManager) return;
        this.battleManager.destroyUnit(this.selectedUnit);
        this.deselectUnit();
    }

    private onPriorityClicked() {
        if (!this.selectedUnit) return;
        const val = this.selectedUnit.togglePriorityBoss();
        // 更新按钮文字
        const pBtn = this.unitMenuNode?.getChildByName('PriorityBtn');
        if (pBtn) {
            const lbl = pBtn.getComponent(Label);
            if (lbl) lbl.string = `优先 Boss: ${val ? 'ON' : 'OFF'}`;
        }
    }

    update(dt: number) {
        // 建造冷却
        if (this.buildCooldownTimer > 0) {
            this.buildCooldownTimer -= dt;
        }
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/UI/BattleUI.ts
git commit -m "feat: 战斗 UI - BattleUI HUD + 兵种操作菜单"
```

---

## Task 11: 更新 Bootstrap 整合所有系统

**Files:**
- Modify: `assets/Scripts/Bootstrap.ts`

**Interfaces:**
- Consumes: 所有 Task 1-10 的组件

- [ ] **Step 1: 重写 Bootstrap

```typescript
import { _decorator, Component, Node, director } from 'cc';
import { BattleConfig } from './Data/BattleConfig';
import { GridManager } from './Battle/GridManager';
import { EnergyManager } from './Battle/EnergyManager';
import { WaveManager } from './Battle/WaveManager';
import { BaseManager } from './Battle/BaseManager';
import { BattleManager } from './Battle/BattleManager';
import { BattleUI } from './UI/BattleUI';
import { Unit } from './Entities/Unit';

const { ccclass } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
    private gridManager: GridManager | null = null;
    private energyManager: EnergyManager | null = null;
    private waveManager: WaveManager | null = null;
    private baseManager: BaseManager | null = null;
    private battleManager: BattleManager | null = null;
    private battleUI: BattleUI | null = null;

    onLoad() {
        console.log('[Bootstrap] Initializing battle systems...');
        this.initSystems();
    }

    start() {
        // 延迟一小帧让所有系统初始化完成
        this.scheduleOnce(() => {
            this.battleManager?.startBattle();
        }, 0.1);
    }

    private initSystems() {
        // 创建各个管理器节点
        // GridManager
        const gridNode = new Node('GridManager');
        this.node.addChild(gridNode);
        this.gridManager = gridNode.addComponent(GridManager);

        // EnergyManager
        const energyNode = new Node('EnergyManager');
        this.node.addChild(energyNode);
        this.energyManager = energyNode.addComponent(EnergyManager);

        // WaveManager
        const waveNode = new Node('WaveManager');
        this.node.addChild(waveNode);
        this.waveManager = waveNode.addComponent(WaveManager);

        // BaseManager
        const baseNode = new Node('BaseManager');
        this.node.addChild(baseNode);
        this.baseManager = baseNode.addComponent(BaseManager);

        // BattleManager (核心)
        const battleNode = new Node('BattleManager');
        this.node.addChild(battleNode);
        this.battleManager = battleNode.addComponent(BattleManager);
        this.battleManager.gridManager = this.gridManager;
        this.battleManager.energyManager = this.energyManager;
        this.battleManager.waveManager = this.waveManager;
        this.battleManager.baseManager = this.baseManager;

        // BattleUI
        const uiNode = new Node('BattleUI');
        this.node.addChild(uiNode);
        this.battleUI = uiNode.addComponent(BattleUI);
        this.battleUI.setManagers(
            this.battleManager,
            this.energyManager,
            this.baseManager,
            this.waveManager,
            this.gridManager
        );

        // 注册点击场景选择兵种
        this.node.on(Node.EventType.TOUCH_END, (event) => {
            this.onSceneTap(event.getUILocation());
        });

        console.log('[Bootstrap] All systems initialized.');
    }

    private onSceneTap(screenPos: { x: number; y: number }) {
        if (!this.battleManager || !this.gridManager || !this.battleUI) return;

        const worldPos = new cc.Vec3(screenPos.x, screenPos.y, 0);

        // 检查是否点击到格子 -> 如果是空地则尝试建造
        // 如果格子上有兵种则选中
        const cell = this.gridManager.getCellAtPos(worldPos);

        if (cell) {
            if (cell.occupied) {
                // 点击已占领格子，选中兵种
                const units = this.battleManager.getUnits();
                const unit = units.find(u => u.gridCol === cell.col && u.gridRow === cell.row);
                if (unit) {
                    this.battleUI.selectUnit(unit);
                }
            } else {
                // 点击空闲格子，建造兵种
                this.battleManager.buildUnit(cell.col, cell.row, 'default');
                this.battleUI.deselectUnit();
            }
        } else {
            // 点击其他地方，取消选中
            this.battleUI.deselectUnit();
        }
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add assets/Scripts/Bootstrap.ts
git commit -m "feat: 整合所有子系统 - Bootstrap 启动器"
```

---

## 自审

1. **Spec 覆盖检查:**
   - 战斗系统核心循环 ✓（网格、建造、敌方 AI、攻击、能量点、胜负）
   - 暂未覆盖：英雄系统（Plan 3）、兵种多样性（Plan 2）、养成线（Plan 5-6）
   - 覆盖范围合理（Plan 1 只做最核心的战斗 Demo）
2. **占位符检查:** 无 TODO/TBD 残留
3. **类型一致性:** 所有接口类型定义在各自文件中，引用路径正确
4. **边界与风险:**
   - Cocos Creator 项目文件手动创建，打开后需要 Cocos Creator IDE 验证
   - 场景 JSON 是简化版，如果 Cocos Creator 项目格式有差异需要调试
   - 路径绘制使用 Graphics 组件，后续需要替换为实际地图美术

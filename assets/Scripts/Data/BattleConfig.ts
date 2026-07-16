/**
 * 战斗全局配置常量
 * 所有数字配置集中在此文件，方便后期调整
 */

export const BattleConfig = {
    // === 网格 ===
    GRID_COLS: 8,
    GRID_ROWS: 6,
    GRID_CELL_SIZE: 80,
    GRID_OFFSET_X: 40,
    GRID_OFFSET_Y: 500,

    // === 基地 ===
    BASE_MAX_HP: 100,
    BASE_POSITION: { x: 360, y: 150 },

    // === 能量点 ===
    INITIAL_ENERGY: 50,

    // === 兵种 ===
    UNIT_COST: 20,
    UNIT_ATTACK_RANGE: 150,
    UNIT_ATTACK_DAMAGE: 10,
    UNIT_ATTACK_INTERVAL: 1.0,
    UNIT_MAX_HP: 100,
    UNIT_REPAIR_COST_RATIO: 0.3,
    UNIT_REPAIR_PCT: 0.3,
    UNIT_DESTROY_REFUND_RATIO: 0.5,
    UNIT_BUILD_CD: 1.0,

    // === 敌人 ===
    ENEMY_MAX_HP: 50,
    ENEMY_SPEED: 60,
    ENEMY_DAMAGE: 5,
    ENEMY_REWARD_ENERGY: 5,
    ENEMY_SPAWN_INTERVAL: 2.0,
    ENEMY_START_WAVE_DELAY: 3.0,

    // === 波次 ===
    WAVE_CONFIGS: [
        { enemyCount: 5, enemyHP: 50, enemySpeed: 60, spawnInterval: 1.5, reward: 5 },
        { enemyCount: 8, enemyHP: 60, enemySpeed: 65, spawnInterval: 1.2, reward: 5 },
        { enemyCount: 10, enemyHP: 80, enemySpeed: 70, spawnInterval: 1.0, reward: 6 },
        { enemyCount: 7, enemyHP: 200, enemySpeed: 40, spawnInterval: 2.0, reward: 20, isBossWave: true },
    ],

    // === 路径由一系列路点坐标组成，敌人沿路点前进 ===
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
    POST_WAVE_DELAY: 2.0,
    VICTORY_DELAY: 1.5,
    DEFEAT_DELAY: 1.5,
};

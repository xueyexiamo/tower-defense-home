import { _decorator, Component, Node, Label, Button, Vec3, Color, input, Input, EventTouch } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';
import { BattleManager, BattleState } from '../Battle/BattleManager';
import { EnergyManager } from '../Battle/EnergyManager';
import { BaseManager } from '../Battle/BaseManager';
import { WaveManager } from '../Battle/WaveManager';
import { GridManager } from '../Battle/GridManager';
import { Unit } from '../Entities/Unit';

const { ccclass } = _decorator;

@ccclass('BattleUI')
export class BattleUI extends Component {
    private energyLabel: Label | null = null;
    private hpLabel: Label | null = null;
    private waveLabel: Label | null = null;
    private resultLabel: Label | null = null;
    private unitMenuNode: Node | null = null;

    private battleManager: BattleManager | null = null;
    private energyManager: EnergyManager | null = null;
    private waveManager: WaveManager | null = null;
    private baseManager: BaseManager | null = null;
    private gridManager: GridManager | null = null;

    private selectedUnit: Unit | null = null;

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

        this.energyManager.addListener((current) => {
            this.updateEnergyLabel(current);
        });

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

        // 顶部信息栏
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

        // 下一波按钮
        const buildY = 40;
        const nextWaveNode = new Node('NextWaveButton');
        canvas.addChild(nextWaveNode);
        nextWaveNode.setPosition(360, buildY);
        const nwBtn = nextWaveNode.addComponent(Button);
        const nwLabel = nextWaveNode.addComponent(Label);
        nwLabel.string = '下一波 >>';
        nwLabel.fontSize = 22;
        nwBtn.node.on('click', () => this.waveManager?.requestNextWave());

        // 兵种操作菜单（初始隐藏）
        const menuNode = new Node('UnitMenu');
        canvas.addChild(menuNode);
        menuNode.setPosition(360, 700);
        menuNode.active = false;
        this.unitMenuNode = menuNode;

        // 修复按钮
        const repairNode = new Node('RepairBtn');
        menuNode.addChild(repairNode);
        repairNode.setPosition(-80, 0);
        repairNode.addComponent(Button);
        const rLbl = repairNode.addComponent(Label);
        rLbl.string = '修复';
        rLbl.fontSize = 20;
        repairNode.on('click', () => this.onRepairClicked());

        // 销毁按钮
        const destroyNode = new Node('DestroyBtn');
        menuNode.addChild(destroyNode);
        destroyNode.setPosition(80, 0);
        destroyNode.addComponent(Button);
        const dLbl = destroyNode.addComponent(Label);
        dLbl.string = '销毁';
        dLbl.fontSize = 20;
        destroyNode.on('click', () => this.onDestroyClicked());

        // 优先攻击 Boss 开关
        const priorityNode = new Node('PriorityBtn');
        menuNode.addChild(priorityNode);
        priorityNode.setPosition(0, -80);
        priorityNode.addComponent(Button);
        const pLbl = priorityNode.addComponent(Label);
        pLbl.string = '优先 Boss: OFF';
        pLbl.fontSize = 18;
        priorityNode.on('click', () => this.onPriorityClicked());

        // 战斗结果提示
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
            default:
                this.resultLabel.node.active = false;
                break;
        }
    }

    selectUnit(unit: Unit) {
        this.selectedUnit = unit;
        if (this.unitMenuNode) {
            this.unitMenuNode.active = true;
            this.unitMenuNode.setPosition(unit.node.getPosition());
        }
    }

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
        const priorityNode = this.unitMenuNode?.getChildByName('PriorityBtn');
        if (priorityNode) {
            const lbl = priorityNode.getComponent(Label);
            if (lbl) lbl.string = `优先 Boss: ${val ? 'ON' : 'OFF'}`;
        }
    }
}

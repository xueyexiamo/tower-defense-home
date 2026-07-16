import { _decorator, Component, Node, Vec3, input, Input, EventTouch } from 'cc';
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
        this.scheduleOnce(() => {
            this.battleManager?.startBattle();
        }, 0.1);
    }

    private initSystems() {
        const gridNode = new Node('GridManager');
        this.node.addChild(gridNode);
        this.gridManager = gridNode.addComponent(GridManager);

        const energyNode = new Node('EnergyManager');
        this.node.addChild(energyNode);
        this.energyManager = energyNode.addComponent(EnergyManager);

        const waveNode = new Node('WaveManager');
        this.node.addChild(waveNode);
        this.waveManager = waveNode.addComponent(WaveManager);

        const baseNode = new Node('BaseManager');
        this.node.addChild(baseNode);
        this.baseManager = baseNode.addComponent(BaseManager);

        const battleNode = new Node('BattleManager');
        this.node.addChild(battleNode);
        this.battleManager = battleNode.addComponent(BattleManager);
        this.battleManager.gridManager = this.gridManager;
        this.battleManager.energyManager = this.energyManager;
        this.battleManager.waveManager = this.waveManager;
        this.battleManager.baseManager = this.baseManager;

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

        input.on(Input.EventType.TOUCH_END, (event: EventTouch) => {
            this.onSceneTap(event.getUILocation());
        });

        console.log('[Bootstrap] All systems initialized.');
    }

    private onSceneTap(screenPos: Vec3 | { x: number; y: number }) {
        if (!this.battleManager || !this.gridManager || !this.battleUI) return;

        const worldPos = new Vec3(screenPos.x, screenPos.y, 0);
        const cell = this.gridManager.getCellAtPos(worldPos);

        if (cell) {
            if (cell.occupied) {
                const units = this.battleManager.getUnits();
                const unit = units.find(u => u.gridCol === cell.col && u.gridRow === cell.row);
                if (unit) {
                    this.battleUI.selectUnit(unit);
                }
            } else {
                this.battleManager.buildUnit(cell.col, cell.row, 'default');
                this.battleUI.deselectUnit();
            }
        } else {
            this.battleUI.deselectUnit();
        }
    }
}

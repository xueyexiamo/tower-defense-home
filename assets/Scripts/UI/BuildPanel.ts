import { _decorator, Component, Node, Button, Label, Color } from 'cc';
import { UnitDataDef, UNIT_TYPES, getUnitsByCategory, UnitCategory } from '../Data/UnitData';
import { BattleManager } from '../Battle/BattleManager';
import { EnergyManager } from '../Battle/EnergyManager';
import { GridManager } from '../Battle/GridManager';

const { ccclass } = _decorator;

interface BuildSlot {
    data: UnitDataDef;
    btnNode: Node;
    cooldownTimer: number;
}

@ccclass('BuildPanel')
export class BuildPanel extends Component {
    private battleManager: BattleManager | null = null;
    private energyManager: EnergyManager | null = null;
    private gridManager: GridManager | null = null;
    private slots: BuildSlot[] = [];
    private selectedCategory: UnitCategory = UnitCategory.MELEE;
    private categoryButtons: Map<UnitCategory, Node> = new Map();

    onLoad() {
        this.createPanel();
    }

    setManagers(battle: BattleManager, energy: EnergyManager, grid: GridManager) {
        this.battleManager = battle;
        this.energyManager = energy;
        this.gridManager = grid;
        this.energyManager.onEnergyChanged = () => this.updateButtonStates();
    }

    private createPanel() {
        const categories = [
            { cat: UnitCategory.MELEE, label: '近战' },
            { cat: UnitCategory.RANGED, label: '远程' },
            { cat: UnitCategory.SPECIAL, label: '特殊' },
            { cat: UnitCategory.ULTIMATE, label: '终极' },
        ];

        // 分类选项卡
        categories.forEach(({ cat, label }, i) => {
            const n = new Node(`Tab_${cat}`);
            this.node.addChild(n);
            n.setPosition(90 + i * 140, 120);
            const lbl = n.addComponent(Label);
            lbl.string = label;
            lbl.fontSize = 20;
            lbl.color = cat === this.selectedCategory ? new Color(100, 200, 255) : new Color(180, 180, 180);
            n.on('click', () => this.switchCategory(cat));
            this.categoryButtons.set(cat, n);
        });

        this.refreshBuildList();
    }

    private switchCategory(cat: UnitCategory) {
        this.selectedCategory = cat;
        this.categoryButtons.forEach((n, c) => {
            const lbl = n.getComponent(Label);
            if (lbl) lbl.color = c === cat ? new Color(100, 200, 255) : new Color(180, 180, 180);
        });
        this.refreshBuildList();
    }

    private refreshBuildList() {
        for (const s of this.slots) s.btnNode.destroy();
        this.slots = [];

        const units = getUnitsByCategory(this.selectedCategory);
        units.forEach((data, i) => {
            const n = new Node(`Build_${data.id}`);
            this.node.addChild(n);
            n.setPosition(60 + i * 90, 60);
            const lbl = n.addComponent(Label);
            lbl.string = `${data.name}\n${data.cost}`;
            lbl.fontSize = 16;
            lbl.color = new Color(180, 220, 255);
            lbl.lineHeight = 20;
            this.slots.push({ data, btnNode: n, cooldownTimer: 0 });
            n.on('click', () => this.onBuild(this.slots[this.slots.length - 1]));
        });
        this.updateButtonStates();
    }

    private onBuild(slot: BuildSlot) {
        if (!this.battleManager || !this.gridManager || !this.energyManager) return;
        if (slot.cooldownTimer > 0) return;
        if (this.energyManager.current < slot.data.cost) return;
        const free = this.gridManager.getFreeCells();
        if (free.length === 0) return;
        if (this.battleManager.buildUnit(free[0].col, free[0].row, slot.data.id)) {
            slot.cooldownTimer = slot.data.buildCd;
        }
    }

    private updateButtonStates() {
        if (!this.energyManager) return;
        const e = this.energyManager.current;
        for (const s of this.slots) {
            const lbl = s.btnNode.getComponent(Label);
            if (!lbl) continue;
            if (s.cooldownTimer > 0) {
                lbl.string = `${s.data.name}\n${s.cooldownTimer.toFixed(1)}s`;
                lbl.color = new Color(100, 100, 100);
            } else if (e < s.data.cost) {
                lbl.string = `${s.data.name}\n${s.data.cost}`;
                lbl.color = new Color(150, 100, 100);
            } else {
                lbl.string = `${s.data.name}\n${s.data.cost}`;
                lbl.color = new Color(180, 220, 255);
            }
        }
    }

    update(dt: number) {
        let need = false;
        for (const s of this.slots) {
            if (s.cooldownTimer > 0) { s.cooldownTimer -= dt; if (s.cooldownTimer < 0) s.cooldownTimer = 0; need = true; }
        }
        if (need) this.updateButtonStates();
    }
}

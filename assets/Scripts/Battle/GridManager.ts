import { _decorator, Component, Node, Vec3, Graphics, Color } from 'cc';
import { BattleConfig } from '../Data/BattleConfig';

const { ccclass } = _decorator;

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
        return cell ? cell.occupied : true;
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

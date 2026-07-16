import { _decorator, Component, Node, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
    onLoad() {
        console.log('[Bootstrap] Battle scene loaded');
    }

    start() {
        console.log('[Bootstrap] Starting battle...');
    }
}

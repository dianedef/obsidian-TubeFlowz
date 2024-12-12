import { ViewMode } from './ISettings';
import { PlayerView } from '../views/PlayerView';
export interface IViewModeService {
    getCurrentMode(): ViewMode;
    setMode(mode: ViewMode): void;
    createView(mode: ViewMode): Promise<PlayerView>;
    closeView(): Promise<void>;
}
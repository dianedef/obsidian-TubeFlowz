import { IPluginSettings } from './ISettings';

export interface ISettingsService {
    getSettings(): Readonly<IPluginSettings>;
    save(): Promise<void>;
} 
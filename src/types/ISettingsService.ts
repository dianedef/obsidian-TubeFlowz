import { PluginSettings } from './ISettings';

export interface ISettingsService {
    getSettings(): Readonly<PluginSettings>;
    save(): Promise<void>;
} 
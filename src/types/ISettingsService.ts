import { PluginSettings } from './settings';

export interface ISettingsService {
    getSettings(): Readonly<PluginSettings>;
    save(): Promise<void>;
} 
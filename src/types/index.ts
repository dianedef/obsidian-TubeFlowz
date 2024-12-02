// Réexporter tous les types
export * from './video';
export * from '../services/settings/types';

// Types spécifiques à l'application
export interface AppError extends Error {
    code?: string;
    details?: any;
}

// Types pour les événements de l'application
export type AppEventType = 
    | 'app:ready'
    | 'app:error'
    | 'app:themeChange'
    | 'app:settingsChange';

export interface AppEvent<T = any> {
    type: AppEventType;
    payload?: T;
    timestamp: number;
} 
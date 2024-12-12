import { beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';
import { videojsMock } from './setup';

// Configuration globale avant chaque test
beforeEach(() => {
    // Réinitialiser l'historique des stubs
    sinon.resetHistory();
    
    // Configurer le mock VideoJS global
    window.videojs = videojsMock.videojs;
});

// Nettoyage après chaque test
afterEach(() => {
    sinon.restore();
}); 
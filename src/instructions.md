ajouter raccourcis clavier
trad




### 1. Gestion des Vidéos YouTube
- **Import de vidéos**
  - Import via URL YouTube (supporte plusieurs formats d'URL)
  - Support des vidéos individuelles et des playlists
  - Extraction automatique des métadonnées

- **Modes d'affichage**
  - Mode onglet (tab)
  - Mode barre latérale (sidebar)
  - Mode superposition (overlay)
  - Interface responsive avec hauteur ajustable

### 2. Contrôles de Lecture
- **Contrôles basiques**
  - Lecture/Pause
  - Contrôle du volume
  - Mode muet/son
  - Plein écran

- **Contrôles avancés**
  - Vitesse de lecture personnalisable (0.25x à 16x)
  - Vitesse favorite configurable
  - Navigation par timestamps
  - Mode de lecture configurable (streaming/téléchargement)

### 3. Intégration avec Obsidian
- **Interface utilisateur**
  - Bouton dans la barre latérale avec menu déroulant
  - Raccourcis clavier personnalisables
  - Thème adapté à Obsidian

- **Gestion des notes**
  - Insertion de timestamps cliquables
  - Création de liens YouTube avec timestamp
  - Support du format Markdown

### 4. Fonctionnalités IA (avec OpenAI)
- Génération automatique de résumés
- Création de notes structurées
- Extraction des points clés
- Traduction automatique du contenu

### 5. Configuration et Personnalisation
- **Paramètres généraux**
  - Mode d'affichage par défaut
  - Mode de lecture préféré
  - Vitesse de lecture favorite
  - Affichage des recommandations YouTube

- **Paramètres avancés**
  - Configuration des raccourcis clavier
  - Personnalisation des templates de notes
  - Gestion des API keys (OpenAI)

### 6. Internationalisation
- Support multilingue (Français/Anglais)
- Détection automatique de la langue
- Messages d'erreur localisés

### 7. Sécurité et Gestion des Erreurs
- Gestion robuste des erreurs
- Validation des URLs et IDs YouTube
- Protection des API keys
- Gestion sécurisée des données

### 8. Aspects Techniques
- Architecture modulaire (services séparés)
- Gestion d'état centralisée
- Support des tests unitaires et d'intégration
- Système d'événements pour la communication inter-composants



### 1. Architecture de Base

1. **Structure des Dossiers**
```
src/
  ├── services/      # Services principaux
  ├── views/         # Composants d'interface
  ├── types/         # Définitions TypeScript
  ├── utils/         # Utilitaires
  ├── i18n/          # Traductions
  └── tests/         # Tests unitaires
```

### 2. Flux de Données

1. **Flux Principal**
```
URL YouTube → Extraction ID → PlayerService → PlayerView → Interface Utilisateur
```

2. **Flux des États**
```
SettingsService (état global)
    ↓
PlayerService (état du lecteur)
    ↓
ViewModeService (état de l'interface)
    ↓
Composants UI
```

### 3. Instructions de Développement

1. **Étape 1 : Configuration Initiale**
   - Créer un nouveau plugin Obsidian avec TypeScript
   - Configurer le système de build (esbuild)
   - Mettre en place ESLint et Prettier
   - Initialiser le système de tests (Vitest)

2. **Étape 2 : Services Fondamentaux**
   - Implémenter `SettingsService` (gestion de la configuration)
   - Créer `EventBus` (communication inter-services)
   - Développer `TranslationsService` (i18n)

3. **Étape 3 : Cœur du Plugin**
   - Développer `PlayerService` :
     ```typescript
     class PlayerService {
       private player: YouTubePlayer;
       private settings: SettingsService;
       private eventBus: EventBus;
       
       // États principaux
       private videoState = {
         isPlaying: false,
         currentTime: 0,
         volume: 1,
         playbackRate: 1
       };
     }
     ```

4. **Étape 4 : Interface Utilisateur**
   - Créer `PlayerView` avec trois modes (tab/sidebar/overlay)
   - Implémenter `ViewModeService` pour la gestion des vues
   - Utiliser le pattern Observer pour les mises à jour UI

5. **Étape 5 : Système de Commandes**
   ```typescript
   // Centraliser les commandes dans un service
   class CommandService {
     registerCommands() {
       // Commandes principales
       this.addCommand('play-pause');
       this.addCommand('change-speed');
       this.addCommand('insert-timestamp');
       // etc.
     }
   }
   ```

### 4. Améliorations Proposées

1. **Gestion d'État Simplifiée**
   ```typescript
   // Utiliser un store centralisé
   class Store {
     private state = {
       player: PlayerState,
       settings: SettingsState,
       ui: UIState
     };
     
     // Utiliser des observables pour les mises à jour
     subscribe(callback: (state: State) => void);
     dispatch(action: Action);
   }
   ```

2. **Système de Cache**
   ```typescript
   class CacheService {
     // Mettre en cache les métadonnées des vidéos
     private videoCache = new Map<string, VideoMetadata>();
     
     // Système de persistance locale
     async saveToCache(videoId: string, data: VideoMetadata);
     async getFromCache(videoId: string): Promise<VideoMetadata>;
   }
   ```

3. **Gestion des Erreurs Améliorée**
   ```typescript
   class ErrorHandler {
     // Centraliser la gestion des erreurs
     handleError(error: AppError) {
       this.logError(error);
       this.notifyUser(error);
       this.recoverIfPossible(error);
     }
   }
   ```

### 5. Points d'Optimisation

1. **Chargement Différé**
   - Charger l'API YouTube uniquement quand nécessaire
   - Initialiser les services à la demande

2. **Performance**
   - Utiliser des Web Workers pour le traitement lourd
   - Mettre en cache les résultats des appels API
   - Optimiser les rendus UI avec la virtualisation

3. **Modularité**
   - Séparer clairement les responsabilités
   - Utiliser l'injection de dépendances
   - Créer des interfaces pour chaque service

### 6. Tests et Qualité

1. **Tests Unitaires**
   ```typescript
   describe('PlayerService', () => {
     it('should handle video state changes', () => {
       // Tests des changements d'état
     });
     
     it('should recover from errors', () => {
       // Tests de récupération
     });
   });
   ```

2. **Tests d'Intégration**
   - Tester les interactions entre services
   - Vérifier les flux de données complets
   - Simuler les scénarios utilisateur

Cette approche simplifiée permet de :
- Réduire la complexité du code
- Améliorer la maintenabilité
- Faciliter les tests
- Optimiser les performances
- Rendre le code plus modulaire

Le développement devrait suivre un ordre logique :
1. Services de base
2. Logique métier
3. Interface utilisateur
4. Fonctionnalités avancées
5. Tests et optimisations

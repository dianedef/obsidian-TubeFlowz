import { vi } from 'vitest';

export const mockVideoJs = {
    default: vi.fn().mockReturnValue({
        dispose: vi.fn(),
        on: vi.fn(),
        ready: vi.fn(cb => cb()),
        volume: vi.fn(),
        muted: vi.fn(),
        playbackRate: vi.fn(),
        currentTime: vi.fn(),
        duration: vi.fn(),
        paused: vi.fn(),
        play: vi.fn(),
        pause: vi.fn()
    })
};

vi.mock('video.js', () => mockVideoJs);
vi.mock('videojs-youtube'); 
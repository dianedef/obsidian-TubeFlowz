import sinon from 'sinon';

// Interface simplifiée pour VideoJS
export interface VideoJsPlayer {
    on: sinon.SinonStub;
    off: sinon.SinonStub;
    one: sinon.SinonStub;
    trigger: sinon.SinonStub;
    play: sinon.SinonStub;
    pause: sinon.SinonStub;
    paused: sinon.SinonStub;
    src: sinon.SinonStub;
    currentTime: sinon.SinonStub;
    duration: sinon.SinonStub;
    volume: sinon.SinonStub;
    muted: sinon.SinonStub;
    playbackRate: sinon.SinonStub;
    videoHeight: sinon.SinonStub;
    videoWidth: sinon.SinonStub;
    dispose: sinon.SinonStub;
    error: sinon.SinonStub;
    el: sinon.SinonStub;
    controlBar: {
        progressControl: {
            seekBar: {
                update: sinon.SinonStub;
            };
        };
    };
}

// Créer un mock VideoJS avec Sinon
export const createVideoJSMock = () => {
    const playerStub = {
        on: sinon.stub().returnsThis(),
        off: sinon.stub().returnsThis(),
        one: sinon.stub().returnsThis(),
        trigger: sinon.stub().returnsThis(),
        play: sinon.stub().resolves(),
        pause: sinon.stub().returnsThis(),
        paused: sinon.stub().returns(true),
        src: sinon.stub().resolves(),
        currentTime: sinon.stub().returnsThis(),
        duration: sinon.stub().returns(0),
        volume: sinon.stub().returnsThis(),
        muted: sinon.stub().returns(false),
        playbackRate: sinon.stub().returnsThis(),
        videoHeight: sinon.stub().returns(720),
        videoWidth: sinon.stub().returns(1280),
        dispose: sinon.stub(),
        error: sinon.stub().returns(null),
        el: sinon.stub().returns(document.createElement('div')),
        controlBar: {
            progressControl: {
                seekBar: {
                    update: sinon.stub()
                }
            }
        }
    } as VideoJsPlayer;

    const videojsMock = sinon.stub().returns(playerStub);
    Object.assign(videojsMock, {
        getPlayer: sinon.stub().returns(playerStub)
    });

    return {
        videojs: videojsMock,
        player: playerStub
    };
}; 
import { useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function StudentBackground({ showAudioControl = true }) {
  const { backgroundSettings } = useAppContext();
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackError, setPlaybackError] = useState('');
  const backgroundVideoUrl = backgroundSettings.videoDataUrl || '/campus-background.mp4';
  const backgroundVideoType = backgroundSettings.videoMimeType || 'video/mp4';

  const toggleSound = async () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    setPlaybackError('');

    if (!nextMuted) {
      try {
        await video.play();
      } catch (error) {
        video.muted = true;
        setIsMuted(true);
        setPlaybackError('Unable to play background video audio in this browser.');
        console.error('Unable to play background video audio:', error);
      }
    }
  };

  return (
    <>
      <div className="student-background" aria-hidden="true">
        <div className="hero-video-wrap">
          {backgroundSettings.enabled ? (
            <video
              key={backgroundVideoUrl}
              ref={videoRef}
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={backgroundVideoUrl} type={backgroundVideoType} />
            </video>
          ) : (
            <div className="hero-clouds">
              <span className="cloud cloud-one" />
              <span className="cloud cloud-two" />
              <span className="cloud cloud-three" />
            </div>
          )}
        </div>
        <div className="hero-overlay" />
      </div>
      {backgroundSettings.enabled && showAudioControl ? (
        <div className="background-audio-control">
          <button
            type="button"
            className="background-audio-button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Turn background video sound on' : 'Mute background video'}
            aria-pressed={!isMuted}
            title={isMuted ? 'Turn background video sound on' : 'Mute background video'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <span>{isMuted ? 'Sound off' : 'Sound on'}</span>
          </button>
          {playbackError ? <span className="background-audio-error" role="alert">{playbackError}</span> : null}
        </div>
      ) : null}
    </>
  );
}

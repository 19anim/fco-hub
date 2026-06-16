export default function YouTubeEmbed({ videoId, title = 'Video Review' }) {
  if (!videoId) {
    return (
      <div className="aspect-video bg-surface-1 rounded-lg flex items-center justify-center">
        <p className="text-ink-muted">No video available</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden border border-hairline">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}

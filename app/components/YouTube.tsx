import React from 'react';

export default function YouTube({ id }: { id: string }) {
  return (
    <div className="youtube-embed" style={{ aspectRatio: '16/9', width: '100%', maxWidth: 700, margin: '2em 0' }}>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
} 
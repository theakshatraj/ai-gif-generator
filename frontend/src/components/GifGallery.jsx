import React from 'react';

const GifGallery = ({ gifs }) => {
  if (!gifs || gifs.length === 0) {
    return <div className="text-center text-gray-500 py-8">No GIFs generated yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-8">
      {gifs.map((gif, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <img src={gif.url} alt={gif.caption || `GIF ${idx + 1}`} className="w-full h-48 object-cover rounded mb-2" />
          {gif.caption && <div className="text-gray-700 font-medium mb-2">{gif.caption}</div>}
          <a href={gif.url} download className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">Download</a>
        </div>
      ))}
    </div>
  );
};

export default GifGallery; 
const JAMENDO_CLIENT_ID = 'b7e4e96a';

async function fetchJamendoTracks(query) {
  try {
    const res = await fetch(`https://api.jamendo.com/v3/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=20&namesearch=${encodeURIComponent(query)}&include=musicinfo`);
    const data = await res.json();
    return (data.results || []).map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artist_name,
      image: track.album_image || track.image,
      audioUrl: track.audio, // Direct MP3 stream for true background play
      isJamendo: true
    }));
  } catch (error) {
    console.error('Jamendo API Error:', error);
    return [];
  }
}

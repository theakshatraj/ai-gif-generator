import { getTranscript } from "youtube-transcript";

export default async function getYouTubeCaptions(videoId) {
  try {
    console.log(`📝 Fetching YouTube captions for video ID: ${videoId}`);
    
    const transcriptRaw = await getTranscript(videoId);
    
    const segments = transcriptRaw.map(seg => ({
      start: seg.offset / 1000,
      end: (seg.offset + seg.duration) / 1000,
      text: seg.text,
    }));

    console.log(`✅ Successfully fetched ${segments.length} caption segments`);

    return {
      text: segments.map(s => s.text).join(" "),
      segments,
    };
  } catch (error) {
    console.error("❌ Failed to fetch YouTube captions:", error);
    throw new Error(`Failed to fetch YouTube captions: ${error.message}`);
  }
}
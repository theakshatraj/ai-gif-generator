import fs from "fs";
import path from "path";
import videoService from "../services/videoService.js";
import videoAnalysisService from "../services/videoAnalysisService.js";
import aiService from "../services/aiService.js";
import gifService from "../services/gifService.js";

export const generateGifs = async (req, res) => {
  const startTime = Date.now();
  const tempFiles = [];

  try {
    console.log("🚀 Starting GIF generation process...");
    const { prompt, youtubeUrl } = req.body;
    const uploadedFile = req.file;

    console.log("📝 Prompt:", prompt);
    console.log("🎥 YouTube URL:", youtubeUrl);
    console.log("📁 Uploaded file:", uploadedFile?.filename);

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required and cannot be empty",
      });
    }

    // Test OpenRouter connection first
    let connectionTest = false;
    try {
      connectionTest = await aiService.testConnection();
      if (!connectionTest) {
        console.log(
          "⚠️ OpenRouter connection failed, will use fallback methods"
        );
      }
    } catch (aiError) {
      console.error("❌ AI service connection test failed:", aiError);
      return res.status(500).json({
        success: false,
        error:
          "AI service is not available. Please check your OpenRouter API key.",
      });
    }

    let videoPath;
    let videoInfo;
    let transcript;

    if (youtubeUrl) {
      console.log("📥 Processing YouTube URL...");

      try {
        // Step 1: Download the actual YouTube video
        console.log("⬇️ Downloading YouTube video...");
        const downloadResult = await videoService.downloadFromYoutube(
          youtubeUrl
        );
        videoPath = downloadResult.videoPath;
        videoInfo = downloadResult.videoInfo;
        tempFiles.push(videoPath);

        // Step 2: Get transcript/captions
        console.log("📝 Getting YouTube captions...");
        try {
          transcript = await videoService.downloadYoutubeCaptions(youtubeUrl);
          console.log("✅ YouTube captions extracted successfully");
        } catch (captionError) {
          console.log(
            "⚠️ Captions not available, will use video analysis fallback"
          );

          // Fallback: analyze video content if captions fail
          try {
            transcript = await videoAnalysisService.analyzeVideoContent(
              videoPath,
              videoInfo.duration,
              prompt
            );
            console.log("✅ Video content analysis completed as fallback");
          } catch (analysisError) {
            console.error(
              "❌ Both captions and video analysis failed:",
              analysisError
            );

            // Last resort: create basic transcript
            transcript = {
              text: "Video content analysis not available",
              segments: [],
            };
          }
        }

        console.log("✅ YouTube video processed successfully");
        console.log(`📹 Video duration: ${videoInfo.duration}s`);
        console.log(
          `📝 Transcript preview: ${transcript.text.substring(0, 200)}...`
        );
      } catch (youtubeError) {
        console.error("❌ YouTube processing failed:", youtubeError);

        // Clean up any temp files created during failed YouTube processing
        await cleanupTempFiles(tempFiles);

        return res.status(400).json({
          success: false,
          error: `Failed to process YouTube video: ${youtubeError.message}. This might be due to video restrictions, private videos, or rate limiting. Please try again later or use a different video.`,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either a YouTube URL or upload a video file",
      });
    }

    console.log("📊 Video info:", videoInfo);
    console.log(
      "📝 Transcript preview:",
      transcript.text.substring(0, 300) + "..."
    );

    // Analyze transcript with AI
    console.log("🤖 Analyzing transcript with AI...");
    let moments;
    try {
      moments = await aiService.analyzeTranscriptWithTimestamps(
        transcript,
        prompt,
        Number.parseInt(videoInfo.duration)
      );
    } catch (aiAnalysisError) {
      console.error("❌ AI transcript analysis failed:", aiAnalysisError);

      // Clean up temp files
      await cleanupTempFiles(tempFiles);

      return res.status(500).json({
        success: false,
        error: `AI analysis failed: ${aiAnalysisError.message}. Please try again or use a different prompt.`,
      });
    }

    console.log("🎬 Moments to process:", JSON.stringify(moments, null, 2));

    if (!moments || moments.length === 0) {
      // Clean up temp files
      await cleanupTempFiles(tempFiles);

      return res.status(400).json({
        success: false,
        error:
          "No suitable moments found for GIF creation. Try a different prompt or video.",
      });
    }

    // Generate GIFs with better error handling
    const gifs = [];
    const errors = [];

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      console.log(`🎬 Processing GIF ${i + 1}/${moments.length}`);
      console.log(`⏱️ Time: ${moment.startTime}s - ${moment.endTime}s`);
      console.log(`💬 Caption: ${moment.caption}`);

      try {
        console.log(`🎨 Creating GIF ${i + 1}...`);
        const gif = await gifService.createGif(videoPath, moment);
        gifs.push(gif);
        console.log(`✅ GIF ${i + 1} created successfully (${gif.size})`);
      } catch (gifError) {
        console.error(`❌ Failed to create GIF ${i + 1}:`, gifError);
        errors.push(`GIF ${i + 1}: ${gifError.message}`);

        // Don't fail the entire process if one GIF fails
        // Continue with the next one
      }
    }

    // Clean up temporary files
    console.log("🗑️ Cleaning up temporary files...");
    await cleanupTempFiles(tempFiles);

    // Clean up browser instances
    try {
      await videoService.cleanup();
    } catch (cleanupError) {
      console.error("❌ Error during service cleanup:", cleanupError);
      // Don't fail the response for cleanup errors
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (gifs.length === 0) {
      console.log(
        `❌ No GIFs were created successfully. Errors: ${errors.join(", ")}`
      );
      return res.status(500).json({
        success: false,
        error: `Failed to create any GIFs. Errors: ${errors.join(", ")}`,
      });
    }

    console.log(
      `🎉 Successfully generated ${gifs.length} GIFs in ${processingTime}s!`
    );

    res.json({
      success: true,
      message: `Successfully generated ${gifs.length} GIFs`,
      gifs: gifs.map((gif) => ({
        id: gif.id,
        caption: gif.caption,
        startTime: gif.startTime,
        endTime: gif.endTime,
        size: gif.size,
        hasCaption: gif.hasCaption,
        url: `/gifs/${gif.id}`,
      })),
      processingTime: `${processingTime}s`,
      videoInfo,
      captionSource: youtubeUrl
        ? "YouTube Transcript + AI Analysis"
        : "Video Content Analysis",
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ GIF generation failed:", error);
    console.error("❌ Stack trace:", error.stack);

    // Clean up temporary files on error
    await cleanupTempFiles(tempFiles);

    // Clean up services
    try {
      await videoService.cleanup();
    } catch (cleanupError) {
      console.error("❌ Error during emergency cleanup:", cleanupError);
    }

    // Send error response
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate GIFs",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Helper function for cleanup
async function cleanupTempFiles(files) {
  if (!files || files.length === 0) return;

  console.log(`🗑️ Cleaning up ${files.length} temporary files...`);

  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        await fs.promises.unlink(file);
        console.log(`✅ Deleted temp file: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Failed to delete temp file ${file}:`, error);
    }
  }
}

export const getGif = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "GIF ID is required",
      });
    }

    const gifPath = path.join(process.cwd(), "output", `${id}.gif`);

    console.log(`📁 Looking for GIF: ${gifPath}`);

    if (!fs.existsSync(gifPath)) {
      console.log(`❌ GIF not found: ${gifPath}`);
      return res.status(404).json({
        success: false,
        error: "GIF not found",
      });
    }

    const stats = fs.statSync(gifPath);
    console.log(
      `✅ Serving GIF: ${gifPath} (${Math.round(stats.size / 1024)}KB)`
    );

    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Content-Length", stats.size);

    // Use stream for better memory management
    const stream = fs.createReadStream(gifPath);
    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("❌ Error streaming GIF:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Failed to stream GIF",
        });
      }
    });
  } catch (error) {
    console.error("❌ Error serving GIF:", error);
    console.error("❌ Stack trace:", error.stack);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to serve GIF",
      });
    }
  }
};

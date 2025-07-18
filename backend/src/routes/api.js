import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import authRoutes from './authRoutes.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads")
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only video files are allowed!"))
    }
  },
})

// Test route (doesn't require AI services)
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working",
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
    },
  })
})

// Lazy load controllers only when needed
router.post("/generate", upload.single("video"), async (req, res) => {
  try {
    // Dynamic import of controller
    const { generateGifs } = await import("../controllers/gifController.js")
    return generateGifs(req, res)
  } catch (error) {
    console.error("❌ Error loading GIF controller:", error)
    res.status(500).json({
      success: false,
      message: "Failed to load GIF generation service",
      error: error.message,
    })
  }
})

router.get("/gifs/:id", async (req, res) => {
  try {
    // Dynamic import of controller
    const { getGif } = await import("../controllers/gifController.js")
    return getGif(req, res)
  } catch (error) {
    console.error("❌ Error loading GIF controller:", error)
    res.status(500).json({
      success: false,
      message: "Failed to load GIF service",
      error: error.message,
    })
  }
})

router.get("/youtube-metadata", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url" });
    const { default: youtubeService } = await import("../services/youtubeService.js");
    const meta = await youtubeService.getVideoMetadata(url);
    res.json(meta);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use('/auth', authRoutes);

export default router
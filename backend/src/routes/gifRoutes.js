import express from "express"
import { generateGifs, getGif } from "../controllers/gifController.js"
import multer from "multer"

const router = express.Router()

// Multer configuration (using the same as in server.js, but without fileFilter)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads") // Assuming 'uploads' is the destination
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + file.originalname)
  },
})

const upload = multer({ storage: storage })

router.post("/gifs", upload.single("video"), generateGifs)
router.get("/gifs/:id", getGif)

export default router

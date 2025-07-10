import multer from "multer"
import path from "path"
import fs from "fs"

// Use environment variable for upload directory
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
  console.log(`📁 Created upload directory: ${uploadDir}`)
}

// Parse MAX_FILE_SIZE from environment variable
const maxFileSize = process.env.MAX_FILE_SIZE ? Number.parseInt(process.env.MAX_FILE_SIZE) : 50 * 1024 * 1024 // Default 50MB

console.log("📏 Upload Configuration:")
console.log("Upload Directory:", uploadDir)
console.log("Max File Size:", `${Math.round(maxFileSize / 1024 / 1024)}MB`)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const extension = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + extension)
  },
})

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv|m4v/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error("Only video files are allowed!"))
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: maxFileSize, // Use environment variable
  },
  fileFilter: fileFilter,
})

export default upload

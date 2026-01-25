import multer from "multer"

const storage = multer.memoryStorage()

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["application/pdf"]
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new ApiError("Invalid file type. Only PDF files are allowed."), false)
        }
        cb(null, true)
    },
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
})

export { upload }

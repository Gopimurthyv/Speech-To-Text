const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { createClient } = require("@deepgram/sdk");
const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const port = 3030;

// Middleware
app.use(cors());
app.use(express.json());

// Set up file upload with Multer (stores file in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Deepgram API Setup
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deepgram = new createClient(deepgramApiKey);

// ✅ Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully!" });
});

// ✅ Transcribe an Uploaded File
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    console.error("❌ No audio file uploaded");
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  try {
    // ✅ NEW Deepgram API Call for v3+
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      req.file.buffer,
      {
        model: "whisper-medium",
        smart_format: true,
      }
    );

    if (error) throw error;

    if (!result || !result.results) {
      throw new Error("Invalid Deepgram response");
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;

    return res.json({ transcript });
  } catch (error) {
    console.error("❌ Deepgram API Error:", error);
    return res
      .status(500)
      .json({ error: "Transcription failed", details: error.message });
  }
});

module.exports = app;

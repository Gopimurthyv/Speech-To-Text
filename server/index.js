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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Deepgram API Setup
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deepgram = createClient(deepgramApiKey);

// ✅ Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully!" });
});

// ✅ Transcribe an Uploaded File
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // console.log("✅ Received file:", req.file.originalname, req.file.mimetype);

    const audioBuffer = req.file.buffer;
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: "Invalid audio file" });
    }

    // Call Deepgram API
    const response = await deepgram.transcription.preRecorded(
      { buffer: audioBuffer, mimetype: req.file.mimetype },
      {
        model: "whisper-medium",
        language: "en",
        smart_format: true,
      }
    );

    if (!response || !response.results) {
      // console.error("❌ Deepgram API Error: No results returned");
      return res.status(500).json({ error: "Deepgram transcription failed" });
    }

    // Get the transcript
    const transcript =
      response.results.channels[0]?.alternatives[0]?.transcript ||
      "No transcript available";

    // console.log("✅ Transcription:", transcript);

    // ✅ Save transcription to Supabase
    const { data, error } = await supabase
      .from("audioTranscription") // Table Name
      .insert([
        {
          audioName: req.file.originalname,
          transcription: transcript,
        },
      ]);

    if (error) {
      console.error("❌ Supabase Insert Error:", error);
      return res.status(500).json({ error: "Database insertion failed" });
    }

    // console.log("✅ Saved to database:", data);

    res.json({ transcript });
  } catch (error) {
    console.error("❌ Error transcribing file:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Start server
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

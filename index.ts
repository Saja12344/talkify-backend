// import * as dotenv from "dotenv";
// dotenv.config({ path: "./.env" });
// import express from "express"
// import multer from "multer"
// import cors from "cors"
// import * as fs from "fs"
// import OpenAI from "openai"

// const app = express()
// app.use(cors())

// const upload = multer({ dest: "uploads/" })

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })

// app.post("/analyze", upload.single("audio"), async (req, res) => {
//   const filePath = req.file!.path

//   // 1️⃣ Whisper
//   const transcription = await openai.audio.transcriptions.create({
//     file: fs.createReadStream(filePath),
//     model: "whisper-1",
//     response_format: "verbose_json",
//   })

//   const text = transcription.text

//   // 2️⃣ GPT Analysis
//   const completion = await openai.chat.completions.create({
//     model: "gpt-4.1-mini",
//     messages: [
//       {
//         role: "user",
//         content: `
// Analyze this transcript and return JSON only.

// Transcript:
// "${text}"

// Return:
// {
//   "metrics": {
//     "confidence": number,
//     "pace": number,
//     "fillers": number,
//     "eyeContact": number,
//     "expressions": number
//   },
//   "timeline": [
//     {
//       "time": "mm:ss",
//       "type": "filler | pace | confidence | eyeContact | expressions",
//       "description": "string"
//     }
//   ]
// }
//         `,
//       },
//     ],
//     temperature: 0.2,
//   })

//   const analysis = JSON.parse(
//     completion.choices[0].message.content!
//   )

//   res.json({
//     transcript: text,
//     metrics: analysis.metrics,
//     timeline: analysis.timeline,
//   })
// })

// app.listen(4000, () => {
//   console.log("Backend running on http://localhost:4000")
// })
// // app.post("/analyze", (req, res) => {
// //   res.json({
// //     metrics: {
// //       confidence: 75,
// //       pace: 70,
// //       fillers: 6,
// //       eyeContact: 80,
// //       expressions: 72,
// //     },
// //     timeline: [
// //       {
// //         time: "00:20",
// //         type: "filler",
// //         description: "Used filler word",
// //       },
// //     ],
// //   });
// // });

import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json()); // ✅ مهم
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
app.post("/analyze-text", async (req, res) => {
  try {
    const { text, duration } = req.body as {
      text: string
      duration: number // بالثواني
    }

    if (!text || text.trim().length < 3 || !duration || duration <= 0) {
      return res.status(400).json({ error: "Invalid input" })
    }

    // 1️⃣ تنظيف النص
    const rawText = text.toLowerCase().trim()
    const words = rawText.split(/\s+/).filter(Boolean)
    const wordCount = words.length

    // 2️⃣ حساب السرعة (كلمات / ثانية)
    const wordsPerSecond = wordCount / duration

    // 3️⃣ filler words
    const fillerWords = [
      "um", "uh", "erm", "like", "you know",
      "aa", "aah", "aaa",
      "امم", "مم", "اا"
    ]

    let fillerCount = 0
    fillerWords.forEach((f) => {
      const regex = new RegExp(`\\b${f}\\b`, "g")
      const matches = rawText.match(regex)
      if (matches) fillerCount += matches.length
    })

    // 4️⃣ Speaking Pace (المنطق الجديد)
    let pace = 0
    let hesitationLevel: "normal" | "slow" | "very_slow"

    if (wordsPerSecond >= 0.5) {
      pace = 85
      hesitationLevel = "normal"
    } else if (wordsPerSecond >= 0.25) {
      pace = 50
      hesitationLevel = "slow"
    } else {
      pace = 25
      hesitationLevel = "very_slow"
    }

    // 5️⃣ Confidence
    let confidence = 60

    if (wordCount < 6) confidence -= 20
    if (hesitationLevel === "slow") confidence -= 15
    if (hesitationLevel === "very_slow") confidence -= 30

    confidence -= fillerCount * 6
    confidence = Math.max(10, Math.min(confidence, 95))

    // 6️⃣ Eye Contact (تقديري)
    let eyeContact = 75

    if (hesitationLevel === "slow") eyeContact -= 10
    if (hesitationLevel === "very_slow") eyeContact -= 25

    eyeContact = Math.max(40, Math.min(eyeContact, 90))

    // 7️⃣ Expressions (المعنى)
    const hasVerb =
      /(is|are|was|were|do|did|make|present|build|create|explain|talk|show)/.test(rawText)

    let expressions = 25
    if (wordCount >= 6 && hasVerb) expressions = 55
    if (wordCount >= 15 && hasVerb) expressions = 80

    // 8️⃣ Overall score
    const overallScore = Math.round(
      confidence * 0.35 +
      pace * 0.25 +
      eyeContact * 0.2 +
      expressions * 0.2
    )

    // 9️⃣ Timeline
    const timeline: any[] = []

    if (fillerCount > 0) {
      timeline.push({
        time: "00:15",
        type: "filler",
        description: `Used filler words ${fillerCount} times`,
      })
    }

    if (hesitationLevel !== "normal") {
      timeline.push({
        time: "00:20",
        type: "pace",
        description:
          hesitationLevel === "very_slow"
            ? "Very slow pace — long pauses detected"
            : "Slow speaking pace detected",
      })
    }

    if (expressions < 40) {
      timeline.push({
        time: "00:25",
        type: "expressions",
        description: "Speech lacked clear meaning or structure",
      })
    }

    // 🔟 Response
    return res.json({
      transcript: text,
      metrics: {
        overallScore,
        confidence,
        pace,
        fillers: fillerCount,
        eyeContact,
        expressions,
      },
      timeline,
    })
  } catch (err) {
    console.error("ANALYZE ERROR:", err)
    return res.status(500).json({ error: "Analysis failed" })
  }
})

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000")
})

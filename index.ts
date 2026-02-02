
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
// app.post("/analyze-text", async (req, res) => {
//   try {
//     const { text, duration } = req.body as {
//       text: string
//       duration: number // بالثواني
//     }

//     if (!text || text.trim().length < 3 || !duration || duration <= 0) {
//       return res.status(400).json({ error: "Invalid input" })
//     }

//     // 1️⃣ تنظيف النص
//     const rawText = text.toLowerCase().trim()
//     const words = rawText.split(/\s+/).filter(Boolean)
//     const wordCount = words.length

//     // 2️⃣ حساب السرعة (كلمات / ثانية)
//     const wordsPerSecond = wordCount / duration

//     // 3️⃣ filler words
//     const fillerWords = [
//       "um", "uh", "erm", "like", "you know",
//       "aa", "aah", "aaa",
//       "امم", "مم", "اا"
//     ]

//     let fillerCount = 0
//     fillerWords.forEach((f) => {
//       const regex = new RegExp(`\\b${f}\\b`, "g")
//       const matches = rawText.match(regex)
//       if (matches) fillerCount += matches.length
//     })

//     // 4️⃣ Speaking Pace (المنطق الجديد)
//     let pace = 0
//     let hesitationLevel: "normal" | "slow" | "very_slow"

//     if (wordsPerSecond >= 0.5) {
//       pace = 85
//       hesitationLevel = "normal"
//     } else if (wordsPerSecond >= 0.25) {
//       pace = 50
//       hesitationLevel = "slow"
//     } else {
//       pace = 25
//       hesitationLevel = "very_slow"
//     }

//     // 5️⃣ Confidence
//     let confidence = 60

//     if (wordCount < 6) confidence -= 20
//     if (hesitationLevel === "slow") confidence -= 15
//     if (hesitationLevel === "very_slow") confidence -= 30

//     confidence -= fillerCount * 6
//     confidence = Math.max(10, Math.min(confidence, 95))

//     // 6️⃣ Eye Contact (تقديري)
//     let eyeContact = 75

//     if (hesitationLevel === "slow") eyeContact -= 10
//     if (hesitationLevel === "very_slow") eyeContact -= 25

//     eyeContact = Math.max(40, Math.min(eyeContact, 90))

//     // 7️⃣ Expressions (المعنى)
//     const hasVerb =
//       /(is|are|was|were|do|did|make|present|build|create|explain|talk|show)/.test(rawText)

//     let expressions = 25
//     if (wordCount >= 6 && hasVerb) expressions = 55
//     if (wordCount >= 15 && hasVerb) expressions = 80

//     // 8️⃣ Overall score
//     const overallScore = Math.round(
//       confidence * 0.35 +
//       pace * 0.25 +
//       eyeContact * 0.2 +
//       expressions * 0.2
//     )

//     // 9️⃣ Timeline
//     const timeline: any[] = []

//     if (fillerCount > 0) {
//       timeline.push({
//         time: "00:15",
//         type: "filler",
//         description: `Used filler words ${fillerCount} times`,
//       })
//     }

//     if (hesitationLevel !== "normal") {
//       timeline.push({
//         time: "00:20",
//         type: "pace",
//         description:
//           hesitationLevel === "very_slow"
//             ? "Very slow pace — long pauses detected"
//             : "Slow speaking pace detected",
//       })
//     }

//     if (expressions < 40) {
//       timeline.push({
//         time: "00:25",
//         type: "expressions",
//         description: "Speech lacked clear meaning or structure",
//       })
//     }

//     // 🔟 Response
//     return res.json({
//       transcript: text,
//       metrics: {
//         overallScore,
//         confidence,
//         pace,
//         fillers: fillerCount,
//         eyeContact,
//         expressions,
//       },
//       timeline,
//     })
//   } catch (err) {
//     console.error("ANALYZE ERROR:", err)
//     return res.status(500).json({ error: "Analysis failed" })
//   }
// })
app.post("/analyze-text", async (req, res) => {
  try {
    const { text, duration } = req.body as {
      text: string
      duration: number // seconds
    }

    if (!text || text.trim().length < 3 || !duration || duration <= 0) {
      return res.status(400).json({ error: "Invalid input" })
    }

    const rawText = text.toLowerCase().trim()
    const words = rawText.split(/\s+/).filter(Boolean)
    const wordCount = words.length
    const minutes = duration / 60
    const wpm = wordCount / minutes

    // =========================
    // 🚨 Minimum Sample Rule
    // =========================
    if (wordCount < 8 || duration < 5) {
      return res.json({
        transcript: text,
        metrics: {
          overallScore: 25,
          confidence: 25,
          pace: 40,
          fillers: 0,
          eyeContact: 50,
          expressions: 20,
          wpm: Math.round(wpm),
        },
        timeline: [
          {
            time: "00:03",
            type: "length",
            description: "Speech sample too short for accurate evaluation",
          },
        ],
      })
    }

    // =========================
    // 1️⃣ Pace (WPM based)
    // =========================
    let pace = 0

    if (wpm >= 130 && wpm <= 170) pace = 85
    else if (wpm >= 100 && wpm < 130) pace = 65
    else if (wpm > 170 && wpm <= 200) pace = 60
    else if (wpm < 100) pace = 35
    else pace = 30

    // =========================
    // 2️⃣ Filler Ratio
    // =========================
    const fillerWords = [
      "um", "uh", "erm", "like", "you know",
      "امم", "مم", "اا", "يعني"
    ]

    let fillerCount = 0
    fillerWords.forEach((f) => {
      const regex = new RegExp(`\\b${f}\\b`, "g")
      const matches = rawText.match(regex)
      if (matches) fillerCount += matches.length
    })

    const fillerRatio = fillerCount / wordCount
    const fillerScore = Math.max(0, 100 - fillerRatio * 300)

    // =========================
    // 3️⃣ Vocabulary Diversity
    // =========================
    const uniqueWords = new Set(words)
    const diversityRatio = uniqueWords.size / wordCount

    let vocabularyScore = 40
    if (diversityRatio > 0.7) vocabularyScore = 85
    else if (diversityRatio > 0.5) vocabularyScore = 65

    // =========================
    // 4️⃣ Structure
    // =========================
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0)
    const avgSentenceLength = wordCount / sentences.length

    let structureScore = 30
    if (sentences.length >= 3 && avgSentenceLength >= 6) structureScore = 80
    else if (sentences.length >= 2) structureScore = 55

    // =========================
    // 5️⃣ Confidence
    // =========================
    let confidence =
      vocabularyScore * 0.3 +
      structureScore * 0.3 +
      fillerScore * 0.4

    confidence = Math.round(Math.max(15, Math.min(95, confidence)))

    // =========================
    // 6️⃣ Expressions
    // =========================
    let expressions =
      vocabularyScore * 0.5 +
      structureScore * 0.5

    expressions = Math.round(expressions)

    // =========================
    // 7️⃣ Eye Contact (estimated)
    // =========================
    let eyeContact = Math.round(60 + (confidence - 50) * 0.4)
    eyeContact = Math.max(40, Math.min(90, eyeContact))

    // =========================
    // 8️⃣ Overall Score
    // =========================
    let overallScore = Math.round(
      confidence * 0.35 +
      pace * 0.25 +
      expressions * 0.2 +
      eyeContact * 0.2
    )

    // =========================
    // 🧠 Length-Based Score Cap
    // =========================

    if (wordCount < 15) {
      overallScore = Math.min(overallScore, 60)
    }

    if (wordCount < 25) {
      overallScore = Math.min(overallScore, 75)
    }

    // =========================
    // Timeline
    // =========================
    const timeline: any[] = []

    if (fillerRatio > 0.05) {
      timeline.push({
        time: "00:10",
        type: "filler",
        description: `High filler usage (${fillerCount} times)`
      })
    }

    if (pace < 50) {
      timeline.push({
        time: "00:15",
        type: "pace",
        description: "Speaking pace needs improvement"
      })
    }

    if (structureScore < 50) {
      timeline.push({
        time: "00:20",
        type: "structure",
        description: "Speech lacks clear structure"
      })
    }

    return res.json({
      transcript: text,
      metrics: {
        overallScore,
        confidence,
        pace,
        fillers: fillerCount,
        eyeContact,
        expressions,
        wpm: Math.round(wpm),
        vocabularyDiversity: Number(diversityRatio.toFixed(2)),
      },
      timeline,
    })

  } catch (err) {
    console.error("ANALYZE ERROR:", err)
    return res.status(500).json({ error: "Analysis failed" })
  }
})


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

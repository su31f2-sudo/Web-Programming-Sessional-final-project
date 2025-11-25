const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==================== GOOGLE GEMINI AI CLIENT ====================
const ai = new GoogleGenAI({
  apiKey: "AIzaSyAic36onhgP8ufKDFrAiERCmb0dNBQtY3Q", // store key in .env
});

// ==================== MYSQL CONNECTION ====================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ai_notes",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    throw err;
  }
  console.log("MySQL connected successfully");
});

// ==================== AI PROCESSING API ====================
app.post("/processNote", async (req, res) => {
  const { noteId, processType, content } = req.body;

  if (!processType || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const prompts = {
      summary: `Please provide a concise summary of the following text:\n\n${content}`,
      bullet_points: `Convert the following text into clear bullet points:\n\n${content}`,
      study_questions: `Generate 5-7 study questions based on the following content:\n\n${content}`,
    };

    const prompt = prompts[processType] || content;

    // Google Gemini call
    const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
      contents: prompt,
    });

    const processedContent = result.text;

    // Save to DB if noteId is provided
    if (noteId && noteId !== 0) {
      const sql = `
        INSERT INTO ai_processing (noteId, processType, originalContent, processedContent)
        VALUES (?, ?, ?, ?)
      `;
      db.query(
        sql,
        [noteId, processType, content, processedContent],
        (err, resultDb) => {
          if (err) {
            console.error("Error saving AI processing:", err);
            return res.json({
              message: "Note processed (not saved to history)",
              processedContent,
              success: true,
            });
          }
          res.json({
            message: "Note processed and saved",
            processedContent,
            processId: resultDb.insertId,
            success: true,
          });
        }
      );
    } else {
      res.json({
        message: "Note processed successfully",
        processedContent,
        success: true,
      });
    }
  } catch (error) {
    console.error("Gemini AI error:", error);

    const fallbackResponses = {
      summary: `**AI Summary:** ${content.substring(
        0,
        50
      )}... [Gemini AI unavailable]`,
      bullet_points: `**Bullet Points:** • Main ideas extracted from note [Gemini AI unavailable]`,
      study_questions: `**Study Questions:** 1. What is the main idea? 2. How does it relate to other topics? [Gemini AI unavailable]`,
    };

    const fallbackContent =
      fallbackResponses[processType] ||
      "AI processing completed. [Gemini AI unavailable]";

    res.json({
      message: "Note processed with fallback",
      processedContent: fallbackContent,
      success: true,
    });
  }
});

// ==================== AI HISTORY ====================

// Get AI processing history for a note
app.get("/getAIHistory/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId, 10);
  const sql = `
    SELECT processId, processType, originalContent, processedContent,
           DATE_FORMAT(processedAt, '%Y-%m-%d %H:%i:%s') AS processedAt
    FROM ai_processing
    WHERE noteId = ?
    ORDER BY processedAt DESC
  `;
  db.query(sql, [noteId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// Delete AI processing history
app.delete("/deleteAIHistory/:processId", (req, res) => {
  const processId = parseInt(req.params.processId, 10);
  const sql = "DELETE FROM ai_processing WHERE processId = ?";
  db.query(sql, [processId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "AI history not found" });
    res.json({ message: "AI history deleted successfully", success: true });
  });
});

// ==================== NOTES CRUD ====================

// Get all notes for a user
app.get("/getNotes/:userId", (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const sql = `
    SELECT noteId, userId, title, content,
           DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
           DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') AS updatedAt
    FROM notes
    WHERE userId = ?
    ORDER BY updatedAt DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// Get single note
app.get("/getNote/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId, 10);
  const sql = `
    SELECT noteId, userId, title, content,
           DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
           DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') AS updatedAt
    FROM notes
    WHERE noteId = ?
  `;
  db.query(sql, [noteId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(404).json({ error: "Note not found" });
    res.json(results[0]);
  });
});

// Create note
app.post("/createNote", (req, res) => {
  const { userId, title, content } = req.body;
  if (!userId || !title || !content)
    return res.status(400).json({ error: "Missing required fields" });

  const sql = "INSERT INTO notes (userId, title, content) VALUES (?, ?, ?)";
  db.query(sql, [userId, title, content], (err, result) => {
    if (err) {
      if (err.code === "ER_NO_REFERENCED_ROW_2")
        return res.status(400).json({ error: "Invalid user ID" });
      return res.status(500).json({ error: "Database error" });
    }
    res.json({
      message: "Note created",
      noteId: result.insertId,
      success: true,
    });
  });
});

// Update note
app.put("/updateNote/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId, 10);
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: "Missing required fields" });

  const sql =
    "UPDATE notes SET title = ?, content = ?, updatedAt = CURRENT_TIMESTAMP WHERE noteId = ?";
  db.query(sql, [title, content, noteId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note updated", success: true });
  });
});

// Delete note
app.delete("/deleteNote/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId, 10);
  const sql = "DELETE FROM notes WHERE noteId = ?";
  db.query(sql, [noteId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted", success: true });
  });
});

// ==================== START SERVER ====================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

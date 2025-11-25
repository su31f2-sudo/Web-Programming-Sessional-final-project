const express = require("express");
const mysql = require("mysql");
const port = 5000;
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Create connection with MySQL server
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ai_notes", // Changed to ai_notes database
});

db.connect((err) => {
  if (err) {
    console.log("Error Connecting to the database: ", err);
    throw err;
  }
  console.log("MySQL server connected...");
});

// ==================== NOTES CRUD APIs ====================

// GET - Get all notes for a user
app.get("/getNotes/:userId", (req, res) => {
  const userId = parseInt(req.params.userId);

  const sql = `
    SELECT noteId, userId, title, content, 
           DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') as createdAt,
           DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') as updatedAt
    FROM notes 
    WHERE userId = ? 
    ORDER BY updatedAt DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.log("Error fetching notes: ", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// GET - Get single note by ID
app.get("/getNote/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId);

  const sql = `
    SELECT noteId, userId, title, content, 
           DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') as createdAt,
           DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') as updatedAt
    FROM notes 
    WHERE noteId = ?
  `;

  db.query(sql, [noteId], (err, results) => {
    if (err) {
      console.log("Error fetching note: ", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(results[0]);
  });
});

// POST - Create new note
app.post("/createNote", (req, res) => {
  const { userId, title, content } = req.body;

  if (!userId || !title || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO notes (userId, title, content) 
    VALUES (?, ?, ?)
  `;

  db.query(sql, [userId, title, content], (err, result) => {
    if (err) {
      console.log("Error creating note: ", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      message: "Note created successfully",
      noteId: result.insertId,
      success: true
    });
  });
});

// PUT - Update existing note
app.put("/updateNote/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId);
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    UPDATE notes 
    SET title = ?, content = ?, updatedAt = CURRENT_TIMESTAMP 
    WHERE noteId = ?
  `;

  db.query(sql, [title, content, noteId], (err, result) => {
    if (err) {
      console.log("Error updating note: ", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({
      message: "Note updated successfully",
      success: true
    });
  });
});

// DELETE - Delete note
app.delete("/deleteNote/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId);

  const sql = "DELETE FROM notes WHERE noteId = ?";

  db.query(sql, [noteId], (err, result) => {
    if (err) {
      console.log("Error deleting note: ", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({
      message: "Note deleted successfully",
      success: true
    });
  });
});

// ==================== AI PROCESSING APIs ====================

// POST - Process note with AI (summary, bullet points, questions)
app.post("/processNote", (req, res) => {
  const { noteId, processType, content } = req.body;

  if (!noteId || !processType || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Simulate AI processing (in real app, integrate with OpenAI API, etc.)
  const processNoteWithAI = (content, type) => {
    // This is where you'd integrate with actual AI services
    // For now, we'll return simulated responses
    
    const simulations = {
      summary: `**AI Summary:** This is an AI-generated summary of your note. The main topics covered include ${content.substring(0, 50)}... and other important concepts discussed in the original content.`,
      
      bullet_points: `**Key Points:**\n• Main idea extracted from your note\n• Important supporting details\n• Key concepts and definitions\n• Practical applications or examples\n• Summary of conclusions`,
      
      study_questions: `**Study Questions:**\n1. What is the main concept discussed in this note?\n2. How does this relate to other topics you've studied?\n3. What are the practical applications of this information?\n4. Can you explain this concept in your own words?\n5. What questions would you ask to deepen your understanding?`
    };

    return simulations[type] || "AI processing completed.";
  };

  const processedContent = processNoteWithAI(content, processType);

  // Save AI processing history
  const sql = `
    INSERT INTO ai_processing (noteId, processType, originalContent, processedContent) 
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [noteId, processType, content, processedContent], (err, result) => {
    if (err) {
      console.log("Error saving AI processing: ", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      message: "Note processed successfully",
      processedContent: processedContent,
      processId: result.insertId,
      success: true
    });
  });
});

// GET - Get AI processing history for a note
app.get("/getAIHistory/:noteId", (req, res) => {
  const noteId = parseInt(req.params.noteId);

  const sql = `
    SELECT processId, processType, originalContent, processedContent,
           DATE_FORMAT(processedAt, '%Y-%m-%d %H:%i:%s') as processedAt
    FROM ai_processing 
    WHERE noteId = ? 
    ORDER BY processedAt DESC
  `;

  db.query(sql, [noteId], (err, results) => {
    if (err) {
      console.log("Error fetching AI history: ", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ==================== EXISTING APIs (KEPT FOR REFERENCE) ====================

app.get("/getPosts", (req, res) => {
  let sqlForPosts =
    "SELECT posts.postId, users.userName AS postedUserName, users.userImage as userImage, posts.postedTime, posts.postText, posts.postImageUrl FROM posts INNER JOIN users ON posts.postedUserId = users.userId ORDER BY posts.postedTime DESC";
  let query = db.query(sqlForPosts, (err, results) => {
    if (err) {
      console.log("Error Connecting to the database: ", err);
      throw err;
    }
    res.send(results);
  });
});

app.get("/getcomments/:postId", (req, res) => {
  let id = parseInt(req.params.postId);
  let sqlForComment = `SELECT comments.commentOfPostId, users.userName as commentedUsername, users.userImage as commentedUserImage, comments.commentOfUserId, comments.commentTime, comments.commentText FROM comments INNER JOIN users ON users.userId = comments.commentOfUserId WHERE comments.commentOfPostId = ${id} ORDER BY comments.commentTime ASC`;

  let query = db.query(sqlForComment, (err, comments) => {
    if (err) {
      console.log("Error Connecting to the database: ", err);
      throw err;
    }
    res.send(comments);
  });
});

app.post("/getUserInfo", (req, res) => {
  const { userId, password } = req.body;
  const getUserInfoSql = `SELECT userId, userName, userImage FROM users WHERE users.userId = ? AND users.userPassword = ?`;
  
  let query = db.query(getUserInfoSql, [userId, password], (err, result) => {
    if (err) {
      console.log("Error getting user info from the database: ", err);
      throw err;
    }
    res.send(result);
  });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
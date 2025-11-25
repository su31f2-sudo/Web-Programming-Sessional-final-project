// DOM SELECTORS
const noteEditor = document.getElementById("note-editor");
const noteTitle = document.getElementById("note-title");
const noteContent = document.getElementById("note-content");
const notesGrid = document.getElementById("notes-grid");

const addNoteBtn = document.getElementById("add-note-btn");
const cancelBtn = document.getElementById("cancel-btn");
const saveBtn = document.getElementById("save-btn");

const summarizeBtn = document.getElementById("summarize-btn");
const bulletpointsBtn = document.getElementById("bulletpoints-btn");
const questionsBtn = document.getElementById("questions-btn");

const aiOutput = document.getElementById("ai-output");
const aiOutputTitle = document.getElementById("ai-output-title");
const aiOutputContent = document.getElementById("ai-output-content");
const copyAIOutput = document.getElementById("copy-ai-output");

const API_BASE = "http://localhost:5000";
let currentUserId = 1;
let isEditing = false;
let currentNoteId = null;

// OPEN EDITOR
function openEditor(noteId = null) {
  noteEditor.style.display = "block";
  aiOutput.style.display = "none";

  if (noteId) {
    isEditing = true;
    currentNoteId = noteId;
    document.getElementById("editor-title").textContent = "Edit Note";

    fetch(`${API_BASE}/getNote/${noteId}`)
      .then((res) => res.json())
      .then((note) => {
        noteTitle.value = note.title;
        noteContent.value = note.content;
      });
  } else {
    isEditing = false;
    currentNoteId = null;
    document.getElementById("editor-title").textContent = "New Note";
    noteTitle.value = "";
    noteContent.value = "";
  }
}

// CLOSE EDITOR
function closeEditor() {
  noteEditor.style.display = "none";
}

// SAVE NOTE
function saveNote() {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title || !content) {
    alert("Please fill in both title and content.");
    return;
  }

  if (isEditing) {
    fetch(`${API_BASE}/updateNote/${currentNoteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          loadNotes();
          closeEditor();
        }
      });
  } else {
    fetch(`${API_BASE}/createNote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, title, content }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          loadNotes();
          closeEditor();
        }
      });
  }
}

// DELETE NOTE
function deleteNote(id) {
  if (!confirm("Delete this note?")) return;

  fetch(`${API_BASE}/deleteNote/${id}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) loadNotes();
    });
}

// LOAD NOTES
function loadNotes() {
  fetch(`${API_BASE}/getNotes/${currentUserId}`)
    .then((res) => res.json())
    .then((notes) => {
      notesGrid.innerHTML = "";

      notes.forEach((note) => {
        const div = document.createElement("div");
        div.className = "note-card";
        div.dataset.id = note.noteId;

        const formattedDate = new Date(note.updatedAt).toLocaleDateString(
          "en-US"
        );

        div.innerHTML = `
                    <div class="note-header">
                        <div>
                            <div class="note-title">${note.title}</div>
                            <div class="note-date">Updated: ${formattedDate}</div>
                        </div>
                        <div class="note-actions">
                            <button class="note-action edit"><i class="fas fa-edit"></i></button>
                            <button class="note-action delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="note-content">${note.content}</div>
                `;

        div.querySelector(".edit").onclick = (e) => {
          e.stopPropagation();
          openEditor(note.noteId);
        };

        div.querySelector(".delete").onclick = (e) => {
          e.stopPropagation();
          deleteNote(note.noteId);
        };

        div.onclick = () => openEditor(note.noteId);

        notesGrid.appendChild(div);
      });
    });
}

// AI PROCESS
function processNoteWithAI(type) {
  if (!noteContent.value.trim()) {
    alert("Write a note first.");
    return;
  }

  const content = noteContent.value;

  const titles = {
    summary: "AI Summary",
    bullet_points: "Bullet Points",
    study_questions: "Study Questions",
  };

  aiOutputTitle.textContent = titles[type];
  aiOutput.style.display = "block";
  aiOutputContent.innerHTML = "Processing...";

  fetch(`${API_BASE}/processNote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ processType: type, content }),
  })
    .then((res) => res.json())
    .then((result) => {
      aiOutputContent.innerHTML = result.success
        ? result.processedContent.replace(/\n/g, "<br>")
        : "AI Error";
    });
}

copyAIOutput.onclick = () => {
  navigator.clipboard.writeText(aiOutputContent.innerText);
  alert("Copied!");
};

// EVENTS
addNoteBtn.onclick = () => openEditor();
cancelBtn.onclick = () => closeEditor();
saveBtn.onclick = () => saveNote();

summarizeBtn.onclick = () => processNoteWithAI("summary");
bulletpointsBtn.onclick = () => processNoteWithAI("bullet_points");
questionsBtn.onclick = () => processNoteWithAI("study_questions");

document.addEventListener("DOMContentLoaded", loadNotes);

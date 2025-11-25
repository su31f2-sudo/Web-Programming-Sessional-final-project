// Configuration
const API_BASE = 'http://localhost:5000';
const CURRENT_USER_ID = 1;

// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const noteEditor = document.getElementById('note-editor');
const aiOutput = document.getElementById('ai-output');
const emptyState = document.getElementById('empty-state');
const addNoteBtn = document.getElementById('add-note-btn');
const emptyAddBtn = document.getElementById('empty-add-btn');
const saveBtn = document.getElementById('save-btn');
const saveBtnText = document.getElementById('save-btn-text');
const saveBtnLoading = document.getElementById('save-btn-loading');
const cancelBtn = document.getElementById('cancel-btn');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const aiOutputContent = document.getElementById('ai-output-content');
const aiOutputTitle = document.getElementById('ai-output-title');
const copyAiOutput = document.getElementById('copy-ai-output');
const closeAiOutput = document.getElementById('close-ai-output');
const searchInput = document.getElementById('search-input');

// AI Feature Buttons
const summarizeBtn = document.getElementById('summarize-btn');
const bulletpointsBtn = document.getElementById('bulletpoints-btn');
const questionsBtn = document.getElementById('questions-btn');

// State
let currentNoteId = null;
let isEditing = false;
let allNotes = [];

// Event Listeners
addNoteBtn.addEventListener('click', () => {
    openEditor();
});

emptyAddBtn.addEventListener('click', () => {
    openEditor();
});

saveBtn.addEventListener('click', () => {
    saveNote();
});

cancelBtn.addEventListener('click', () => {
    closeEditor();
});

copyAiOutput.addEventListener('click', () => {
    const textToCopy = aiOutputContent.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('AI output copied to clipboard!');
    });
});

closeAiOutput.addEventListener('click', () => {
    aiOutput.style.display = 'none';
});

searchInput.addEventListener('input', (e) => {
    filterNotes(e.target.value);
});

// AI Feature Event Listeners
summarizeBtn.addEventListener('click', () => {
    processNoteWithAI('summary');
});

bulletpointsBtn.addEventListener('click', () => {
    processNoteWithAI('bullet_points');
});

questionsBtn.addEventListener('click', () => {
    processNoteWithAI('study_questions');
});

// Functions
function openEditor(noteId = null) {
    noteEditor.style.display = 'block';
    aiOutput.style.display = 'none';
    
    if (noteId) {
        isEditing = true;
        currentNoteId = noteId;
        document.getElementById('editor-title').textContent = 'Edit Note';
        
        // Fetch note data from API
        fetch(`${API_BASE}/getNote/${noteId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(note => {
                noteTitle.value = note.title;
                noteContent.value = note.content;
            })
            .catch(error => {
                console.error('Error fetching note:', error);
                alert('Error loading note');
            });
    } else {
        isEditing = false;
        currentNoteId = null;
        document.getElementById('editor-title').textContent = 'New Note';
        noteTitle.value = '';
        noteContent.value = '';
    }
    
    noteEditor.scrollIntoView({ behavior: 'smooth' });
}

function closeEditor() {
    noteEditor.style.display = 'none';
    currentNoteId = null;
    isEditing = false;
}

function setSaveButtonLoading(isLoading) {
    if (isLoading) {
        saveBtnText.style.display = 'none';
        saveBtnLoading.style.display = 'inline-block';
        saveBtn.disabled = true;
    } else {
        saveBtnText.style.display = 'inline-block';
        saveBtnLoading.style.display = 'none';
        saveBtn.disabled = false;
    }
}

function saveNote() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    
    if (!title || !content) {
        alert('Please fill in both title and content.');
        return;
    }
    
    setSaveButtonLoading(true);
    
    if (isEditing) {
        // Update existing note
        fetch(`${API_BASE}/updateNote/${currentNoteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                loadNotes();
                closeEditor();
            } else {
                alert('Error updating note: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error updating note:', error);
            alert('Error updating note. Make sure the note exists.');
        })
        .finally(() => {
            setSaveButtonLoading(false);
        });
    } else {
        // Create new note
        fetch(`${API_BASE}/createNote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                userId: CURRENT_USER_ID, 
                title, 
                content 
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                loadNotes();
                closeEditor();
                // Set the current note ID for AI processing
                currentNoteId = result.noteId;
            } else {
                alert('Error creating note: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error creating note:', error);
            alert('Error creating note. Make sure user ID 1 exists in the database.');
        })
        .finally(() => {
            setSaveButtonLoading(false);
        });
    }
}

function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        fetch(`${API_BASE}/deleteNote/${noteId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                loadNotes();
                closeEditor();
                aiOutput.style.display = 'none';
            } else {
                alert('Error deleting note: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error deleting note:', error);
            alert('Error deleting note');
        });
    }
}

function loadNotes() {
    fetch(`${API_BASE}/getNotes/${CURRENT_USER_ID}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(notes => {
            allNotes = notes;
            renderNotes(notes);
            
            // Show empty state if no notes
            if (notes.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error loading notes:', error);
            notesGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Notes</h3><p>Please check if the server is running and the database is properly set up.</p></div>';
        });
}

function renderNotes(notes) {
    notesGrid.innerHTML = '';
    
    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.setAttribute('data-id', note.noteId);
        
        const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        noteCard.innerHTML = `
            <div class="note-header">
                <div>
                    <div class="note-title">${escapeHtml(note.title)}</div>
                    <div class="note-date">Updated: ${formattedDate}</div>
                </div>
                <div class="note-actions">
                    <button class="note-action edit"><i class="fas fa-edit"></i></button>
                    <button class="note-action delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="note-content">${escapeHtml(note.content)}</div>
        `;
        
        // Add event listeners
        noteCard.querySelector('.note-action.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditor(note.noteId);
        });
        
        noteCard.querySelector('.note-action.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.noteId);
        });
        
        noteCard.addEventListener('click', function(e) {
            if (!e.target.closest('.note-actions')) {
                openEditor(note.noteId);
            }
        });
        
        notesGrid.appendChild(noteCard);
    });
}

function filterNotes(searchTerm) {
    if (!searchTerm) {
        renderNotes(allNotes);
        return;
    }
    
    const filteredNotes = allNotes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    renderNotes(filteredNotes);
    
    // Show empty state if no results
    if (filteredNotes.length === 0) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>No Notes Found</h3>
            <p>No notes match your search for "${searchTerm}".</p>
        `;
    } else {
        emptyState.style.display = 'none';
    }
}

// Updated AI Processing Function with Google Gemini
function processNoteWithAI(type) {
    if (!noteContent.value.trim()) {
        alert("Write a note first.");
        return;
    }

    const content = noteContent.value;
    const noteId = currentNoteId || 0;

    const titles = {
        summary: "AI Summary",
        bullet_points: "Bullet Points", 
        study_questions: "Study Questions"
    };

    aiOutputTitle.textContent = titles[type];
    aiOutput.style.display = "block";
    aiOutputContent.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div><p style="margin-top: 15px;">AI is processing your note with Google Gemini...</p></div>';
    aiOutput.scrollIntoView({ behavior: 'smooth' });

    fetch(`${API_BASE}/processNote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            processType: type, 
            content: content,
            noteId: noteId 
        }),
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Network response was not ok');
        }
        return res.json();
    })
    .then((result) => {
        if (result.success) {
            aiOutputContent.innerHTML = result.processedContent.replace(/\n/g, "<br>");
        } else {
            aiOutputContent.innerHTML = "AI Error: " + (result.error || "Unknown error");
        }
    })
    .catch(error => {
        console.error('Error processing note:', error);
        aiOutputContent.innerHTML = "Error connecting to AI service. Please check if the server is running.";
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Load notes when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
});
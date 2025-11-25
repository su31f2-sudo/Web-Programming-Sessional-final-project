-- Drop and recreate the database to ensure clean setup
DROP DATABASE IF EXISTS ai_notes;
CREATE DATABASE ai_notes;
USE ai_notes;

-- Users table
CREATE TABLE users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    userName VARCHAR(100) NOT NULL,
    userEmail VARCHAR(255) UNIQUE NOT NULL,
    userPassword VARCHAR(255) NOT NULL,
    userImage VARCHAR(500) DEFAULT 'default_avatar.png',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE notes (
    noteId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- AI processing history table
CREATE TABLE ai_processing (
    processId INT AUTO_INCREMENT PRIMARY KEY,
    noteId INT NOT NULL,
    processType ENUM('summary', 'bullet_points', 'study_questions') NOT NULL,
    originalContent TEXT NOT NULL,
    processedContent TEXT NOT NULL,
    processedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (noteId) REFERENCES notes(noteId) ON DELETE CASCADE
);

-- Insert sample user (THIS IS CRITICAL - userId will be 1)
INSERT INTO users (userName, userEmail, userPassword) VALUES 
('John Doe', 'john@example.com', 'password123');

-- Insert sample notes for user 1
INSERT INTO notes (userId, title, content) VALUES 
(1, 'Machine Learning Basics', 'Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data without being explicitly programmed. There are three main types: supervised learning, unsupervised learning, and reinforcement learning.'),
(1, 'Neural Networks', 'Neural networks are computing systems inspired by the human brain. They consist of layers of interconnected nodes (neurons) that process information. Deep learning uses neural networks with many layers (deep neural networks).');

-- Verify the data was inserted
SELECT * FROM users;
SELECT * FROM notes;
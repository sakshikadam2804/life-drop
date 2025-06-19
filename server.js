const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// SQLite Database setup
const dbPath = path.join(__dirname, 'lifedrop.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ SQLite connection error:', err);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table for admin authentication
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Donors table
    db.run(`
        CREATE TABLE IF NOT EXISTS donors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type TEXT DEFAULT 'donor',
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            blood_type TEXT NOT NULL,
            preferred_date DATE NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Receivers table
    db.run(`
        CREATE TABLE IF NOT EXISTS receivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type TEXT DEFAULT 'receiver',
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            blood_type TEXT NOT NULL,
            preferred_date DATE NOT NULL,
            urgency TEXT NOT NULL,
            hospital TEXT NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create default admin user
    createDefaultAdmin();
}

// Create default admin user
async function createDefaultAdmin() {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    db.run(`
        INSERT OR IGNORE INTO users (email, password, role) 
        VALUES (?, ?, ?)
    `, ['admin@lifedrop.com', hashedPassword, 'admin'], (err) => {
        if (err) {
            console.error('Error creating admin user:', err);
        } else {
            console.log('✅ Default admin user ready: admin@lifedrop.com / admin123');
        }
    });
}

// JWT middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'lifedrop-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Validation middleware
const validateDonor = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
    body('bloodType').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type required'),
    body('preferredDate').isISO8601().withMessage('Valid date required')
];

const validateReceiver = [
    ...validateDonor,
    body('urgency').isIn(['High', 'Medium', 'Low']).withMessage('Valid urgency level required'),
    body('hospital').trim().isLength({ min: 2 }).withMessage('Hospital name required')
];

const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// API Routes

// Admin login
app.post('/api/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const { email, password } = req.body;

        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Login failed' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'lifedrop-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Submit donor form
app.post('/api/donors', validateDonor, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const { name, email, phone, bloodType, preferredDate, message } = req.body;

        db.run(`
            INSERT INTO donors (name, email, phone, blood_type, preferred_date, message)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, email, phone, bloodType, preferredDate, message || ''], function(err) {
            if (err) {
                console.error('Donor registration error:', err);
                return res.status(500).json({ error: 'Registration failed' });
            }

            res.status(201).json({
                message: 'Donor registration successful',
                donor: {
                    id: this.lastID,
                    name,
                    bloodType,
                    preferredDate
                }
            });
        });
    } catch (error) {
        console.error('Donor registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Submit receiver form
app.post('/api/receivers', validateReceiver, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const { name, email, phone, bloodType, preferredDate, urgency, hospital, message } = req.body;

        db.run(`
            INSERT INTO receivers (name, email, phone, blood_type, preferred_date, urgency, hospital, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, email, phone, bloodType, preferredDate, urgency, hospital, message || ''], function(err) {
            if (err) {
                console.error('Receiver registration error:', err);
                return res.status(500).json({ error: 'Request submission failed' });
            }

            res.status(201).json({
                message: 'Blood request submitted successfully',
                receiver: {
                    id: this.lastID,
                    name,
                    bloodType,
                    urgency
                }
            });
        });
    } catch (error) {
        console.error('Receiver registration error:', error);
        res.status(500).json({ error: 'Request submission failed' });
    }
});

// Get all donors (admin only)
app.get('/api/donors', authenticateToken, (req, res) => {
    db.all('SELECT * FROM donors ORDER BY submitted_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Get donors error:', err);
            return res.status(500).json({ error: 'Failed to fetch donors' });
        }
        
        // Convert snake_case to camelCase for frontend compatibility
        const donors = rows.map(row => ({
            _id: row.id,
            userType: row.user_type,
            name: row.name,
            email: row.email,
            phone: row.phone,
            bloodType: row.blood_type,
            preferredDate: row.preferred_date,
            message: row.message,
            status: row.status,
            submittedAt: row.submitted_at
        }));
        
        res.json(donors);
    });
});

// Get all receivers (admin only)
app.get('/api/receivers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM receivers ORDER BY submitted_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Get receivers error:', err);
            return res.status(500).json({ error: 'Failed to fetch receivers' });
        }
        
        // Convert snake_case to camelCase for frontend compatibility
        const receivers = rows.map(row => ({
            _id: row.id,
            userType: row.user_type,
            name: row.name,
            email: row.email,
            phone: row.phone,
            bloodType: row.blood_type,
            preferredDate: row.preferred_date,
            urgency: row.urgency,
            hospital: row.hospital,
            message: row.message,
            status: row.status,
            submittedAt: row.submitted_at
        }));
        
        res.json(receivers);
    });
});

// Update donor status (admin only)
app.patch('/api/donors/:id', authenticateToken, (req, res) => {
    const { status } = req.body;
    const donorId = req.params.id;

    db.run('UPDATE donors SET status = ? WHERE id = ?', [status, donorId], function(err) {
        if (err) {
            console.error('Update donor error:', err);
            return res.status(500).json({ error: 'Failed to update donor' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        res.json({ message: 'Donor status updated successfully' });
    });
});

// Update receiver status (admin only)
app.patch('/api/receivers/:id', authenticateToken, (req, res) => {
    const { status } = req.body;
    const receiverId = req.params.id;

    db.run('UPDATE receivers SET status = ? WHERE id = ?', [status, receiverId], function(err) {
        if (err) {
            console.error('Update receiver error:', err);
            return res.status(500).json({ error: 'Failed to update receiver' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Receiver not found' });
        }

        res.json({ message: 'Receiver status updated successfully' });
    });
});

// Get dashboard statistics (admin only)
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const queries = [
        'SELECT COUNT(*) as count FROM donors',
        'SELECT COUNT(*) as count FROM receivers',
        'SELECT COUNT(*) as count FROM donors WHERE status = "pending"',
        'SELECT COUNT(*) as count FROM receivers WHERE urgency = "High" AND status = "pending"'
    ];

    let completed = 0;
    const results = {};

    queries.forEach((query, index) => {
        db.get(query, [], (err, row) => {
            if (err) {
                console.error('Stats query error:', err);
                return res.status(500).json({ error: 'Failed to fetch statistics' });
            }

            switch(index) {
                case 0: results.totalDonors = row.count; break;
                case 1: results.totalReceivers = row.count; break;
                case 2: results.pendingDonors = row.count; break;
                case 3: results.urgentRequests = row.count; break;
            }

            completed++;
            if (completed === queries.length) {
                res.json(results);
            }
        });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'SQLite Connected'
    });
});

// Test endpoint to verify API is working
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'LifeDrop API is working!',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 LifeDrop Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🔐 Admin Login: admin@lifedrop.com / admin123`);
    console.log(`💾 Database: SQLite (lifedrop.db)`);
});

module.exports = app;
const express = require('express');
const mongoose = require('mongoose');
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

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifedrop';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema (for admin authentication)
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Donor Schema
const donorSchema = new mongoose.Schema({
    userType: {
        type: String,
        required: true,
        default: 'donor'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    bloodType: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    preferredDate: {
        type: Date,
        required: true
    },
    message: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const Donor = mongoose.model('Donor', donorSchema);

// Receiver Schema
const receiverSchema = new mongoose.Schema({
    userType: {
        type: String,
        required: true,
        default: 'receiver'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    bloodType: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    preferredDate: {
        type: Date,
        required: true
    },
    urgency: {
        type: String,
        required: true,
        enum: ['High', 'Medium', 'Low']
    },
    hospital: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'matched', 'fulfilled', 'cancelled'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const Receiver = mongoose.model('Receiver', receiverSchema);

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
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
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

// Create default admin user
app.post('/api/setup-admin', async (req, res) => {
    try {
        const existingAdmin = await User.findOne({ email: 'admin@lifedrop.com' });
        if (existingAdmin) {
            return res.json({ message: 'Admin already exists' });
        }

        const admin = new User({
            email: 'admin@lifedrop.com',
            password: 'admin123',
            role: 'admin'
        });

        await admin.save();
        res.json({ message: 'Admin user created successfully', email: 'admin@lifedrop.com', password: 'admin123' });
    } catch (error) {
        console.error('Setup admin error:', error);
        res.status(500).json({ error: 'Failed to create admin user' });
    }
});

// Admin login
app.post('/api/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'lifedrop-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Submit donor form
app.post('/api/donors', validateDonor, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const donor = new Donor(req.body);
        await donor.save();

        res.status(201).json({
            message: 'Donor registration successful',
            donor: {
                id: donor._id,
                name: donor.name,
                bloodType: donor.bloodType,
                preferredDate: donor.preferredDate
            }
        });
    } catch (error) {
        console.error('Donor registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Submit receiver form
app.post('/api/receivers', validateReceiver, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const receiver = new Receiver(req.body);
        await receiver.save();

        res.status(201).json({
            message: 'Blood request submitted successfully',
            receiver: {
                id: receiver._id,
                name: receiver.name,
                bloodType: receiver.bloodType,
                urgency: receiver.urgency
            }
        });
    } catch (error) {
        console.error('Receiver registration error:', error);
        res.status(500).json({ error: 'Request submission failed' });
    }
});

// Get all donors (admin only)
app.get('/api/donors', authenticateToken, async (req, res) => {
    try {
        const donors = await Donor.find().sort({ submittedAt: -1 });
        res.json(donors);
    } catch (error) {
        console.error('Get donors error:', error);
        res.status(500).json({ error: 'Failed to fetch donors' });
    }
});

// Get all receivers (admin only)
app.get('/api/receivers', authenticateToken, async (req, res) => {
    try {
        const receivers = await Receiver.find().sort({ submittedAt: -1 });
        res.json(receivers);
    } catch (error) {
        console.error('Get receivers error:', error);
        res.status(500).json({ error: 'Failed to fetch receivers' });
    }
});

// Update donor status (admin only)
app.patch('/api/donors/:id', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const donor = await Donor.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!donor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        res.json({ message: 'Donor status updated', donor });
    } catch (error) {
        console.error('Update donor error:', error);
        res.status(500).json({ error: 'Failed to update donor' });
    }
});

// Update receiver status (admin only)
app.patch('/api/receivers/:id', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const receiver = await Receiver.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!receiver) {
            return res.status(404).json({ error: 'Receiver not found' });
        }

        res.json({ message: 'Receiver status updated', receiver });
    } catch (error) {
        console.error('Update receiver error:', error);
        res.status(500).json({ error: 'Failed to update receiver' });
    }
});

// Get dashboard statistics (admin only)
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const [donorCount, receiverCount, pendingDonors, urgentRequests] = await Promise.all([
            Donor.countDocuments(),
            Receiver.countDocuments(),
            Donor.countDocuments({ status: 'pending' }),
            Receiver.countDocuments({ urgency: 'High', status: 'pending' })
        ]);

        res.json({
            totalDonors: donorCount,
            totalReceivers: receiverCount,
            pendingDonors,
            urgentRequests
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🔧 Setup admin user at http://localhost:${PORT}/api/setup-admin`);
});

module.exports = app;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database.js');
const xlsx = require('xlsx');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ==================== AUTHENTICATION ====================

// Sign Up
app.post('/api/signup', (req, res) => {
    const { name, password, role, category, mobile, location, lat, lng } = req.body;
    
    if (!name || !password || !role || !category || !mobile || !location) {
        return res.status(400).json({ error: "All fields are required" });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const sql = `INSERT INTO users (name, password, role, category, mobile, location, lat, lng) VALUES (?,?,?,?,?,?,?,?)`;
    
    db.run(sql, [name, password, role, category, mobile, location, lat || 0, lng || 0], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: "Username already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "User created successfully", id: this.lastID });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { name, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE name = ? AND password = ?`, [name, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        res.json(user);
    });
});

// ==================== FOOD POSTING (Providers) ====================

// Post Food
app.post('/api/post-food', (req, res) => {
    const { user_id, food_name, quantity, cooked_time, fresh_until } = req.body;
    
    const sql = `INSERT INTO food_posts (user_id, food_name, quantity, cooked_time, fresh_until) VALUES (?,?,?,?,?)`;
    
    db.run(sql, [user_id, food_name, quantity, cooked_time, fresh_until], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Create notification for this food post
        db.get(`SELECT id FROM food_posts WHERE id = ?`, [this.lastID], (err, food) => {
            res.json({ message: "Food posted successfully!", food_id: this.lastID });
        });
    });
});

// Get My Posted Food (for provider)
app.get('/api/my-food/:user_id', (req, res) => {
    const sql = `SELECT * FROM food_posts WHERE user_id = ? ORDER BY created_at DESC`;
    db.all(sql, [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Delete/Remove food post
app.delete('/api/food/:id', (req, res) => {
    db.run(`DELETE FROM food_posts WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Food post removed" });
    });
});

// ==================== FOOD LISTING (Receivers) ====================

// Get Available Food (Sorted by freshness priority)
app.get('/api/get-food', (req, res) => {
    const userLat = parseFloat(req.query.lat) || 0;
    const userLng = parseFloat(req.query.lng) || 0;
    
    const sql = `SELECT fp.*, u.name as provider_name, u.location as provider_location, u.mobile as provider_mobile,
                 u.lat, u.lng
                 FROM food_posts fp
                 JOIN users u ON fp.user_id = u.id 
                 WHERE fp.status = 'available'
                 ORDER BY fp.fresh_until ASC`; // Priority: Less freshness time = Most important
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==================== VOLUNTEER ACTIONS ====================

// Accept/Reject Food
app.post('/api/volunteer-action', (req, res) => {
    const { food_id, volunteer_id, action } = req.body;
    
    // Get food details to know the provider
    db.get(`SELECT * FROM food_posts WHERE id = ?`, [food_id], (err, food) => {
        if (err || !food) return res.status(404).json({ error: "Food not found" });
        
        const provider_id = food.user_id;
        
        // Insert order record
        db.run(`INSERT INTO orders (food_id, volunteer_id, provider_id, action) VALUES (?,?,?,?)`, 
            [food_id, volunteer_id, provider_id, action], 
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                if (action === 'accepted') {
                    // Update food status to claimed
                    db.run(`UPDATE food_posts SET status = 'claimed' WHERE id = ?`, [food_id]);
                    
                    // Notify Provider
                    db.run(`INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)`, 
                        [provider_id, "A volunteer has ACCEPTED your food post!", "accepted"]);
                } else if (action === 'rejected') {
                    // Notify Provider
                    db.run(`INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)`, 
                        [provider_id, "A volunteer has REJECTED your food post.", "rejected"]);
                }
                
                res.json({ message: `Food ${action} successfully` });
            }
        );
    });
});

// Mark as Delivered
app.post('/api/mark-delivered', (req, res) => {
    const { order_id, food_id } = req.body;
    
    db.run(`UPDATE orders SET delivered = 1 WHERE id = ?`, [order_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Update food status to delivered
        db.run(`UPDATE food_posts SET status = 'delivered' WHERE id = ?`, [food_id]);
        
        res.json({ message: "Marked as delivered" });
    });
});

// Get Volunteer History
app.get('/api/volunteer-history/:volunteer_id', (req, res) => {
    const sql = `SELECT o.*, fp.food_name, fp.quantity, fp.cooked_time, fp.fresh_until,
                 u.name as provider_name, u.location as provider_location, u.mobile as provider_mobile
                 FROM orders o
                 JOIN food_posts fp ON o.food_id = fp.id
                 JOIN users u ON o.provider_id = u.id
                 WHERE o.volunteer_id = ?
                 ORDER BY o.action_time DESC`;
    
    db.all(sql, [req.params.volunteer_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==================== NOTIFICATIONS ====================

// Get Notifications for User
app.get('/api/notifications/:user_id', (req, res) => {
    const sql = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`;
    db.all(sql, [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Mark notifications as read
app.put('/api/notifications/read/:user_id', (req, res) => {
    db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.params.user_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Notifications marked as read" });
    });
});

// Check for Wasted Food (Auto-notify)
app.get('/api/check-waste', (req, res) => {
    const now = new Date().toISOString();
    
    db.all(`SELECT fp.*, u.name as provider_name FROM food_posts fp 
            JOIN users u ON fp.user_id = u.id 
            WHERE fp.status = 'available' AND fp.fresh_until < ? AND fp.notified_waste = 0`, 
        [now], 
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            rows.forEach(food => {
                // Update food as wasted
                db.run(`UPDATE food_posts SET status = 'wasted', notified_waste = 1 WHERE id = ?`, [food.id]);
                
                // Notify provider
                db.run(`INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)`, 
                    [food.user_id, `⚠️ Your food "${food.food_name}" has expired and is wasted!`, "wasted"]);
            });
            
            res.json({ message: `Checked ${rows.length} food items for waste` });
        }
    );
});

// SMS Simulation (Logs to console - In real app, integrate Twilio)
app.post('/api/simulate-sms', (req, res) => {
    const { mobile, message } = req.body;
    console.log(`\n📱 SMS to ${mobile}: ${message}\n`);
    res.json({ success: true, message: "SMS sent (simulated)" });
});

// ==================== EXCEL EXPORT ====================

app.get('/api/export-excel', (req, res) => {
    // Export Users
    db.all("SELECT * FROM users", (err, users) => {
        // Export Food Posts
        db.all("SELECT * FROM food_posts", (err, foodPosts) => {
            // Export Orders
            db.all("SELECT * FROM orders", (err, orders) => {
                const workbook = xlsx.utils.book_new();
                
                // Users Sheet
                const userSheet = xlsx.utils.json_to_sheet(users);
                xlsx.utils.book_append_sheet(workbook, userSheet, "Users");
                
                // Food Posts Sheet
                const foodSheet = xlsx.utils.json_to_sheet(foodPosts);
                xlsx.utils.book_append_sheet(workbook, foodSheet, "Food_Posts");
                
                // Orders Sheet
                const orderSheet = xlsx.utils.json_to_sheet(orders);
                xlsx.utils.book_append_sheet(workbook, orderSheet, "Orders");
                
                const filePath = path.join(__dirname, 'Food_Donation_Data.xlsx');
                xlsx.writeFile(workbook, filePath);
                res.download(filePath);
            });
        });
    });
});

app.listen(3000, () => {
    console.log("✅ Server running on http://localhost:3000");
});
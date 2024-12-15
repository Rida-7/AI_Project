
const express = require('express');
const admin = require('firebase-admin');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

function generateToken(user) {
    const payload = { userId: user.user_id, email: user.email, role: user.role };
    const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';
    const token = jwt.sign(payload, secretKey, { expiresIn: '1d' });
    return token;
}

const app = express();
app.use(cors({
    origin: ['http://localhost:5051', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501', 'http://localhost:3000', 'http://localhost:8082'],
    credentials: true
}));
app.use(express.json()); // Middleware to parse JSON bodies
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; font-src 'self' https://fonts.gstatic.com; script-src 'self'; style-src 'self' https://fonts.googleapis.com;");
    next();
});

// Initialize Firebase Admin SDK
const serviceAccount = require('./eduface-7fdcb-firebase-adminsdk-caz7e-e51f36633b.json');
//  const { console } = require('inspector');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Sql@05121472", // Update this to your database password
    database: "expression" // Update this to your database name
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        throw err;
    }
    console.log('Connected to MySQL!');
});

// Check if user exists (no sign-up functionality here)
app.post('/check-user', (req, res) => {
    console.log('Incoming request (check-user):', req.body);
    const { email } = req.body;

    if (!email) {
        console.log('Missing email in check-user');
        return res.status(400).json({ error: "Email is required" });
    }

    // Query to check if the user exists by email
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) {
            console.error('Database query error in check-user:', err);
            return res.status(500).json({ error: "Database query error", message: err.message });
        }

        if (result.length > 0) {
            console.log('User with this email already exists');
            return res.status(409).json({ exists: true, message: "User already exists" });
        }

        console.log('User does not exist');
        return res.status(200).json({ exists: false, message: "User does not exist" });
    });
});

app.post('/signup', (req, res) => {
    console.log('Incoming request (signup):', req.body);
    const { username, email, role, password } = req.body;
    console.log("username", username);
    console.log("email", email);
    console.log("password", password);
    console.log("role", role);

    // Validate required fields
    if (!username || !email || !password) {
        console.log('Missing required fields in signup');
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert user into `users` table
    const insertUserSql = "INSERT INTO users (full_name, password, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
    const userValues = [
        username,
        password,
        email,
        role || 'Student',
        new Date(),
        new Date()
    ];

    db.query(insertUserSql, userValues, (err, result) => {
        if (err) {
            console.error('Database insertion error in signup:', err);
            return res.status(500).json({ error: "Failed to insert user" });
        }

        console.log('User inserted successfully in signup:', result);
        const userId = result.insertId;

        // Role-specific insertion logic
        let roleInsertSql, roleValues;
        if (role === 'Student' || role === 'student') {
            roleInsertSql = `
                INSERT INTO students (user_id)
                VALUES (?)`;
            roleValues = [userId];
        } else if (role === 'Teacher' || role === 'teacher') {
            roleInsertSql = `
                INSERT INTO teachers (user_id)
                VALUES (?)`;
            roleValues = [userId];
        } else {
            console.error('Unsupported role:', role);
            return res.status(400).json({ error: "Unsupported role" });
        }

        db.query(roleInsertSql, roleValues, (err) => {
            if (err) {
                console.error('Role-specific insertion error in signup:', err);
                return res.status(500).json({ error: "Failed to insert role-specific data" });
            }

            res.json({ exists: false, message: "User registered successfully!" });
        });
    });
});

// Sign-In route
app.post('/signin', (req, res) => {
    console.log('Incoming request (signin):', req.body);
    const { email, password } = req.body;
    if (!email || !password) {
        console.log('Missing required fields in signin');
        return res.status(400).json({ error: "Missing required fields" });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
        if (err) {
            console.error('Database error in signin:', err);
            return res.status(500).json({ error: "Database error" });
        }

        console.log('Query result (signin):', rows);
        if (rows.length > 0) {
            const user = rows[0];
            if (user.password === password) {
                console.log('Sign-in successful');
                const token = generateToken(user);
                const userData = {
                    message: "Sign in successful!",
                    token,
                    role: user.role // Include role in the response
                };
                res.status(200).json(userData);
            } else {
                console.log('Invalid email or password in signin');
                res.status(401).json({ error: "Invalid email or password" });
            }
        } else {
            console.log('Invalid email or password in signin');
            res.status(401).json({ error: "Invalid email or password" });
        }
    });
});

app.post('/addCourse', authenticateAndFetchRoleId, (req, res) => {

    const { title, description, startDate, endDate } = req.body;
    const teacher_id = req.user.roleId; // Get teacher_id from the decoded token

    console.log('Incoming request (addCourse):', req.body);
    console.log('teacherId:', teacher_id);

    // Validate inputs to ensure all required fields are provided
    if (!title || !description || !startDate || !endDate) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // SQL query to insert course along with teacher_id
    const query = 'INSERT INTO courses (course_name, description, start_date, end_date, teacher_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)';

    // Using prepared statement to prevent SQL injection
    db.query(query, [title, description, startDate, endDate, teacher_id, new Date(), new Date()], (err, result) => {
        if (err) {
            console.error('Error inserting course:', err);  // Log the error for debugging
            return res.status(500).json({ error: 'Failed to insert course', details: err });
        } else {
            res.status(200).json({ message: 'Course added successfully', id: result.insertId });
        }
    });
});

// API endpoint to get all courses
app.get('/courses', (req, res) => {
    // SQL query to fetch all courses along with their details
    const query = `
        SELECT c.course_id AS id, c.course_name, c.description, c.start_date, c.end_date
        FROM courses c
        JOIN teachers t ON c.teacher_id = t.teacher_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).json({ error: 'Failed to retrieve courses' });
        }

        // Send the courses data back to the frontend
        res.status(200).json(results);
    });
});

// Update course API endpoint
app.put('/updateCourse/:id', authenticateAndFetchRoleId, (req, res) => {
    const courseId = req.params.id;
    const { course_name, description, start_date, end_date } = req.body;

    // Ensure only the teacher who created the course can edit it
    const query = 'UPDATE courses SET course_name = ?, description = ?, start_date = ?, end_date = ?, updated_at = ? WHERE course_id = ? AND teacher_id = ?';
    db.query(query, [course_name, description, start_date, end_date, new Date(), courseId, req.user.roleId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update course' });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Course not found or unauthorized' });
        } else {
            res.status(200).json({ message: 'Course updated successfully' });
        }
    });
});

// API endpoint to fetch course details by ID
app.get('/getCourse/:id', authenticateAndFetchRoleId, (req, res) => {
    const courseId = req.params.id;
    const teacherId = req.user.roleId; // Ensure the teacher accessing the course is authorized

    // SQL query to fetch the course
    const query = 'SELECT course_name, description, start_date, end_date FROM courses WHERE course_id = ? AND teacher_id = ?';
    db.query(query, [courseId, teacherId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch course details' });
        } else if (result.length === 0) {
            res.status(404).json({ error: 'Course not found or unauthorized' });
        } else {
            res.status(200).json(result[0]); // Return the course details
        }
    });
});

// Delete course API
app.delete('/deleteCourses/:id', authenticateAndFetchRoleId, (req, res) => {
    const courseId = req.params.id;
    const teacherId = req.user.roleId; // Get teacher_id from the decoded token

    // SQL query to delete the course
    const query = 'DELETE FROM courses WHERE course_id = ? AND teacher_id = ?';
    db.query(query, [courseId, teacherId], (err, result) => {
        if (err) {
            console.error('Failed to delete course:', err);
            res.status(500).json({ error: 'Failed to delete course' });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Course not found or you do not have permission to delete it' });
        } else {
            res.status(200).json({ message: 'Course deleted successfully' });
        }
    });
});


app.get('/api/coursesName', authenticateAndFetchRoleId, (req, res) => {
    const teacherId = req.user.roleId;  // Assuming user ID is available after authentication

    // SQL query to fetch courses for the logged-in teacher
    const query = 'SELECT * FROM courses WHERE teacher_id = ?';

    db.query(query, [teacherId], (err, results) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).json({ error: 'Failed to fetch courses' });
        }

        // Return courses in the response
        res.json({ courses: results });
    });
});

function authenticateAndFetchRoleId(req, res, next) {

    const token = req.headers.authorization?.split(' ')[1]; // Extract token from Bearer header
    console.log('Token from headers:', token);  // Log the token to verify

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is missing' });
    }

    try {
        const secretKey = process.env.JWT_SECRET || 'defaultSecretKey'; // Use your JWT secret
        const decoded = jwt.verify(token, secretKey); // Verify JWT token
        console.log('Decoded token:', decoded); // Log the decoded token

        req.user = decoded; // Attach the decoded token payload to the request object
        const { userId, role } = decoded;

        const roleColumnMap = {
            Student: 'Student_id',
            Teacher: 'teacher_id',
        };

        const roleMap = {
            Student: 'students',
            Teacher: 'teachers',
        };

        const roleIdColumn = roleColumnMap[role];
        if (!roleIdColumn) {
            return res.status(403).json({ error: `Invalid role: ${role}` });
        }

        const roleTable = roleMap[role];
        if (!roleTable) {
            return res.status(403).json({ error: `Invalid role Table: ${role}` });
        }

        const query = `SELECT ${roleIdColumn} AS roleId FROM ${roleTable} WHERE user_id = ?`;

        db.query(query, [userId], (err, result) => {
            if (err) {
                console.error('Database query error for role:', role, 'User ID:', userId, 'Error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: `No record found for role: ${role}` });
            }

            req.user.roleId = result[0].roleId; // Attach role-specific ID to the request object
            next(); // Proceed to the next middleware or route handler
        });

    } catch (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// API to create a meeting
app.post('/create-meeting', (req, res) => {
    const { className } = req.body;

    // Generate a unique room name based on teacher and class
    const roomName = `EduFaceSync-${className}`;
    const meetingLink = `https://meet.jit.si/${roomName}`;

    // SQL query to insert the meeting into the database
    const query = 'INSERT INTO liveclasses (course_id, class_link) VALUES (?, ?)';
    db.query(query, [className, meetingLink], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error saving meeting link' });
        }
        res.status(201).json({ meetingLink });
    });
});

// Endpoint to fetch available courses with teacher names from Users table
app.get('/api/courses', (req, res) => {
    const query = `
        SELECT 
            c.course_id, 
            c.course_name, 
            c.start_date, 
            c.end_date, 
            u.full_name AS teacher_name
        FROM 
            Courses c
        JOIN 
            Teachers t ON c.teacher_id = t.teacher_id
        JOIN 
            Users u ON t.user_id = u.user_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching courses: ' + err);
            return res.status(500).json({ message: 'Error fetching courses' });
        }
        res.json(results);
    });
});

// Endpoint to enroll a student in a course
app.post('/api/enroll', authenticateAndFetchRoleId, (req, res) => {
    const studentID = req.user.roleId;
    const {course_id } = req.body;

    const query = `
        INSERT INTO Enrollments (student_id, course_id)
        VALUES (?, ?)
    `;

    db.query(query, [studentID, course_id], (err, results) => {
        if (err) {
            console.error('Error enrolling student: ' + err);
            return res.status(500).json({ success: false, message: 'Error enrolling student' });
        }
        res.json({ success: true, message: 'Successfully enrolled' });
    });
});

app.get('/api/live-classes', authenticateAndFetchRoleId, (req, res) => {
    const studentId = req.user.roleId; // Get student ID from request parameters

    const query = `
        SELECT 
            lc.live_class_id, 
            c.course_name, 
            lc.class_link, 
            lc.status
        FROM 
            liveclasses lc
        INNER JOIN 
            courses c ON lc.course_id = c.course_id
        INNER JOIN 
            enrollments e ON lc.course_id = e.course_id
        WHERE 
            e.student_id = ? AND lc.status = 'scheduled';
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching live classes:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        res.json(results);
    });
});

// Start server
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
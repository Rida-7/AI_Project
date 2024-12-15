
const express = require('express');
const admin = require('firebase-admin');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');


// function generateToken(user) {
//     const payload = { userId: user.user_id, email: user.email, role: user.role };
//     const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';
//     const token = jwt.sign(payload, secretKey, { expiresIn: '1d' });
//     return token;
// }

const app = express();
app.use(cors({
    origin: ['http://localhost:5051', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501', 'http://localhost:3000', 'http://localhost:8082'],
    credentials: true
}));
app.use(express.json()); // Middleware to parse JSON bodies
// app.use((req, res, next) => {
//     res.setHeader('Content-Security-Policy', "default-src 'none'; font-src 'self' https://fonts.gstatic.com; script-src 'self'; style-src 'self' https://fonts.googleapis.com;");
//     next();
// });


// // Initialize Firebase Admin SDK
// const serviceAccount = require('./eduface-7fdcb-firebase-adminsdk-caz7e-e51f36633b.json');
// const { console } = require('inspector');
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

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

// // Check if user exists (no sign-up functionality here)
// app.post('/check-user', (req, res) => {
//     console.log('Incoming request (check-user):', req.body);
//     const { email } = req.body;

//     if (!email) {
//         console.log('Missing email in check-user');
//         return res.status(400).json({ error: "Email is required" });
//     }

//     // Query to check if the user exists by email
//     db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
//         if (err) {
//             console.error('Database query error in check-user:', err);
//             return res.status(500).json({ error: "Database query error", message: err.message });
//         }

//         if (result.length > 0) {
//             console.log('User with this email already exists');
//             return res.status(409).json({ exists: true, message: "User already exists" });
//         }

//         console.log('User does not exist');
//         return res.status(200).json({ exists: false, message: "User does not exist" });
//     });
// });

// app.post('/signup', (req, res) => {
//     console.log('Incoming request (signup):', req.body);
//     const { username, email, role, password} = req.body;
//     console.log("username", username);
//     console.log("email", email);
//     console.log("password", password);
//     console.log("role", role);

//     // Validate required fields
//     if (!username || !email || !password) {
//         console.log('Missing required fields in signup');
//         return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Insert user into `users` table
//     const insertUserSql = "INSERT INTO users (username, password, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
//     const userValues = [
//         fullname,
//         password,
//         email,
//         role || 'student',
//         new Date(),
//         new Date()
//     ];

//     db.query(insertUserSql, userValues, (err, result) => {
//         if (err) {
//             console.error('Database insertion error in signup:', err);
//             return res.status(500).json({ error: "Failed to insert user" });
//         }

//         console.log('User inserted successfully in signup:', result);
//         const userId = result.insertId;

//         // Role-specific insertion logic
//         let roleInsertSql, roleValues;
//         if (role == 'student') {
//             roleInsertSql = `
//             INSERT INTO students (user_id)
//             VALUES (?)`;
//             roleValues = [
//                 userId
//             ];
//         }
//         if (role === 'teacher') {
//             roleInsertSql = `
//                 INSERT INTO teachers (user_id)
//                 VALUES (?)
//             `;
//             roleValues = [
//                 userId,
//             ];
//         } else {
//             console.error('Unsupported role:', role);
//             return res.status(400).json({ error: "Unsupported role" });
//         }

//         db.query(roleInsertSql, roleValues, (err) => {
//             if (err) {
//                 console.error('Role-specific insertion error in signup:', err);
//                 return res.status(500).json({ error: "Failed to insert role-specific data" });
//             }

//             res.json({ exists: false, message: "User registered successfully!" });
//         });
//     });
// });

// // Sign-In route
// app.post('/signin', (req, res) => {
//     console.log('Incoming request (signin):', req.body);
//     const { email, password } = req.body;
//     if (!email || !password) {
//         console.log('Missing required fields in signin');
//         return res.status(400).json({ error: "Missing required fields" });
//     }

//     db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
//         if (err) {
//             console.error('Database error in signin:', err);
//             return res.status(500).json({ error: "Database error" });
//         }

//         console.log('Query result (signin):', rows);
//         if (rows.length > 0) {
//             const user = rows[0];
//             if (user.password === password) {
//                 console.log('Sign-in successful');
//                 const token = generateToken(user);
//                 const userData = {
//                     message: "Sign in successful!",
//                     token,
//                     role: user.role // Include role in the response
//                 };
//                 res.status(200).json(userData);
//             } else {
//                 console.log('Invalid email or password in signin');
//                 res.status(401).json({ error: "Invalid email or password" });
//             }
//         } else {
//             console.log('Invalid email or password in signin');
//             res.status(401).json({ error: "Invalid email or password" });
//         }
//     });
// });

// function authenticateAndFetchRoleId(req, res, next) {
//     const token = req.headers.authorization?.split(' ')[1]; // Extract token from Bearer header
//     console.log('Token from headers:', token);  // Log the token to verify

//     if (!token) {
//         return res.status(401).json({ error: 'Authentication token is missing' });
//     }

//     try {
//         const secretKey = process.env.JWT_SECRET || 'defaultSecretKey'; // Use your JWT secret
//         const decoded = jwt.verify(token, secretKey); // Verify JWT token
//         console.log('Decoded token:', decoded); // Log the decoded token

//         req.user = decoded; // Attach the decoded token payload to the request object
//         const { userId, role } = decoded;

//         const roleColumnMap = {
//             student: 'student_id',
//             teacher: 'teacher_id',
//         };

//         const roleIdColumn = roleColumnMap[role];
//         if (!roleIdColumn) {
//             return res.status(403).json({ error: `Invalid role: ${role}` });
//         }

//         const query = `SELECT ${roleIdColumn} AS roleId FROM ${role} WHERE user_id = ?`;

//         db.query(query, [userId], (err, result) => {
//             if (err) {
//                 console.error('Database query error for role:', role, 'User ID:', userId, 'Error:', err);
//                 return res.status(500).json({ error: 'Database error' });
//             }

//             if (result.length === 0) {
//                 return res.status(404).json({ error: `No record found for role: ${role}` });
//             }

//             req.user.roleId = result[0].roleId; // Attach role-specific ID to the request object
//             next(); // Proceed to the next middleware or route handler
//         });

//     } catch (err) {
//         console.error('JWT verification failed:', err);
//         return res.status(401).json({ error: 'Invalid or expired token' });
//     }
// }

// Start server
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
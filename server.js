// ========================================
// STUDENTHUB - EXPRESS SERVER
// ========================================

const express = require("express");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const app = express();

app.use(express.json());

// ========================================
// CONFIGURATION
// ========================================

const PORT = process.env.PORT || 3000;

const DB_PATH = path.join(__dirname, "database.db");

let db;


// ========================================
// DATABASE INITIALIZATION
// ========================================

async function initializeDatabase() {

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {

        const file = fs.readFileSync(DB_PATH);

        db = new SQL.Database(file);

        console.log("Existing database loaded.");

    } else {

        db = new SQL.Database();

        console.log("New database created.");

    }

    // CREATE STUDENTS TABLE

    db.run(`
        CREATE TABLE IF NOT EXISTS students (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            student_id TEXT UNIQUE NOT NULL,

            name TEXT NOT NULL,

            email TEXT,

            course TEXT,

            year_level TEXT,

            status TEXT DEFAULT 'Active',

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);

    saveDatabase();

    console.log("Database initialized successfully.");

}


// ========================================
// SAVE DATABASE
// ========================================

function saveDatabase() {

    const data = db.export();

    const buffer = Buffer.from(data);

    fs.writeFileSync(DB_PATH, buffer);

}


// ========================================
// DATABASE HELPER
// ========================================

function getAll(sql, params = []) {

    const statement = db.prepare(sql);

    statement.bind(params);

    const results = [];

    while (statement.step()) {

        results.push(statement.getAsObject());

    }

    statement.free();

    return results;

}


function getOne(sql, params = []) {

    return getAll(sql, params)[0] || null;

}


// ========================================
// FRONTEND CONNECTION
// ========================================

app.use(express.static(path.join(__dirname, "public")));


// ========================================
// DASHBOARD STATISTICS
// ========================================

app.get("/api/dashboard", (req, res) => {

    try {

        const total = getOne(`
            SELECT COUNT(*) AS total
            FROM students
        `);

        const active = getOne(`
            SELECT COUNT(*) AS total
            FROM students
            WHERE status = 'Active'
        `);

        const inactive = getOne(`
            SELECT COUNT(*) AS total
            FROM students
            WHERE status = 'Inactive'
        `);

        res.json({

            total: total.total,

            active: active.total,

            inactive: inactive.total

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to load dashboard statistics."

        });

    }

});


// ========================================
// GET ALL STUDENTS
// SEARCH STUDENTS
// ========================================

app.get("/api/students", (req, res) => {

    try {

        const search = req.query.search || "";

        const students = getAll(`

            SELECT *
            FROM students

            WHERE
                student_id LIKE ?
                OR name LIKE ?
                OR email LIKE ?
                OR course LIKE ?

            ORDER BY id DESC

        `, [

            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`

        ]);

        res.json(students);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to retrieve students."

        });

    }

});


// ========================================
// GET ONE STUDENT
// ========================================

app.get("/api/students/:id", (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {

            return res.status(400).json({

                message: "Invalid student ID."

            });

        }

        const student = getOne(`

            SELECT *
            FROM students
            WHERE id = ?

        `, [id]);

        if (!student) {

            return res.status(404).json({

                message: "Student not found."

            });

        }

        res.json(student);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to retrieve student."

        });

    }

});


// ========================================
// ADD NEW STUDENT
// CREATE
// ========================================

app.post("/api/students", (req, res) => {

    try {

        const {

            student_id,
            name,
            email,
            course,
            year_level,
            status

        } = req.body;

        if (!student_id || !name) {

            return res.status(400).json({

                message: "Student ID and name are required."

            });

        }

        const existing = getOne(`

            SELECT id
            FROM students
            WHERE student_id = ?

        `, [student_id.trim()]);

        if (existing) {

            return res.status(409).json({

                message: "Student ID already exists."

            });

        }

        db.run(`

            INSERT INTO students (

                student_id,
                name,
                email,
                course,
                year_level,
                status

            )

            VALUES (?, ?, ?, ?, ?, ?)

        `, [

            student_id.trim(),
            name.trim(),
            email || "",
            course || "",
            year_level || "",
            status || "Active"

        ]);

        saveDatabase();

        res.status(201).json({

            message: "Student added successfully!",

            id: getOne(
                "SELECT last_insert_rowid() AS id"
            ).id

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to add student."

        });

    }

});


// ========================================
// UPDATE STUDENT
// UPDATE
// ========================================

app.put("/api/students/:id", (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {

            return res.status(400).json({

                message: "Invalid student ID."

            });

        }

        const {

            student_id,
            name,
            email,
            course,
            year_level,
            status

        } = req.body;

        if (!student_id || !name) {

            return res.status(400).json({

                message: "Student ID and name are required."

            });

        }

        const student = getOne(`

            SELECT id
            FROM students
            WHERE id = ?

        `, [id]);

        if (!student) {

            return res.status(404).json({

                message: "Student not found."

            });

        }

        const duplicate = getOne(`

            SELECT id
            FROM students
            WHERE student_id = ?
            AND id != ?

        `, [student_id.trim(), id]);

        if (duplicate) {

            return res.status(409).json({

                message: "Student ID already belongs to another student."

            });

        }

        db.run(`

            UPDATE students

            SET

                student_id = ?,
                name = ?,
                email = ?,
                course = ?,
                year_level = ?,
                status = ?

            WHERE id = ?

        `, [

            student_id.trim(),
            name.trim(),
            email || "",
            course || "",
            year_level || "",
            status || "Active",
            id

        ]);

        saveDatabase();

        res.json({

            message: "Student updated successfully!"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to update student."

        });

    }

});


// ========================================
// DELETE STUDENT
// DELETE
// ========================================

app.delete("/api/students/:id", (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {

            return res.status(400).json({

                message: "Invalid student ID."

            });

        }

        const student = getOne(`

            SELECT id
            FROM students
            WHERE id = ?

        `, [id]);

        if (!student) {

            return res.status(404).json({

                message: "Student not found."

            });

        }

        db.run(`

            DELETE FROM students
            WHERE id = ?

        `, [id]);

        saveDatabase();

        res.json({

            message: "Student deleted successfully!"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to delete student."

        });

    }

});


// ========================================
// API ERROR HANDLING
// ========================================

app.use("/api", (req, res) => {

    res.status(404).json({

        message: "API endpoint not found."

    });

});


// ========================================
// SERVER START
// ========================================

async function startServer() {

    try {

        await initializeDatabase();

        app.listen(PORT, "0.0.0.0", () => {

            console.log("--------------------------------");

            console.log("STUDENTHUB SERVER STARTED");

            console.log("--------------------------------");

            console.log(`Port: ${PORT}`);

            console.log(`Local: http://localhost:${PORT}`);

            console.log("Database: SQLite");

            console.log("Status: Running");

            console.log("--------------------------------");

        });

    } catch (error) {

        console.error("Server startup failed:", error);

        process.exit(1);

    }

}


startServer();
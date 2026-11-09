const express = require("express");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_PATH = path.join(__dirname, "database.db");

let db;

function saveDatabase() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function startServer() {

    const SQL = await initSqlJs({
        locateFile: file =>
            path.join(__dirname, "node_modules/sql.js/dist", file)
    });

    if (fs.existsSync(DB_PATH)) {
        const file = fs.readFileSync(DB_PATH);
        db = new SQL.Database(file);
    } else {
        db = new SQL.Database();
    }

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

    // DASHBOARD STATISTICS

    app.get("/api/dashboard", (req, res) => {

        const total = db.exec(
            "SELECT COUNT(*) FROM students"
        )[0].values[0][0];

        const active = db.exec(
            "SELECT COUNT(*) FROM students WHERE status = 'Active'"
        )[0].values[0][0];

        const inactive = db.exec(
            "SELECT COUNT(*) FROM students WHERE status = 'Inactive'"
        )[0].values[0][0];

        res.json({
            total,
            active,
            inactive
        });
    });

    // GET ALL STUDENTS

    app.get("/api/students", (req, res) => {

        const search = req.query.search || "";

        const statement = db.prepare(`
            SELECT * FROM students
            WHERE student_id LIKE $search
            OR name LIKE $search
            OR email LIKE $search
            OR course LIKE $search
            ORDER BY id DESC
        `);

        statement.bind({
            $search: `%${search}%`
        });

        const students = [];

        while (statement.step()) {
            students.push(statement.getAsObject());
        }

        statement.free();

        res.json(students);
    });

    // GET ONE STUDENT

    app.get("/api/students/:id", (req, res) => {

        const result = db.exec(
            "SELECT * FROM students WHERE id = ?",
            [Number(req.params.id)]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const student = {};

        result[0].columns.forEach((column, index) => {
            student[column] = result[0].values[0][index];
        });

        res.json(student);
    });

    // ADD STUDENT

    app.post("/api/students", (req, res) => {

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
                message: "Student ID and name are required"
            });
        }

        try {

            db.run(`
                INSERT INTO students
                (student_id, name, email, course, year_level, status)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                student_id,
                name,
                email || "",
                course || "",
                year_level || "",
                status || "Active"
            ]);

            saveDatabase();

            res.status(201).json({
                message: "Student added successfully"
            });

        } catch (error) {

            res.status(400).json({
                message: "Student ID already exists or invalid data"
            });
        }
    });

    // UPDATE STUDENT

    app.put("/api/students/:id", (req, res) => {

        const {
            student_id,
            name,
            email,
            course,
            year_level,
            status
        } = req.body;

        try {

            db.run(`
                UPDATE students SET
                student_id = ?,
                name = ?,
                email = ?,
                course = ?,
                year_level = ?,
                status = ?
                WHERE id = ?
            `, [
                student_id,
                name,
                email || "",
                course || "",
                year_level || "",
                status || "Active",
                Number(req.params.id)
            ]);

            if (db.getRowsModified() === 0) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }

            saveDatabase();

            res.json({
                message: "Student updated successfully"
            });

        } catch (error) {

            res.status(400).json({
                message: "Unable to update student"
            });
        }
    });

    // DELETE STUDENT

    app.delete("/api/students/:id", (req, res) => {

        db.run(
            "DELETE FROM students WHERE id = ?",
            [Number(req.params.id)]
        );

        if (db.getRowsModified() === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        saveDatabase();

        res.json({
            message: "Student deleted successfully"
        });
    });

    // START SERVER

    app.listen(PORT, "0.0.0.0", () => {

        console.log("--------------------------------");
        console.log(" STUDENTHUB SERVER IS RUNNING");
        console.log("--------------------------------");
        console.log(` http://localhost:${PORT}`);
        console.log("--------------------------------");

    });
}

startServer().catch(error => {
    console.error("Server startup failed:", error);
});
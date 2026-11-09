// ========================================
// STUDENTHUB - MAIN JAVASCRIPT
// ========================================

const API = "/api/students";

// ELEMENTS

const studentForm = document.getElementById("studentForm");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const studentsTable = document.getElementById("studentsTable");
const recentStudents = document.getElementById("recentStudents");
const studentSearch = document.getElementById("studentSearch");
const toast = document.getElementById("toast");

let students = [];
let editingId = null;
let toastTimer;


// ========================================
// ICONS
// ========================================

function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

refreshIcons();


// ========================================
// NOTIFICATION
// ========================================

function showToast(message) {

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// ========================================
// API REQUEST
// ========================================

async function request(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}


// ========================================
// DASHBOARD STATISTICS
// ========================================

async function loadDashboard() {

    try {

        const data = await request("/api/dashboard");

        document.getElementById("totalStudents").textContent =
            data.total;

        document.getElementById("activeStudents").textContent =
            data.active;

        document.getElementById("inactiveStudents").textContent =
            data.inactive;

        document.getElementById("sidebarCount").textContent =
            data.total;

    } catch (error) {

        showToast("Unable to load dashboard statistics.");

        console.error(error);
    }
}


// ========================================
// LOAD STUDENTS
// ========================================

async function loadStudents(search = "") {

    try {

        const url = `${API}?search=${encodeURIComponent(search)}`;

        students = await request(url);

        renderStudents(students);

        loadRecentStudents();
        loadCourses();

        document.getElementById("studentCount").textContent =
            `Showing ${students.length} students`;

    } catch (error) {

        console.error(error);

        studentsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Unable to load student records.
                </td>
            </tr>
        `;
    }
}


// ========================================
// SECURITY - HTML ESCAPING
// ========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


// ========================================
// RENDER STUDENT TABLE
// ========================================

function renderStudents(data) {

    if (data.length === 0) {

        studentsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No students found.
                </td>
            </tr>
        `;

        return;
    }

    studentsTable.innerHTML = data.map(student => {

        const initials = escapeHTML(
            student.name.trim().split(/\s+/)
                .map(word => word[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
        );

        const status = student.status === "Inactive"
            ? "inactive"
            : "active";

        return `
            <tr>

                <td>
                    <div class="student-name">

                        <div class="student-avatar">
                            ${initials}
                        </div>

                        <div>
                            ${escapeHTML(student.name)}
                            <div class="student-email">
                                ${escapeHTML(student.email)}
                            </div>
                        </div>

                    </div>
                </td>

                <td>${escapeHTML(student.student_id)}</td>

                <td>${escapeHTML(student.course || "N/A")}</td>

                <td>${escapeHTML(student.year_level || "N/A")}</td>

                <td>
                    <span class="badge ${status}">
                        ${escapeHTML(student.status)}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">

                        <button data-action="edit"
                            data-id="${Number(student.id)}"
                            title="Edit Student">

                            <i data-lucide="pencil"></i>

                        </button>

                        <button class="delete"
                            data-action="delete"
                            data-id="${Number(student.id)}"
                            title="Delete Student">

                            <i data-lucide="trash-2"></i>

                        </button>

                    </div>
                </td>

            </tr>
        `;

    }).join("");

    refreshIcons();
}


// ========================================
// RECENT STUDENTS
// ========================================

async function loadRecentStudents() {

    try {

        const data = await request(API);

        const recent = data.slice(0, 5);

        if (recent.length === 0) {

            recentStudents.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        No student records yet.
                    </td>
                </tr>
            `;

            return;
        }

        recentStudents.innerHTML = recent.map(student => {

            const initials = escapeHTML(
                student.name.trim().split(/\s+/)
                    .map(word => word[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
            );

            const status = student.status === "Inactive"
                ? "inactive"
                : "active";

            return `
                <tr>

                    <td>
                        <div class="student-name">
                            <div class="student-avatar">
                                ${initials}
                            </div>

                            ${escapeHTML(student.name)}
                        </div>
                    </td>

                    <td>${escapeHTML(student.student_id)}</td>

                    <td>${escapeHTML(student.course || "N/A")}</td>

                    <td>${escapeHTML(student.year_level || "N/A")}</td>

                    <td>
                        <span class="badge ${status}">
                            ${escapeHTML(student.status)}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");

        refreshIcons();

    } catch (error) {
        console.error(error);
    }
}


// ========================================
// COURSES
// ========================================

async function loadCourses() {

    try {

        const data = await request(API);

        const courses = [
            ...new Set(
                data.map(student => student.course).filter(Boolean)
            )
        ];

        document.getElementById("totalCourses").textContent =
            courses.length;

        document.getElementById("courseCount").textContent =
            courses.length;

        const courseList = document.getElementById("courseList");

        if (courses.length === 0) {

            courseList.innerHTML = `
                <p class="empty-state">
                    No courses available yet.
                </p>
            `;

            return;
        }

        courseList.innerHTML = courses.map(course => {

            const count = data.filter(
                student => student.course === course
            ).length;

            return `
                <div class="course-item">

                    <strong>${escapeHTML(course)}</strong>

                    <span>
                        ${count} registered student(s)
                    </span>

                </div>
            `;

        }).join("");

    } catch (error) {

        console.error(error);
    }
}


// ========================================
// OPEN MODAL
// ========================================

function openModal(student = null) {

    studentForm.reset();

    editingId = student ? student.id : null;

    document.getElementById("studentDatabaseId").value =
        student ? student.id : "";

    modalTitle.textContent = student
        ? "Edit Student"
        : "Add New Student";

    document.getElementById("studentId").value =
        student?.student_id || "";

    document.getElementById("studentName").value =
        student?.name || "";

    document.getElementById("studentEmail").value =
        student?.email || "";

    document.getElementById("studentCourse").value =
        student?.course || "";

    document.getElementById("studentYear").value =
        student?.year_level || "";

    document.getElementById("studentStatus").value =
        student?.status || "Active";

    document.getElementById("saveStudent").innerHTML = `
        <i data-lucide="save"></i>
        ${student ? "Update Student" : "Save Student"}
    `;

    modalBackdrop.classList.add("show");

    refreshIcons();
}


// ========================================
// CLOSE MODAL
// ========================================

function closeModal() {

    modalBackdrop.classList.remove("show");

    editingId = null;

    studentForm.reset();
}


// ========================================
// ADD AND UPDATE STUDENT
// ========================================

studentForm.addEventListener("submit", async event => {

    event.preventDefault();

    const student = {

        student_id: document.getElementById("studentId").value.trim(),

        name: document.getElementById("studentName").value.trim(),

        email: document.getElementById("studentEmail").value.trim(),

        course: document.getElementById("studentCourse").value,

        year_level: document.getElementById("studentYear").value,

        status: document.getElementById("studentStatus").value

    };

    if (!student.student_id || !student.name) {

        showToast("Please complete the required fields.");

        return;
    }

    const saveButton = document.getElementById("saveStudent");

    saveButton.disabled = true;

    try {

        if (editingId) {

            await request(`${API}/${editingId}`, {

                method: "PUT",

                body: JSON.stringify(student)

            });

            showToast("Student updated successfully!");

        } else {

            await request(API, {

                method: "POST",

                body: JSON.stringify(student)

            });

            showToast("Student added successfully!");

        }

        closeModal();

        await Promise.all([
            loadStudents(studentSearch.value),
            loadDashboard()
        ]);

    } catch (error) {

        showToast(error.message);

    } finally {

        saveButton.disabled = false;

    }

});


// ========================================
// EDIT AND DELETE STUDENTS
// ========================================

studentsTable.addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);

    const action = button.dataset.action;

    const student = students.find(item => item.id === id);

    if (!student) return;

    if (action === "edit") {

        openModal(student);

    }

    if (action === "delete") {

        const confirmed = confirm(
            `Are you sure you want to delete ${student.name}?`
        );

        if (!confirmed) return;

        try {

            await request(`${API}/${id}`, {
                method: "DELETE"
            });

            showToast("Student deleted successfully!");

            await Promise.all([
                loadStudents(studentSearch.value),
                loadDashboard()
            ]);

        } catch (error) {

            showToast(error.message);

        }

    }

});


// ========================================
// SEARCH STUDENTS
// ========================================

let searchTimer;

studentSearch.addEventListener("input", () => {

    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {

        loadStudents(studentSearch.value);

    }, 300);

});


// ========================================
// PAGE NAVIGATION
// ========================================

const pages = {

    dashboard: {
        title: "Dashboard",
        subtitle: "Welcome back, Administrator!"
    },

    students: {
        title: "Students",
        subtitle: "Manage your student records."
    },

    courses: {
        title: "Courses",
        subtitle: "View registered courses."
    },

    attendance: {
        title: "Attendance",
        subtitle: "Monitor student attendance."
    },

    reports: {
        title: "Reports",
        subtitle: "View and export student records."
    },

    settings: {
        title: "Settings",
        subtitle: "Customize your dashboard."
    }

};


function navigateTo(page) {

    if (!pages[page]) return;

    document.querySelectorAll(".page-view").forEach(section => {

        section.hidden = true;

    });

    const selectedPage = document.getElementById(
        page + "Page"
    );

    selectedPage.hidden = false;

    document.querySelectorAll(".nav-link").forEach(link => {

        link.classList.toggle(
            "active",
            link.dataset.page === page
        );

    });

    document.getElementById("pageTitle").textContent =
        pages[page].title;

    document.getElementById("pageSubtitle").textContent =
        pages[page].subtitle;

    if (page === "dashboard") {

        loadDashboard();
        loadRecentStudents();

    }

    if (page === "students") {

        loadStudents(studentSearch.value);

    }

    if (page === "courses") {

        loadCourses();

    }

    closeSidebar();

}


document.querySelectorAll(".nav-link").forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        navigateTo(link.dataset.page);

    });

});


// ========================================
// DASHBOARD BUTTONS
// ========================================

document.getElementById("welcomeAddButton")
    .addEventListener("click", () => openModal());

document.getElementById("addStudentButton")
    .addEventListener("click", () => openModal());

document.getElementById("viewAllStudents")
    .addEventListener("click", () => navigateTo("students"));

document.getElementById("refreshStudents")
    .addEventListener("click", () => {

        loadStudents(studentSearch.value);

        loadDashboard();

        showToast("Records refreshed.");

    });


// ========================================
// MODAL BUTTONS
// ========================================

document.getElementById("closeModal")
    .addEventListener("click", closeModal);

document.getElementById("cancelModal")
    .addEventListener("click", closeModal);

modalBackdrop.addEventListener("click", event => {

    if (event.target === modalBackdrop) {
        closeModal();
    }

});


// ========================================
// ADMIN THREE-DOT MENU
// ========================================

const adminMore = document.getElementById("adminMore");

const adminMenu = document.getElementById("adminMenu");

adminMore.addEventListener("click", event => {

    event.stopPropagation();

    adminMenu.classList.toggle("show");

});

document.addEventListener("click", event => {

    if (!adminMenu.contains(event.target) &&
        !adminMore.contains(event.target)) {

        adminMenu.classList.remove("show");

    }

});

document.getElementById("profileButton")
    .addEventListener("click", () => {

        adminMenu.classList.remove("show");

        showToast("Administrator profile");

    });

document.getElementById("logoutButton")
    .addEventListener("click", () => {

        adminMenu.classList.remove("show");

        showToast("No login system is configured yet.");

    });


// ========================================
// DARK AND LIGHT MODE
// ========================================

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {

    document.body.classList.toggle(
        "dark-mode",
        theme === "dark"
    );

    localStorage.setItem("studenthub-theme", theme);

    themeToggle.innerHTML = theme === "dark"
        ? '<i data-lucide="sun"></i>'
        : '<i data-lucide="moon"></i>';

    refreshIcons();
}


const savedTheme = localStorage.getItem("studenthub-theme") || "light";

applyTheme(savedTheme);


themeToggle.addEventListener("click", () => {

    const isDark = document.body.classList.contains("dark-mode");

    applyTheme(isDark ? "light" : "dark");

});


document.getElementById("settingsTheme")
    .addEventListener("click", () => {

        const isDark = document.body.classList.contains("dark-mode");

        applyTheme(isDark ? "light" : "dark");

        showToast("Theme updated!");

    });


// ========================================
// MOBILE SIDEBAR
// ========================================

const sidebar = document.getElementById("sidebar");

const sidebarOverlay = document.getElementById("sidebarOverlay");


function openSidebar() {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add("show");

}


function closeSidebar() {

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove("show");

}


document.getElementById("menuToggle")
    .addEventListener("click", openSidebar);

document.getElementById("closeSidebar")
    .addEventListener("click", closeSidebar);

sidebarOverlay.addEventListener("click", closeSidebar);


// ========================================
// CSV EXPORT
// ========================================

document.getElementById("exportReport")
    .addEventListener("click", async () => {

        try {

            const data = await request(API);

            if (data.length === 0) {

                showToast("No student records to export.");

                return;
            }

            const headers = [
                "Student ID",
                "Name",
                "Email",
                "Course",
                "Year Level",
                "Status"
            ];

            const rows = data.map(student => [

                student.student_id,
                student.name,
                student.email,
                student.course,
                student.year_level,
                student.status

            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(value => {

                    let text = String(value ?? "");

                    if (/^[=+\-@\t\r]/.test(text)) {
                        text = "'" + text;
                    }

                    return '"' + text.replace(/"/g, '""') + '"';

                }).join(","))
                .join("\r\n");

            const blob = new Blob(
                ["\uFEFF" + csv],
                { type: "text/csv;charset=utf-8;" }
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;

            link.download = "StudentHub_Records.csv";

            document.body.appendChild(link);

            link.click();

            link.remove();

            URL.revokeObjectURL(url);

            showToast("CSV report exported!");

        } catch (error) {

            showToast("Unable to export report.");

            console.error(error);

        }

    });


// ========================================
// NOTIFICATIONS
// ========================================

document.getElementById("notificationButton")
    .addEventListener("click", () => {

        showToast("You're all caught up!");

    });


// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        closeModal();

        closeSidebar();

        adminMenu.classList.remove("show");

    }

});


// ========================================
// INITIALIZE APPLICATION
// ========================================

async function initializeApp() {

    await Promise.all([
        loadDashboard(),
        loadStudents()
    ]);

    console.log("STUDENTHUB initialized successfully.");

}

initializeApp();
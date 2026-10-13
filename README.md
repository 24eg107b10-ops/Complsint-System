# Online Complaint Management System

A full-stack web application designed for technical training and demonstration that allows users to submit complaints, view all submitted complaints, and mark pending complaints as resolved in real-time.

---

## 1. Project Objective & Features

### Core Features
1. **Submit a Complaint:** Form accepting user's Name, Subject, and Description. Complaints are assigned the status `PENDING` automatically by the backend.
2. **View All Complaints:** Clean, responsive table showing complaint ID, Name, Subject, Description, Status, and Action.
3. **Resolve Complaints:** Interactive "Resolve" button for complaints with `PENDING` status. Once resolved, the button disappears and the status updates to `RESOLVED`.
4. **Persistent MySQL Storage:** All complaints are stored in a MySQL database.
5. **Real-time Feedback:** Comprehensive loading states, success alerts, empty states, and error handling.

---

## 2. Technology Stack

- **Frontend:**
  - React 18
  - Vite
  - JavaScript (ES6+)
  - Clean, responsive CSS
  - Browser Fetch API (no external HTTP libraries)
  - Hosted on **Vercel**
- **Backend:**
  - Java 17+
  - Spring Boot 3.3.x
  - Spring Web (REST API)
  - Spring Data JPA (Hibernate ORM)
  - MySQL Connector/J
  - Maven & Maven Wrapper (`mvnw`)
  - Hosted on **Render** (Web Service)
- **Database:**
  - MySQL 8.x (Local for development, Remote managed MySQL for production)

---

## 3. Project Folder Structure

```text
online-complaint-management/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component with UI and state management
│   │   ├── App.css            # Responsive styles and badges
│   │   └── main.jsx           # Application entry point
│   ├── index.html             # HTML root document
│   ├── package.json           # Frontend dependencies and scripts
│   ├── vite.config.js         # Vite configuration
│   └── .env.example           # Frontend environment variable template
│
├── backend/
│   ├── src/main/java/com/example/complaintmanagement/
│   │   ├── ComplaintManagementApplication.java  # Main class & CORS config
│   │   ├── entity/
│   │   │   └── Complaint.java                  # JPA entity for complaints table
│   │   ├── repository/
│   │   │   └── ComplaintRepository.java        # Spring Data JPA repository
│   │   └── controller/
│   │       └── ComplaintController.java        # REST endpoints & validation
│   ├── src/main/resources/
│   │   └── application.properties              # Spring Boot configuration
│   ├── mvnw / mvnw.cmd / .mvn                  # Maven Wrapper
│   ├── pom.xml                                 # Backend dependencies & build
│   └── .env.example                            # Backend environment variable template
│
├── .gitignore                                  # Excludes target/, node_modules/, secrets
└── README.md                                   # Complete documentation
```

---

## 4. Prerequisites

- **Java Development Kit (JDK):** JDK 17 or higher (tested with JDK 17 & JDK 23).
- **Node.js & npm:** Node.js v18+ and npm v9+ (tested with Node v24 and npm 11).
- **MySQL Server:** MySQL Server 8.x running locally.
- **Git:** Git CLI installed.
- **Spring Tools Suite (STS) / VS Code / IntelliJ IDEA:** Optional IDE for development.

---

## 5. Local Setup Instructions

### Step 1: Set Up Local MySQL Database
1. Open MySQL command line client or MySQL Workbench:
   ```bash
   mysql -u root -p
   ```
2. Create the database named `complaint_db`:
   ```sql
   CREATE DATABASE IF NOT EXISTS complaint_db;
   ```

### Step 2: Configure Backend Database Credentials
If your local MySQL username or password is not `root`/`root`, you can configure them via environment variables or edit `backend/src/main/resources/application.properties`:
- `SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/complaint_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`
- `SPRING_DATASOURCE_USERNAME=root`
- `SPRING_DATASOURCE_PASSWORD=your_password`

### Step 3: Run the Backend
Using the included Maven wrapper in the `backend/` directory:
- **Windows (PowerShell/CMD):**
  ```powershell
  cd backend
  .\mvnw.cmd clean package -DskipTests
  java -jar target/complaint-management-0.0.1-SNAPSHOT.jar
  ```
- **macOS / Linux:**
  ```bash
  cd backend
  ./mvnw clean package -DskipTests
  java -jar target/complaint-management-0.0.1-SNAPSHOT.jar
  ```
The backend will start on **port 8080** and automatically create the `complaints` table in `complaint_db`.

### Step 4: Run the Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at **`http://localhost:5173`**.

---

## 6. REST API Endpoints

Base URL: `http://localhost:8080` (or your deployed Render URL)

| Method | Endpoint | Description | Request Body | Response Status |
|---|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | None | `200 OK` |
| `GET` | `/api/complaints` | Retrieve all complaints | None | `200 OK` |
| `POST` | `/api/complaints` | Submit a new complaint | `{ "name": "...", "subject": "...", "description": "..." }` | `201 Created` |
| `PATCH` | `/api/complaints/{id}/resolve` | Mark complaint as resolved | None | `200 OK` / `404 Not Found` |

### Sample POST Request Body
```json
{
  "name": "Arun",
  "subject": "Classroom issue",
  "description": "The classroom projector is not working."
}
```

---

## 7. Environment Variables

### Backend (`backend/`)
| Variable | Description | Local Default |
|---|---|---|
| `SPRING_DATASOURCE_URL` | Remote MySQL JDBC connection URL | `jdbc:mysql://localhost:3306/complaint_db...` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `root` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `root` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | Hibernate schema mode | `update` |
| `APP_CORS_ALLOWED_ORIGIN` | Allowed Frontend origin(s) | `http://localhost:5173` |
| `PORT` | Web server listening port | `8080` |

### Frontend (`frontend/`)
| Variable | Description | Local Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:8080` |

---

## 8. Cloud Database Setup (Managed MySQL)

To host the backend on Render, a remotely accessible MySQL database is required:

### Recommended Free-Tier Managed MySQL Providers:
1. **Aiven (MySQL Free Tier):**
   - Free managed MySQL plan (1 CPU, 1 GB RAM, 1 GB storage).
   - No credit card required.
   - Requires free account registration at [https://aiven.io](https://aiven.io).
2. **TiDB Cloud (Serverless MySQL-compatible):**
   - 5 GB free storage, standard MySQL protocol connection.
   - No credit card required.
   - Register at [https://tidbcloud.com](https://tidbcloud.com).
3. **Clever Cloud:**
   - Free MySQL add-on (sandbox plan).
   - Register at [https://www.clever-cloud.com](https://www.clever-cloud.com).

### Information Needed from the Provider:
- **Host / Endpoint:** e.g. `mysql-xyz.aivencloud.com`
- **Port:** e.g. `3306` (or `4000` on TiDB)
- **Database Name:** e.g. `complaint_db` or `defaultdb`
- **Username:** e.g. `avnadmin` or `root`
- **Password:** securely generated database password
- **SSL requirement:** append `?sslMode=REQUIRED` or `?useSSL=true` to the JDBC URL.

---

## 9. Backend Deployment on Render

1. Log in to [Render](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure service parameters:
   - **Name:** `online-complaint-backend`
   - **Region:** Closest to your database location (e.g. Frankfurt, Oregon, Singapore)
   - **Root Directory:** `backend`
   - **Runtime:** `Java` (or Docker if preferred)
   - **Build Command:** `./mvnw clean package -DskipTests`
   - **Start Command:** `java -jar target/complaint-management-0.0.1-SNAPSHOT.jar`
   - **Instance Type:** `Free`
5. In the **Environment Variables** section, add:
   - `SPRING_DATASOURCE_URL`: (your remote MySQL JDBC URL)
   - `SPRING_DATASOURCE_USERNAME`: (your database username)
   - `SPRING_DATASOURCE_PASSWORD`: (your database password)
   - `SPRING_JPA_HIBERNATE_DDL_AUTO`: `update`
   - `APP_CORS_ALLOWED_ORIGIN`: (your Vercel frontend URL, e.g. `https://complaint-management.vercel.app`)
6. Click **Deploy Web Service**.
7. Once deployed, test `https://your-backend-name.onrender.com/api/health`.

---

## 10. Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** click **Edit** and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. In **Environment Variables**, add:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** Your deployed Render backend URL (e.g., `https://online-complaint-backend.onrender.com` without trailing slash)
6. Click **Deploy**.
7. Once deployed, copy your production Vercel URL and update the `APP_CORS_ALLOWED_ORIGIN` variable in your Render backend settings so CORS requests succeed.

---

## 11. Troubleshooting & Known Free Tier Limitations

- **Render Cold Starts:** Free Render web services spin down after 15 minutes of inactivity. The first request after a period of dormancy may take 30–60 seconds to respond. This is normal behavior on free plans.
- **CORS Issues:** If your frontend displays `Failed to fetch` or browser console shows CORS errors, ensure `APP_CORS_ALLOWED_ORIGIN` in Render matches your exact Vercel URL (e.g., `https://my-app.vercel.app` without trailing slash).
- **Vite Environment Variables:** Remember that Vite embeds `VITE_API_BASE_URL` at build time. Whenever you change this variable on Vercel, trigger a **Redeploy** for changes to take effect.
- **Remote MySQL SSL:** Managed cloud databases require SSL connections. Make sure your JDBC URL includes `?sslMode=REQUIRED` (or `?useSSL=true&verifyServerCertificate=false`).

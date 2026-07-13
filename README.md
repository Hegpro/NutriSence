# NutriSense AI 🥗

NutriSense is a premium, state-of-the-art AI-powered personalized nutrition coach and daily meal planner. Built using **FastAPI** (Python) on the backend and **Next.js** (TypeScript) with **TailwindCSS** on the frontend, it features an interactive drag-and-drop workflow graph built with **React Flow** and **LangGraph** to model multi-stage agentic logic.

---

## Key Features 🚀

- **Agentic LangGraph Pipeline**: A structured workflow that executes:
  1. **Load Memory**: Fetches historical user feedback and previous meals.
  2. **Read Profile**: Loads physical characteristics, diet choices, and allergens.
  3. **Analyze Goal & Macros**: Computes targeted daily caloric and protein thresholds.
  4. **Generate Meals (Groq-Powered)**: Calls Groq to compile custom breakfast and dinner menus.
  5. **Validate Nutrition**: Checks generated ingredients against allergy rules and calorie ranges.
  6. **Save History**: Writes meals to database and updates ChromaDB episodic memory.
  7. **Schedule Reminder**: Dispatches automated email meal notifications 1 hour before dining.
- **Two-Stage AI Nutrition Calculator**: 
  - *Stage 1 (Culinary Design)*: Generates the recipes and ingredients lists.
  - *Stage 2 (Precise Nutritional Estimation)*: Uses a specialized model call to accurately estimate the calories and macronutrients for *each individual ingredient* and aggregate them.
- **Dynamic Workflow Builder**: Interactive React Flow canvas to drag, configure, and enable/disable individual nodes in the pipeline in real-time.
- **Sleek Premium UI**: Glassmorphic dark theme dashboard featuring animated charts (Recharts), calendar grids, and user preference cards.
- **Secure Authentication & OTP Reset**: Full JWT-based auth flow complete with Brevo SMTP email OTP password recovery.

---

## Tech Stack 🛠️

### Backend
- **Core**: Python 3.12, FastAPI
- **Agent Framework**: LangGraph, LangChain
- **LLM Engine**: Groq (Llama 3.1 8B Instant)
- **Database (Relational)**: SQLite / Supabase PostgreSQL (SQLAlchemy ORM)
- **Vector Search (Memory)**: ChromaDB Cloud
- **Scheduler & Alerts**: APScheduler, Brevo SMTP client

### Frontend
- **Framework**: Next.js (App Router), React 19, TypeScript
- **Styling**: TailwindCSS, Vanilla CSS variables
- **State & Routing**: React Context API, Next Navigation
- **Visualization**: Recharts, Lucide Icons, React Flow

---

## Installation & Setup 💻

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   PORT=8000
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
   JWT_SECRET=your_jwt_secret_key
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Groq API Configuration
   GROQ_API_KEY=your_groq_api_key

   # Brevo Email SMTP Configuration
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your_verified_sender_email
   BREVO_SENDER_NAME="NutriSense AI Coach"

   # ChromaDB Cloud Configuration
   CHROMA_API_KEY=your_chroma_api_key
   CHROMA_TENANT=your_chroma_tenant_id
   CHROMA_DATABASE=NutriSence
   CHROMA_HOST=api.trychroma.com
   ```
5. Run the server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file (optional, defaults to port 8000):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the development build:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:3000`.

---

## Database Connection Cleaning 🧯
The database manager includes built-in URL-encoding. If your Supabase/PostgreSQL password contains special characters (like `@`), they are parsed programmatically and encoded automatically so that standard SQLAlchemy connections do not break.

---

## License 📄
This project is proprietary and for personal evaluation. All rights reserved.

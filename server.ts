import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_TEST_MODULES, INITIAL_USERS, INITIAL_ATTEMPTS } from "./src/data/initialData";
import { TestModule, Question, UserProfile, UserAttempt } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// In-memory storage with initial data
let testModules: TestModule[] = [...INITIAL_TEST_MODULES];
let registeredUsers: UserProfile[] = [...INITIAL_USERS];
let userAttempts: UserAttempt[] = [...INITIAL_ATTEMPTS];

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY sozlanmagan. Iltimos, sozlamalardan API kalitini kiriting.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Get initial data
app.get("/api/data", (req, res) => {
  res.json({
    modules: testModules,
    users: registeredUsers,
    attempts: userAttempts,
  });
});

const ADMIN_EMAILS = ["ismoilovshohjahon750@gmail.com", "ranvar611@gmail.com"];

// API: Save user test attempt
app.post("/api/attempts", (req, res) => {
  const { userId, userName, userEmail, testId, testTitle, score, totalQuestions } = req.body;
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const newAttempt: UserAttempt = {
    id: "att-" + Date.now(),
    userId: userId || "guest",
    userName: userName || "Foydalanuvchi",
    userEmail: userEmail || "guest@mail.com",
    testId,
    testTitle,
    score,
    totalQuestions,
    percentage,
    completedAt: new Date().toLocaleString("uz-UZ"),
  };

  userAttempts.unshift(newAttempt);

  // Update user statistics
  let user = registeredUsers.find((u) => u.email === userEmail);
  if (!user && userEmail) {
    user = {
      id: "usr-" + Date.now(),
      name: userName || "Foydalanuvchi",
      email: userEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || "User")}`,
      role: ADMIN_EMAILS.includes(userEmail.toLowerCase()) ? "admin" : "student",
      registeredAt: new Date().toISOString().split("T")[0],
      lastActive: "Hozir",
      testsTaken: 0,
      avgScore: 0,
    };
    registeredUsers.push(user);
  }

  if (user) {
    user.testsTaken += 1;
    user.lastActive = "Hozir";
    const userAllAttempts = userAttempts.filter((a) => a.userEmail === userEmail);
    const sumPercent = userAllAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
    user.avgScore = Math.round(sumPercent / userAllAttempts.length);
  }

  res.json({ success: true, attempt: newAttempt });
});

// API: Google / Custom Auth
app.post("/api/auth/login", (req, res) => {
  const { email, name, avatar } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email kiritilmadi" });
  }

  let user = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

  if (!user) {
    user = {
      id: "usr-" + Date.now(),
      name: name || (isAdmin ? "Shohjahon Ismoilov" : "Talaba"),
      email: email,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`,
      role: isAdmin ? "admin" : "student",
      registeredAt: new Date().toISOString().split("T")[0],
      lastActive: "Hozir",
      testsTaken: 0,
      avgScore: 0,
    };
    registeredUsers.push(user);
  } else {
    user.lastActive = "Hozir";
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (isAdmin) user.role = "admin";
  }

  res.json({ user, isAdmin });
});

// API: Add or update test module and questions
app.post("/api/modules", (req, res) => {
  const { id, title, level, questions } = req.body;

  let existingIndex = testModules.findIndex((m) => m.id === id);
  if (existingIndex >= 0) {
    testModules[existingIndex] = { id, title, level, questions };
  } else {
    testModules.push({ id, title, level, questions });
  }

  res.json({ success: true, modules: testModules });
});

// API: Delete test module or question
app.delete("/api/modules/:id", (req, res) => {
  const { id } = req.params;
  testModules = testModules.filter((m) => m.id !== id);
  res.json({ success: true, modules: testModules });
});

// API: AI 3-Step Wizard PDF Question Parser
app.post("/api/ai/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64, mimeType, rawText, level, testTitle } = req.body;

    if (!pdfBase64 && !rawText) {
      return res.status(400).json({ error: "PDF fayli yoki matn yuborilmadi." });
    }

    const ai = getGeminiClient();

    const promptText = `
Sen IC3 GS6 sertifikatlash imtihonlari va testlarini tahlil qiluvchi va tahrirlovchi professional AI tizimisan.
Senga IC3 GS6 testi savollari va hujjat oxiridagi Kalitlar / Javoblar jadvali (Answer Key) bo'lgan PDF/matn berilmoqda.

VAZIFANG:
1. Hujjatdagi barcha savollarni va oxirida berilgan javoblar kalitini (Kalitlar jadvalini) to'liq o'rganib chiq.
2. Har bir savol uchun to'g'ri javoblarni javoblar kaliti bilan aniq moslashtir ('ok': true deb belgilang).
3. Savollarning turini aniq belgilang:
   - 'single': Bitta to'g'ri javobli ko'p tanlovli savol.
   - 'multi': Bir nechta to'g'ri javobli savol.
   - 'yn': Ha/Yo'q yoki To'g'ri/Noto'g'ri (Yes/No, True/False) mulohazalar to'plami.
   - 'match': Atamalar va ta'riflarni moslashtirish (Matching).
   - 'order': Qadamlar yoki bosqichlarni to'g'ri ketma-ketlikda joylashtirish (Order).
4. Har bir savol matnini va variantlarini ingliz tilidan o'zbek tiliga aniq va akademik darajada tarjima qil ('qen' va 'quz', variantlarda 'en' va 'uz').
5. Javoblarni quyidagi JSON array formatida qaytar.
   Javob FAQAT VA FAQAT haqiqiy JSON array bo'lishi kerak.

SCHEMA FORMAT:
[
  {
    "n": 1,
    "type": "single",
    "qen": "Which device is an input device?",
    "quz": "Qaysi qurilma kiritish qurilmasi hisoblanadi?",
    "opts": [
      { "en": "Keyboard", "uz": "Klaviatura", "ok": true },
      { "en": "Monitor", "uz": "Monitor", "ok": false }
    ],
    "need": 1
  },
  {
    "n": 2,
    "type": "yn",
    "qen": "Evaluate the following statements:",
    "quz": "Quyidagi mulohazalarni baholang:",
    "yn": [
      { "en": "RAM is permanent memory.", "uz": "RAM doimiy xotira hisoblanadi.", "ok": false },
      { "en": "SSD is faster than HDD.", "uz": "SSD HDD dan tezroq.", "ok": true }
    ]
  },
  {
    "n": 3,
    "type": "match",
    "qen": "Match the items:",
    "quz": "Atamalarni moslang:",
    "pairs": [
      { "t": "CPU", "en": "Central Processing Unit", "uz": "Markaziy protsessor" }
    ]
  },
  {
    "n": 4,
    "type": "order",
    "qen": "Order the steps:",
    "quz": "Bosqichlarni ketma-ket joylashtiring:",
    "steps": [
      { "en": "Step 1", "uz": "1-bosqich" },
      { "en": "Step 2", "uz": "2-bosqich" }
    ]
  }
]
`;

    let contentsParts: any[] = [];

    if (pdfBase64) {
      contentsParts.push({
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: pdfBase64,
        },
      });
    }

    if (rawText) {
      contentsParts.push({ text: `Hujjat matni:\n${rawText}` });
    }

    contentsParts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: contentsParts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "[]";
    let parsedQuestions: Question[] = [];

    try {
      parsedQuestions = JSON.parse(responseText);
    } catch (e) {
      console.error("JSON Parse Error:", e, responseText);
      // Clean up markdown code block if present
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedQuestions = JSON.parse(cleanJson);
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(400).json({ error: "Fayldan savollarni ajratib bo'lmadi. Iltimos, PDF faylni tekshiring." });
    }

    // Assign / update module
    const moduleId = "mod-" + Date.now();
    const newModule: TestModule = {
      id: moduleId,
      title: testTitle || `${level || 'Level 1'} — Yangi Test`,
      level: level || "Level 1",
      questions: parsedQuestions,
    };

    testModules.push(newModule);

    res.json({
      success: true,
      module: newModule,
      extractedCount: parsedQuestions.length,
      allModules: testModules,
    });
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    res.status(500).json({ error: error.message || "PDF tahlil qilishda xatolik yuz berdi." });
  }
});

async function startServer() {
  // Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server start error:", err);
  process.exit(1);
});

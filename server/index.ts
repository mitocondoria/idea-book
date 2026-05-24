import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { rateLimit } from "express-rate-limit";

dotenv.config({
    path: "./server/.env",
});
const app = express();
const PORT = 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, false);
            return;
        }

        callback(null, allowedOrigins.includes(origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    exposedHeaders: [
        "RateLimit-Remaining",
        "RateLimit-Reset",
    ]
}));

app.use(express.json({ limit: "10kb" }));

const apilimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    message: {
        error: "リクエストが多すぎます。しばらく待ってから再度お試しください。",
    },
});
const fetchRandomKanji = async ()=>{
    try {
        const url = `https://jlpt-vocab-api.vercel.app/api/words/random`;

        console.log("Request URL:", url);

        const response = await fetch(url, {
            method: "GET",
        });

        if (!response.ok) {
            const text = await response.text();

            console.error("Kanji API error:", response.status);
            console.error("Response body:", text);
            return;
        }

        return response.json();
    } catch (error) {
        console.error("Server error:", error);
    }
}
app.post("/api", apilimiter, async (req, res) => {
    let kanjis: Array<string> = [];
    try {
        for (let i: number = 0; i < parseInt(req.body.count); i++) {

            const res = await fetchRandomKanji();
            kanjis.push(res.word);
        }
    } catch (error) {
        res.json({
            text: "error1",
            kanjis: null,
            phase: "revealed"
        })
        return;
    }
    const result: string[] | null = kanjis ? kanjis : null;
    let prompt: string | null = null;
    if (result) {
        prompt = '「' + result + '」という漢字から連想されるwebアプリのアイデアを出して下さい'
    } else {
        res.json({
            text: "error2",
            kanjis: null,
            phase: "revealed"
        })
        return;
    }
    await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.Groq_AI_API}`,
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "user",
                    content: prompt || "エラーと言って",
                },
            ],
        }),
    })
        .then((response) => {
            return response.json()
        }).then((data) => {
            res.json({
                text: data.choices[0].message.content,
                kanjis: kanjis,
                phase: "revealed"
            })
        }).catch((error) => {
            console.log(error);

            res.status(500).json({
                error: "サーバー側でエラーが発生しました",
            });
        })
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
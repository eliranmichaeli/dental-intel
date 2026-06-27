const SYSTEM_PROMPT = `אתה סוכן מודיעין עסקי בכיר המתמחה בשוק הישראלי בלבד.
תפיק דוחות על ענף רפואת השיניים והרפואה האסתטית בישראל.
חפש ברשת מידע אמיתי ועדכני בלבד. אל תמציא נתונים. ציין מקורות.

מנגנון דירוג: חדשנות 40% + פוטנציאל עסקי 40% + רלוונטיות לישראל 20%. הצג רק ממצאים עם ציון 70+.

כתוב את הדוח בעברית עסקית, קצר וממוקד:

# דוח מודיעין יומי — רפואת שיניים ואסתטיקה בישראל
תאריך: [היום]

## תקציר מנהלים
5 התובנות החשובות ביותר

## טרנדים חדשים
תיאור | מקור | רמת חשיבות | ציון

## סלוגנים ורעיונות שיווקיים
מרפאה | סלוגן | מדוע עובד | מה ניתן ללמוד

## מחירים ומבצעים
מחיר נמוך / ממוצע / פרימיום לכל טיפול

## פעילות מתחרים
שינויים משמעותיים בשוק

## הזדמנויות לפני כולם
תיאור | פוטנציאל | תחרות | המלצה

## המלצות פעולה
30 יום | 6 חודשים | רשימת מעקב`;

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").find(c => c.trim().startsWith(name + "="));
  return match ? match.trim().split("=").slice(1).join("=") : null;
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const cookieHeader = event.headers["cookie"] || event.headers["Cookie"] || "";
  const authCookie = getCookie(cookieHeader, "auth");
  const secret = process.env.AUTH_SECRET || "dental-secret";
  if (!authCookie || authCookie !== secret) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { prompt } = body;
  if (!prompt) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing prompt" }) };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "GEMINI_API_KEY not configured" }) };

  try {
    // Use gemini-1.5-flash - free tier with generous limits
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT + "\n\n" + prompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, headers, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join("\n") || "לא התקבל תוכן.";

    return { statusCode: 200, headers, body: JSON.stringify({ report: text }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

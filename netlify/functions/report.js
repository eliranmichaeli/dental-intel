const SYSTEM_PROMPT = `אתה סוכן מודיעין עסקי בכיר המתמחה בשוק הישראלי בלבד.
תפיק דוחות על ענף רפואת השיניים והרפואה האסתטית בישראל.
השתמש בחיפוש ברשת למידע אמיתי ועדכני בלבד. אל תמציא נתונים.

מנגנון דירוג: חדשנות 40% + פוטנציאל עסקי 40% + רלוונטיות לישראל 20%. הצג רק ממצאים עם ציון 70+.

כתוב את הדוח בעברית עסקית, קצר וממוקד, בפורמט הבא:

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
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Auth check
  const cookieHeader = event.headers["cookie"] || event.headers["Cookie"] || "";
  const authCookie = getCookie(cookieHeader, "auth");
  const secret = process.env.AUTH_SECRET || "dental-secret";

  if (!authCookie || authCookie !== secret) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { prompt } = body;
  if (!prompt) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing prompt" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, headers: corsHeaders, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ report: text }) };

  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};

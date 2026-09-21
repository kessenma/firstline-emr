// apps/web/utils/translate/translate.ts
export default async function translate(
  text: string,
  lang: string,
): Promise<string> {
  if (lang === "Disabled") {
    return text;
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ text: text, targetLang: lang }),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("Failed to translate text:", res.status, errorData);
      return text;
    }

    const data = await res.json();
    return data.translatedText || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

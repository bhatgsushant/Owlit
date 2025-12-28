
const safeJsonParseWithMarkdown = (text) => {
    if (!text) return null;
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid JSON format from AI');
    }
};

module.exports = { safeJsonParseWithMarkdown };

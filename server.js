const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/spy', async (req, res) => {
    let scriptContent = req.body.script;

    // 1. Fetch if it's a URL
    if (scriptContent.startsWith("http")) {
        try {
            const response = await axios.get(scriptContent);
            scriptContent = response.data;
        } catch (e) {
            return res.json({ status: 200, data: "❌ Error: Could not fetch link." });
        }
    }

    // 2. Patterns that match typical logging/webhook functions
    // This looks for: syn.request, http_request, HttpPost, and webhook URLs
    const patterns = [
        /(https?:\/\/[^\s"']+discord[^\s"']+)/gi, // Discord Webhooks
        /(https?:\/\/[^\s"']+webhook[^\s"']+)/gi, // Generic Webhooks
        /(syn\.request|http_request|HttpPost|HttpGet|request)\s*\([^\)]*\)/gi // Hook functions
    ];

    let found = [];
    patterns.forEach(regex => {
        let matches = scriptContent.match(regex);
        if (matches) found.push(...matches);
    });

    // 3. Return results
    if (found.length > 0) {
        res.json({ status: 200, data: "⚠️ Potential malicious patterns found:\n" + [...new Set(found)].join("\n") });
    } else {
        res.json({ status: 200, data: "✅ No suspicious network calls found." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scanner active on port ${PORT}`));

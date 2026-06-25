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
            return res.json({ status: 500, data: "❌ Error: Could not fetch URL." });
        }
    }

    // 2. Use Regex to find any string that looks like a URL
    // This pattern looks for "http" followed by characters that aren't quotes
    const urlRegex = /(https?:\/\/[^\s"']+)/g;
    const matches = scriptContent.match(urlRegex);

    // 3. Return the results
    if (matches) {
        // Remove duplicates and join
        const uniqueLinks = [...new Set(matches)];
        res.json({ status: 200, data: uniqueLinks.join("\n") });
    } else {
        res.json({ status: 200, data: "✅ No obvious links found." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scanner active on port ${PORT}`));

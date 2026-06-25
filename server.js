const express = require('express');
const axios = require('axios');
const { factory } = require('wasmoon');
const app = express();
app.use(express.json());

app.post('/spy', async (req, res) => {
    let scriptContent = req.body.script;
    if (scriptContent.startsWith("http")) {
        try {
            const response = await axios.get(scriptContent);
            scriptContent = response.data;
        } catch (e) { return res.json({ status: 500, data: "Could not fetch URL." }); }
    }

    try {
        const lua = await factory();
        let interceptedLinks = [];

        // This is the function that captures the requests
        lua.global.set('log_request', (method, url) => {
            interceptedLinks.push(`[${method}] ${url}`);
        });

        // MOCKING: Define the Roblox functions so the script doesn't crash
        const mockEnv = `
            local function log(method, url) log_request(method, url) end
            game = { GetService = function(self, name) return {} end }
            function game:HttpGet(url) log("GET", url) return "" end
            function game:HttpPost(url, data) log("POST", url) return "" end
            
            local function req(options)
                local method = (type(options) == "table" and options.Method) or "GET"
                local url = (type(options) == "table" and options.Url) or options or "unknown"
                log(method, url)
                return { StatusCode = 200, Body = "", Headers = {} }
            end
            
            request = req
            http_request = req
            syn = { request = req }
            fluxus = { request = req }
            krnl = { request = req }
            delta = { request = req }
        `;

        await lua.doString(mockEnv + "\n" + scriptContent);
        res.json({ status: 200, data: interceptedLinks.length > 0 ? interceptedLinks.join("\n") : "No HTTP requests found." });
    } catch (err) {
        res.json({ status: 500, data: "Error: " + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API active`));

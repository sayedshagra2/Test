const express = require('express');
const axios = require('axios');
const { factory } = require('wasmoon');
const app = express();

app.use(express.json());

app.post('/spy', async (req, res) => {
    let scriptContent = req.body.script;
    
    // If the input is a URL (like Pastebin/GitHub raw), fetch the code first
    if (scriptContent.startsWith("http")) {
        try {
            const response = await axios.get(scriptContent);
            scriptContent = response.data;
        } catch (e) {
            return res.json({ status: 500, data: "❌ Error: Could not fetch the provided link. Ensure it is a 'Raw' link." });
        }
    }

    try {
        const lua = await factory();
        let interceptedLinks = [];
        
        // This function captures the data inside the Lua VM
        lua.global.set('log_request', (method, url) => {
            interceptedLinks.push(`[${method}] ${url}`);
        });

        // The Hooking Logic: Mocks every possible Roblox request function
        const hookLogic = `
            game = {}
            function game:HttpGet(url) log_request("GET", url) return "mock" end
            function game:HttpPost(url, data) log_request("POST", url) return "mock" end
            
            local function mock_req(options)
                local method = (type(options) == "table" and options.Method) or "GET"
                local url = (type(options) == "table" and options.Url) or (type(options) == "string" and options) or "unknown"
                log_request(method, url)
                return { StatusCode = 200, Body = "mock", Headers = {} }
            end
            
            request = mock_req
            http_request = mock_req
            syn = { request = mock_req }
            fluxus = { request = mock_req }
            krnl = { request = mock_req }
            delta = { request = mock_req }
        `;

        await lua.doString(hookLogic + "\n" + scriptContent);
        
        const result = interceptedLinks.length > 0 
            ? interceptedLinks.join("\n") 
            : "✅ No IP loggers or webhooks found.";
            
        res.json({ status: 200, data: result });
    } catch (err) {
        res.json({ status: 500, data: "❌ Error: Script execution failed. It might be too complex or contain invalid syntax." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTPSpy API active on port ${PORT}`));

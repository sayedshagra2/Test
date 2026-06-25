const express = require('express');
const axios = require('axios');
const { LuaFactory } = require('wasmoon');
const app = express();
app.use(express.json());

app.post('/spy', async (req, res) => {
    let scriptContent = req.body.script;
    
    if (scriptContent.startsWith("http")) {
        try {
            const response = await axios.get(scriptContent);
            scriptContent = response.data;
        } catch (e) { return res.json({ status: 500, data: "❌ Fetch Error" }); }
    }

    try {
        const factory = new LuaFactory();
        const lua = await factory.createEngine();
        let intercepted = [];

        // Define a global function that the Lua script can call to "log" a request
        const log = (method, url) => intercepted.push(`[${method}] ${url}`);
        
        // Expose this to Lua
        lua.global.set('log', log);

        // Pre-define the Roblox environment
        await lua.doString(`
            game = { GetService = function(self, name) return {} end }
            function game:HttpGet(u) log("GET", u) return "" end
            function game:HttpPost(u, d) log("POST", u) return "" end
            
            local function r(o) 
                local u = (type(o) == "string") and o or (o.Url or "unknown")
                local m = (o.Method or "GET")
                log(m, u)
                return { StatusCode = 200, Body = "", Headers = {} }
            end
            
            syn = { request = r }
            http_request = r
            request = r
            fluxus = { request = r }
        `);

        await lua.doString(scriptContent);
        
        res.json({ status: 200, data: intercepted.length > 0 ? intercepted.join("\n") : "✅ No calls detected." });
    } catch (err) {
        res.json({ status: 200, data: "⚠️ Execution incomplete (likely obfuscated): " + err.message.substring(0, 50) });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API Active'));

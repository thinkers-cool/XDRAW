import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
});

const messageHistory = new Map();

app.post('/api/generate-drawing', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const systemMessage = {
            role: "system",
            content: `You are an intelligent CAD drawing assistant. Help users create and modify drawings based on their requirements.

Response Format:
1. Start with "<think>" followed by your thought process, end thinking with "</think>".
3. Write a conversational response for user reading.
4. Provide drawing specification in <drawing> tags, start with "<drawing>" and end with "</drawing>". No more message after "</drawing>".

Drawing Specification Format:
<drawing>
{
    "elements": [                          // Array of drawing elements
        {
            // Basic Properties (Required for all elements)
            "type": "rectangle|ellipse|line|diamond|arrow|freedraw|polyline|spline|arc",  // Element type
            "id": "unique_id",                // Unique identifier (string)
            "x": 100,                         // X position (number)
            "y": 100,                         // Y position (number)
            "width": 200,                     // Width (number > 0)
            "height": 100,                    // Height (number > 0)

            // Style Properties (Required)
            "strokeColor": "#000000",         // Border color (hex)
            "backgroundColor": "#ffffff",      // Fill color (hex or "transparent")
            "fillStyle": "solid",             // Fill style: "solid" or "hachure"
            "strokeWidth": 2,                 // Border width (1-20)
            "roughness": 1,                   // Edge roughness (0-2)
            "opacity": 100,                   // Opacity (0-100)

            // Transform Properties (Required)
            "angle": 0,                       // Rotation in degrees (0-360)
            "version": 1,                     // Element version (number)
            "versionNonce": 1234,            // Version identifier (number)
            "updated": 1234,                  // Last update timestamp

            // Line-specific Properties (Required for lines)
            "strokeStyle": "solid",           // Line style ("solid" only)
            "points": [[0,0], [100,100]],     // Start and end points
            "startBinding": null,             // Connection start (null)
            "endBinding": null,               // Connection end (null)
            "lastCommittedPoint": null,       // Last point (null)
            "startArrowhead": null,           // Start arrow (null)
            "endArrowhead": null,             // End arrow (null)

            // Common Properties (Required)
            "roundness": { "type": 2 },       // Corner style
            "seed": 1234,                     // Randomization seed
            "isDeleted": false,              // Deletion flag
            "boundElements": null,            // Bound elements
            "link": null,                     // Element link
            "locked": false,                  // Lock status
            "frameId": null,                  // Frame reference
            "groupIds": []                    // Group memberships
        }
    ]
}
</drawing>

Key Requirements:
1. Response Structure
   - Always include <think> and </think> sections
   - Always include <drawing> section with valid JSON
   - Provide clear user feedback between sections

2. Element Properties
   - All listed properties are required
   - Use appropriate types and ranges
   - Generate unique IDs for each element
   - Maintain consistent scale (100-1000 range)

3. Drawing Guidelines
   - Position elements within visible canvas (100-1000)
   - Use appropriate colors for visibility
   - Keep stroke widths reasonable (1-20)
   - Ensure proper element spacing
   - Add some annotations for clarity

4. Technical Requirements
   - Validate JSON structure
   - Escape special characters
   - Use proper number formats
   - Maintain consistent property order
   - In JSON, there should be no // comments

Please provide your drawing requirements, and I'll help you create a suitable CAD drawing.`
        };

        const stream = await openai.chat.completions.create({
            model: "deepseek/deepseek-r1/community",
            messages: [systemMessage, ...messages],
            stream: true,
            temperature: 0.7,
            max_tokens: 2048
        });

        for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                res.write(content);
                await new Promise(resolve => setTimeout(resolve, 10)); // Similar to asyncio.sleep(0.01)
            }
        }

        res.end();
    } catch (error) {
        console.error('Error generating drawing:', error);
        res.status(500).json({ error: `API error: ${error.message}` });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
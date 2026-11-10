import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function aiBomPlugin(): Plugin {
  return {
    name: 'ai-bom-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/ai/parse-recipe-bom', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { text, catalogue } = JSON.parse(body || '{}');
            if (!text) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Recipe text is required' }));
              return;
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
              return;
            }

            const ai = new GoogleGenAI();
            const prompt = `You are an expert Restaurant ERP Master Data AI specializing in East African / Tanzanian restaurant kitchens.
The user provides messy, natural language chef notes (often mixing Swahili and English):
"${text}"

Current Raw Ingredients in the Restaurant Catalogue:
${JSON.stringify(catalogue, null, 2)}

Instructions:
1. Extract the recipe dish name and batch portions count (default to 1 if not stated).
2. For each raw ingredient mentioned:
   - Identify raw name, quantity, and raw unit.
   - Match to the closest item in the catalogue (e.g., 'nyanya' -> 'Fresh Roma Tomatoes', 'vitunguu' -> 'Red Cooking Onions', 'viazi' -> 'Irish Potatoes', 'mafuta' -> 'Pure Sunflower Cooking Oil', 'mayai' -> 'Farm Fresh Organic Eggs', 'kuku' -> 'Chicken', 'samaki' -> 'Salmon/Fish').
   - Return confidence score between 0 and 100.
   - Convert quantity to base consumption unit (grams, ml, or pcs) scaled to 1 single plate portion.
   - Suggest typical yield percentage (e.g. 55% for whole fish, 90% for onions, 85% for peeled potatoes, 100% for oil).
   - Flag anomalies (extreme salt > 15g per plate, oil > 120ml per plate, low confidence < 75%).
Output strict JSON with this structure:
{
  "recipeName": string,
  "batchPortions": number,
  "prepInstructions": string,
  "lines": [
    {
      "rawText": string,
      "rawIngredientName": string,
      "matchedIngredientId": string | null,
      "matchedIngredientName": string,
      "confidence": number,
      "quantityPerBatch": number,
      "rawUnit": string,
      "normalizedBaseQuantity": number,
      "baseUnit": "grams" | "ml" | "pcs",
      "typicalYieldPercentage": number,
      "notes": string,
      "isAnomaly": boolean,
      "anomalyReason": string
    }
  ],
  "anomalies": string[]
}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(response.text || '{}');
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'AI parsing error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiBomPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


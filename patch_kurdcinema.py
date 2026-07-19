import re

with open('server.ts', 'r') as f:
    content = f.read()

import_statement = "import { searchKurdcinema, scrapeComments } from './src/lib/kurdcinemaService.js';\n"
content = import_statement + content

routes = """
  // API: Kurdcinema Search
  app.get("/api/kurdcinema/search", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { q, type } = req.query;
      if (!q) {
        res.status(400).json({ error: "Missing query parameter" });
        return;
      }
      const results = await searchKurdcinema(q as string, (type as string) || 'all');
      res.json(results);
    } catch (error: any) {
      console.error('Kurdcinema search error:', error);
      res.status(500).json({ error: error.message || "Failed to search Kurdcinema" });
    }
  });

  // API: Kurdcinema Comments
  app.get("/api/kurdcinema/comments", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { url, type } = req.query;
      if (!url) {
        res.status(400).json({ error: "Missing url parameter" });
        return;
      }
      const data = await scrapeComments(url as string, (type as string) || 'movie', true);
      res.json(data);
    } catch (error: any) {
      console.error('Kurdcinema comments error:', error);
      res.status(500).json({ error: error.message || "Failed to fetch Kurdcinema comments" });
    }
  });
"""

content = content.replace('  app.get("/api/health",', routes + '\n  app.get("/api/health",')

with open('server.ts', 'w') as f:
    f.write(content)

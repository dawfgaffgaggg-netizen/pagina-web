export default async function handler(req, res) {
  const { id } = req.query;

  const userAgent = req.headers['user-agent'] || '';
  const acceptHeader = req.headers['accept'] || '';
  const isBrowserAccess = acceptHeader.includes('text/html');
  const isRoblox = userAgent.toLowerCase().includes('roblox') ||
                   userAgent.toLowerCase().includes('synapse') ||
                   userAgent.toLowerCase().includes('exploit');

  if (isBrowserAccess && !isRoblox) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(`<!DOCTYPE html><html><head><title>Access Denied - Ocean Hub</title>
    <style>body{margin:0;background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}
    .box{background:#111;padding:40px;border-radius:20px;border:1px solid #ff4444;}h1{color:#ff4444;}p{color:#888;}code{color:#00d4ff;background:#0d0d0d;padding:8px 16px;border-radius:8px;display:block;margin-top:16px;}</style></head>
    <body><div class="box"><h1>Access Denied</h1><p>This script can only be accessed from Roblox</p>
    <code>loadstring(game:HttpGet("https://${req.headers.host}/${id}"))() </code></div></body></html>`);
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  if (!id || id.length !== 6) return res.status(400).send('-- Error: Invalid ID');

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).send('-- Error: Server not configured');

  try {
    // Search through gists for matching ID in description
    let page = 1;
    while (page <= 5) {
      const r = await fetch(`https://api.github.com/gists?per_page=100&page=${page}`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Ocean-Hub',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!r.ok) break;
      const gists = await r.json();
      if (!gists.length) break;

      for (const gist of gists) {
        if (gist.description && gist.description.includes(id)) {
          // Fetch full gist content
          const gistRes = await fetch(`https://api.github.com/gists/${gist.id}`, {
            headers: {
              'Authorization': `token ${token}`,
              'User-Agent': 'Ocean-Hub'
            }
          });
          const gistData = await gistRes.json();
          const content = gistData.files?.['script.lua']?.content;
          if (content) return res.status(200).send(content);
        }
      }
      page++;
    }

    return res.status(404).send(`-- Error: Script not found (${id})`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('-- Error: ' + err.message);
  }
}

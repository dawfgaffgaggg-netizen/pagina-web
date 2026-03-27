export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'No content provided' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ success: false, error: 'GitHub token not configured' });

  try {
    const shortId = generateShortId();

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${token}`,
        'User-Agent': 'Ocean-Hub'
      },
      body: JSON.stringify({
        description: `Ocean Hub Script - ${shortId}`,
        public: false,
        files: { 'script.lua': { content } }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('GitHub error:', data);
      throw new Error(data.message || 'GitHub API failed');
    }

    const baseUrl = `https://${req.headers.host}`;
    return res.status(200).json({
      success: true,
      url: `${baseUrl}/${shortId}`,
      shortId,
      gistId: data.id
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

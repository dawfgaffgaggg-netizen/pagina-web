// Netlify Function: /api/callback
// Exchanges the OAuth2 code for a token, fetches user info,
// auto-joins the user to the guild, and returns user data.

exports.handler = async (event) => {
  const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const BOT_TOKEN     = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID      = process.env.DISCORD_GUILD_ID;
  const REDIRECT_URI  = 'https://oceanhub.netlify.app/';

  const headers = {
    'Access-Control-Allow-Origin': 'https://oceanhub.netlify.app',
    'Content-Type': 'application/json',
  };

  const { code } = event.queryStringParameters || {};
  if (!code) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code' }) };
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token exchange failed', detail: tokenData }) };
    }

    // 2. Fetch user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // 3. Auto-join user to guild
    if (GUILD_ID && BOT_TOKEN) {
      await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: tokenData.access_token }),
      });
    }

    const avatar = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id:         user.id,
        username:   user.username,
        globalName: user.global_name || user.username,
        avatar,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

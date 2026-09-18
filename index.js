const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// 1. Ana Sayfa (Web Sitesi & Discord ile Giriş Butonu)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FunceBot - Giriş Yap</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 90%; }
        h1 { margin-bottom: 1rem; font-size: 1.8rem; color: #38bdf8; }
        p { margin-bottom: 2rem; color: #94a3b8; font-size: 0.95rem; }
        .btn-discord { display: inline-flex; align-items: center; justify-content: center; gap: 10px; background-color: #5865F2; color: #fff; text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; transition: background 0.2s ease; width: 100%; }
        .btn-discord:hover { background-color: #4752C4; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>FunceBot Sistem</h1>
        <p>Hesabınızı doğrulamak ve sisteme erişmek için Discord ile giriş yapın.</p>
        <a class="btn-discord" href="/api/auth/discord">
          <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-.87,56.6.18,80.21A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.55-16.14c1.37-27.29-12.02-51.1-19.36-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.92,53.87,53,48.73,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.92,96.1,53,91,65.69,84.69,65.69Z"/></svg>
          Discord ile Giriş Yap
        </a>
      </div>
    </body>
    </html>
  `);
});

// 2. Discord Oauth2 Yönlendirmesi (Eksik olan rota buydu)
app.get('/api/auth/discord', (req, res) => {
  const redirect = encodeURIComponent(REDIRECT_URI);
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirect}&scope=identify+email+role_connections.write`;
  res.redirect(discordAuthUrl);
});

// 3. Callback (Giriş Sonrası İşlemler ve Kullanıcıyı Siteye Taşıma)
app.get('/discord-oauth-callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Yetkilendirme kodu bulunamadı.');
  }

  try {
    // Access Token Al
    const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResponse.data.access_token;

    // Kullanıcı Bilgisini Çek
    const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = userResponse.data;

    // Bağlantılı Rol Verisini Güncelle
    try {
      await axios.put(`https://discord.com/api/v10/users/@me/applications/${CLIENT_ID}/role-connections`, {
        platform_name: 'FunceBot Sistem',
        platform_username: userData.username,
        metadata: { is_verified: 1 },
      }, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.log('Rol bağlantısı güncellenirken uyarı:', err.message);
    }

    // Kullanıcı giriş yaptığında ana web sitene (GitHub Pages) kullanıcı bilgileriyle geri yönlendir
    res.redirect(`https://qvrox.github.io/Roseline/?username=${encodeURIComponent(userData.username)}&avatar=${userData.avatar}&id=${userData.id}`);

  } catch (error) {
    console.error('Discord Auth Hatası:', error.response?.data || error.message);
    res.status(500).send('Giriş yapılırken bir hata oluştu.');
  }
});

// Metadata Kayıt Fonksiyonu
async function registerMetadata() {
  try {
    await axios.put(`https://discord.com/api/v10/applications/${CLIENT_ID}/role-connections/metadata`, [
      { key: 'is_verified', name: 'Doğrulanmış Üye', description: 'Kullanıcı sitede doğrulandı', type: 7 }
    ], {
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    });
    console.log('✅ Metadata hazır.');
  } catch (err) {
    console.error('Metadata hatası:', err.response?.data || err.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
  registerMetadata();
});

const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// 1. Ana Sayfa
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
        <a class="btn-discord" href="/api/auth/discord">Discord ile Giriş Yap</a>
      </div>
    </body>
    </html>
  `);
});

// 2. Discord Oauth2 Yönlendirmesi
app.get('/api/auth/discord', (req, res) => {
  const redirect = encodeURIComponent(REDIRECT_URI);
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirect}&scope=identify+email+role_connections.write`;
  res.redirect(discordAuthUrl);
});

// 3. Callback (Giriş Sonrası İşlemler)
app.get('/discord-oauth-callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Yetkilendirme kodu bulunamadı.');
  }

  try {
    // Token isteği
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

    // Kullanıcı Bilgilerini Çek
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
      console.log('Rol bağlantısı uyarısı:', err.message);
    }

    // Başarıyla yönlendir
    res.redirect(`https://funcebot.work.gd/?username=${encodeURIComponent(userData.username)}&avatar=${userData.avatar}&id=${userData.id}`);

  } catch (error) {
    console.error('Discord Auth Hatası:', error.response?.data || error.message);
    
    // Eğer kod daha önce kullanıldıysa (invalid_grant) direkt ana siteye yönlendir
    if (error.response?.data?.error === 'invalid_grant') {
      return res.redirect('https://funcebot.work.gd/');
    }

    res.status(500).send(`Giriş yapılırken bir hata oluştu: ${JSON.stringify(error.response?.data || error.message)}`);
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

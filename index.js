const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID || "1534831879918977145";
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://funce-linked-roles.onrender.com/discord-oauth-callback';

app.use(cookieParser('funce-secret-cookie-key'));

// Otomatik Metadata Kaydı (Sunucu her açıldığında Discord'a bağlı rol şartını bildirir)
async function registerMetaData() {
  if (!BOT_TOKEN) return console.log('❌ BOT_TOKEN tanımlanmadığı için metadata kaydı atlandı.');
  
  const url = `https://discord.com/api/v10/applications/${CLIENT_ID}/role-connections/metadata`;
  const body = [
    {
      key: 'is_verified',
      name: 'Doğrulanmış Üye',
      description: 'FunceBot web sitesinde hesabını doğrulayan kullanıcı',
      type: 1
    }
  ];

  try {
    const response = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
    });

    if (response.ok) {
      console.log('✅ Başarılı! Bağlı rol metadata verisi Discord API\'sine otomatik kaydedildi.');
    } else {
      const errorData = await response.text();
      console.error('❌ Metadata hatası:', errorData);
    }
  } catch (err) {
    console.error('❌ Bağlantı hatası:', err);
  }
}

// 1. Ana Sayfa
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FunceBot - Bağlantılı Roller</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 400px; width: 100%; }
        h1 { margin-bottom: 0.5rem; color: #38bdf8; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 1.5rem; }
        .btn { display: inline-block; background-color: #5865F2; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; transition: 0.2s; }
        .btn:hover { background-color: #4752C4; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>FunceBot Doğrulama</h1>
        <p>Discord sunucusunda <b>Funce Ailesi</b> rolünü almak için hesabınızı bağlayın.</p>
        <a class="btn" href="/linked-role">Discord ile Giriş Yap ve Bağla</a>
      </div>
    </body>
    </html>
  `);
});

// 2. Kullanıcıyı Discord OAuth2 Yetkilendirme Sayfasına Yönlendirme
app.get('/linked-role', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  res.cookie('clientState', state, { maxAge: 1000 * 60 * 5, signed: true });

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: state,
    scope: 'identify role_connections.write',
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

// 3. Discord Callback Yönlendirmesi
app.get('/discord-oauth-callback', async (req, res) => {
  const { code, state } = req.query;
  const clientState = req.signedCookies.clientState;

  if (state !== clientState) {
    return res.status(403).send('Güvenlik doğrulaması başarısız (State eşleşmedi).');
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      return res.status(400).send('Token alınamadı.');
    }

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userData = await userResponse.json();

    await fetch(`https://discord.com/api/v10/users/@me/applications/${CLIENT_ID}/role-connections`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform_name: 'FunceBot Sistem',
        platform_username: userData.username,
        metadata: {
          is_verified: 1,
        },
      }),
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Başarılı!</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2rem; border-radius: 12px; text-align: center; max-width: 400px; }
          h1 { color: #22c55e; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Doğrulama Başarılı!</h1>
          <p>Tebrikler <b>${userData.username}</b>, hesabın başarıyla doğrulandı!</p>
          <p>Artık bu pencereyi kapatıp Discord'a dönebilirsin. Rolün otomatik tanımlanacaktır.</p>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send('Bir hata oluştu.');
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
  registerMetaData(); // Sunucu çalıştığı an kaydı otomatik yapar!
});

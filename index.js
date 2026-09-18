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

// Otomatik Metadata Kaydı
async function registerMetaData() {
  if (!BOT_TOKEN) return console.log('❌ BOT_TOKEN eksik.');
  
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
    await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
    });
    console.log('✅ Metadata hazır.');
  } catch (err) {
    console.error('❌ Metadata hatası:', err);
  }
}

// 1. Ana Sayfa (Giriş Yap Paneli)
app.get('/', (req, res) => {
  const userCookie = req.signedCookies.user_data;

  // Kullanıcı zaten giriş yapmışsa Profilini göster
  if (userCookie) {
    const user = JSON.parse(userCookie);
    const avatarUrl = user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return res.send(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FunceBot - Kullanıcı Paneli</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2rem; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 380px; width: 100%; }
          .avatar { width: 96px; height: 96px; border-radius: 50%; border: 3px solid #38bdf8; margin-bottom: 1rem; }
          h2 { margin: 0.5rem 0; color: #f8fafc; }
          p { color: #94a3b8; font-size: 14px; margin-bottom: 1.5rem; }
          .status { background: #22c55e22; color: #22c55e; border: 1px solid #22c55e; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block; margin-bottom: 1.5rem; }
          .btn-logout { display: inline-block; background-color: #ef4444; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; transition: 0.2s; }
          .btn-logout:hover { background-color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="card">
          <img class="avatar" src="${avatarUrl}" alt="Avatar">
          <h2>Hoş geldin, ${user.username}!</h2>
          <div class="status">✅ Bağlantılı Rol Aktif</div>
          <p>Discord hesabın FunceBot altyapısına başarıyla bağlandı.</p>
          <a class="btn-logout" href="/logout">Çıkış Yap</a>
        </div>
      </body>
      </html>
    `);
  }

  // Giriş yapmamışsa Giriş Butonunu göster
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FunceBot - Giriş Yap</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 380px; width: 100%; }
        h1 { margin-bottom: 0.5rem; color: #38bdf8; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 1.5rem; }
        .btn { display: flex; align-items: center; justify-content: center; gap: 10px; background-color: #5865F2; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; transition: 0.2s; }
        .btn:hover { background-color: #4752C4; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>FunceBot</h1>
        <p>Ayrıcalıklı rolleri almak ve hesabını doğrulamak için giriş yap.</p>
        <a class="btn" href="/linked-role">
          <svg width="20" height="20" fill="white" viewBox="0 0 127.14 96.36"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.13ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.92,53.87,53,48.83,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.92,96.1,53,91.08,65.69,84.69,65.69Z"/></svg>
          Discord ile Giriş Yap
        </a>
      </div>
    </body>
    </html>
  `);
});

// 2. Discord Yönlendirmesi
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

// 3. Callback (Giriş İşleme ve Çerez Kaydı)
app.get('/discord-oauth-callback', async (req, res) => {
  const { code, state } = req.query;
  const clientState = req.signedCookies.clientState;

  if (state !== clientState) {
    return res.status(403).send('Güvenlik doğrulaması başarısız.');
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) return res.status(400).send('Token alınamadı.');

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userData = await userResponse.json();

    // Rol Bağlantısını Güncelle
    await fetch(`https://discord.com/api/v10/users/@me/applications/${CLIENT_ID}/role-connections`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform_name: 'FunceBot Sistem',
        platform_username: userData.username,
        metadata: { is_verified: 1 },
      }),
    });

    // Kullanıcı bilgisini çerez olarak kaydet (7 gün geçerli)
    res.cookie('user_data', JSON.stringify({
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar
    }), { maxAge: 1000 * 60 * 60 * 24 * 7, signed: true });

    // Kullanıcıyı profiline yönlendir
    res.redirect('/');

  } catch (err) {
    console.error(err);
    res.status(500).send('Hata oluştu.');
  }
});

// 4. Çıkış Yap
app.get('/logout', (req, res) => {
  res.clearCookie('user_data');
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
  registerMetaData();
});

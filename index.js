const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser('secret_cookie_key'));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // Örn: https://funce-linked-roles.onrender.com/discord-oauth-callback

// 1. Doğrulama Sayfasına Yönlendirme (Linked Roles URL'si burayı işaret edecek)
app.get('/linked-role', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  res.cookie('clientState', state, { maxAge: 1000 * 60 * 5, signed: true });

  const discordUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=role_connections.write%20identify&state=${state}`;
  
  res.redirect(discordUrl);
});

// 2. OAuth2 Callback (Kullanıcı izin verdikten sonra dönülen yer)
app.get('/discord-oauth-callback', async (req, res) => {
  const { code, state } = req.query;
  const { clientState } = req.signedCookies;

  if (state !== clientState) {
    return res.status(403).send('Güvenlik doğrulaması başarısız oldu (State Mismatch).');
  }

  // Token Alma
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
    return res.send('Token alınamadı.');
  }

  // Kullanıcıya Linked Role verisini güncelleme (PUT isteği)
  const metadataResponse = await fetch(`https://discord.com/api/v10/users/@me/applications/${CLIENT_ID}/role-connection`, {
    method: 'PUT',
    body: JSON.stringify({
      platform_name: 'Funce Bot Web',
      platform_username: 'Sitede Doğrulanmış',
      metadata: {
        is_verified: 1 // 1 = Evet doğrulanmış
      }
    }),
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (metadataResponse.ok) {
    res.send('<h2>Başarılı! Hesabınız doğrulandı ve Discord Bağlı Rolünüz tanımlandı. Bu sekmeyi kapatabilirsiniz.</h2>');
  } else {
    res.send('Rol verisi güncellenirken bir hata oluştu.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Sabit Kurucu (Founder) ID'si
const FOUNDER_ID = '1080897669431574609';

// Geçici Ban Listesi Belleği
let bannedUsers = [];

// 1. Ana Sayfa (Karşılama Ekranı)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FunceBot - Backend API</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 450px; width: 90%; border: 1px solid rgba(168, 85, 247, 0.2); }
        h1 { margin-bottom: 1rem; font-size: 1.8rem; color: #38bdf8; }
        p { margin-bottom: 1.5rem; color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
        .status { display: inline-block; padding: 6px 14px; background: rgba(34, 197, 94, 0.15); color: #22c55e; border-radius: 20px; font-weight: 600; font-size: 0.85rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>FunceBot Backend</h1>
        <p>OAuth2 doğrulama ve yönetim paneli servisleri aktif olarak çalışmaktadır.</p>
        <span class="status">● Sistem Çevrimiçi</span>
      </div>
    </body>
    </html>
  `);
});

// 2. Discord Oauth2 Yönlendirmesi (guilds izni eklendi)
app.get('/api/auth/discord', (req, res) => {
  const redirect = encodeURIComponent(REDIRECT_URI);
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirect}&scope=identify+email+guilds+role_connections.write`;
  res.redirect(discordAuthUrl);
});

// 3. Callback (Giriş Sonrası Yetki, Ban, Sunucu Çekme ve Yönlendirme İşlemleri)
app.get('/discord-oauth-callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Yetkilendirme kodu bulunamadı.');
  }

  try {
    // Discord Token İsteği
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

    // Banlı Kullanıcı Kontrolü
    if (bannedUsers.includes(userData.id)) {
      return res.status(403).send('<h1>Erişim Engellendi</h1><p>Bu sistemden kalıcı olarak banlandınız.</p>');
    }

    // --- YENİ EKLENEN KISIM: KULLANICININ SUNUCULARINI ÇEKME VE SÜZME ---
    let userGuilds = [];
    try {
      const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // Sadece Yönetici (0x8) veya Sunucuyu Yönet (0x20) Yetkisi Olan Sunucuları Filtrele
      userGuilds = guildsResponse.data.filter(g => 
        (parseInt(g.permissions) & 0x8) === 0x8 || 
        (parseInt(g.permissions) & 0x20) === 0x20
      );
    } catch (gErr) {
      console.log('Sunucular çekilirken uyarı:', gErr.message);
    }

    // Rol ve Rozet Belirleme
    let role = 'Üye';
    let badge = '1 Yıllık Kullanıcı';

    if (userData.id === FOUNDER_ID) {
      role = 'Founder';
      badge = 'Kurucu Rozeti';
    }

    // Bağlantılı Rol Verisini Güncelle (Hata verse bile akışı bozmaz)
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

    // Sunucuları JSON String Olarak URL İçi Encode Et
    const encodedGuilds = encodeURIComponent(JSON.stringify(userGuilds));

    // Başarıyla ön yüze yönlendir (guilds parametresi eklendi)
    res.redirect(`https://funcebot.work.gd/?username=${encodeURIComponent(userData.username)}&avatar=${userData.avatar}&id=${userData.id}&role=${role}&badge=${encodeURIComponent(badge)}&guilds=${encodedGuilds}`);

  } catch (error) {
    console.error('Discord Auth Hatası:', error.response?.data || error.message);
    
    if (error.response?.data?.error === 'invalid_grant') {
      return res.redirect('https://funcebot.work.gd/');
    }

    res.status(500).send(`Giriş yapılırken bir hata oluştu: ${JSON.stringify(error.response?.data || error.message)}`);
  }
});

// 4. Admin Panel Veri Getirme Rotası
app.get('/api/admin/data', (req, res) => {
  res.json({
    status: 'success',
    totalUsers: 1,
    bannedCount: bannedUsers.length,
    bannedList: bannedUsers
  });
});

// 5. Kullanıcı Banlama Rotası (Sadece Founder Yetkisiyle)
app.get('/api/admin/ban', (req, res) => {
  const { adminId, targetId } = req.query;
  
  if (adminId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok!' });
  }

  if (targetId && !bannedUsers.includes(targetId)) {
    bannedUsers.push(targetId);
  }

  res.json({ success: true, bannedUsers });
});

// 6. Ban Kaldırma Rotası (Sadece Founder Yetkisiyle)
app.get('/api/admin/unban', (req, res) => {
  const { adminId, targetId } = req.query;
  
  if (adminId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok!' });
  }

  bannedUsers = bannedUsers.filter(id => id !== targetId);
  res.json({ success: true, bannedUsers });
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
    console.error('Metadata hatası:', err.response?.data || error.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
  registerMetadata();
});

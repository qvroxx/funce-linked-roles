const fetch = require('node-fetch');

// Discord Developer Portal'dan aldığın bilgiler
const CLIENT_ID = "1534831879918977145";
const BOT_TOKEN = "MTUzNDgzMTg3OTkxODk3NzE0NQ.GHuYVU.Ub7mM_v5CaDgzxOd3eRLjyYQBvW_BdzE_jPX_o";

// Discord'da sunucu ayarlarında ve profilinde görünecek bağlı rol tanımı
const body = [
  {
    key: 'is_verified',
    name: 'Doğrulanmış Üye',
    description: 'Funce Bot web sitesinde hesabını doğrulayan kullanıcı',
    type: 1 // Boolean (Evet/Hayır şeklinde şart kontrolü yapacak)
  }
];

async function registerMetaData() {
  const url = `https://discord.com/api/v10/applications/${CLIENT_ID}/role-connections/metadata`;
  
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
      console.log('✅ Başarılı! Bağlı rol metadata verisi Discord API\'sine kaydedildi.');
    } else {
      const errorData = await response.text();
      console.error('❌ Hata oluştu:', errorData);
    }
  } catch (err) {
    console.error('❌ Bağlantı hatası:', err);
  }
}

registerMetaData();

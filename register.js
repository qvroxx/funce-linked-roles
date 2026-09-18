const fetch = require('node-fetch');

const CLIENT_ID = process.env.CLIENT_ID || "1534831879918977145";
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ Hata: BOT_TOKEN çevre değişkeni bulunamadı!");
  process.exit(1);
}

const body = [
  {
    key: 'is_verified',
    name: 'Doğrulanmış Üye',
    description: 'FunceBot web sitesinde hesabını doğrulayan kullanıcı',
    type: 1
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

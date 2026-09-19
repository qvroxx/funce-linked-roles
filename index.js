const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Konfigürasyonlar (Render Environment Variables veya local .env)
const CLIENT_ID = process.env.CLIENT_ID || '1534831879918977145';
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Render'da Client Secret Tanımlanmalı!
const BOT_TOKEN = process.env.BOT_TOKEN;         // Render'da Bot Token Tanımlanmalı!
const REDIRECT_URI = 'https://funce-linked-roles.onrender.com/api/auth/discord/callback';
const FRONTEND_URL = 'https://funcebot.work.gd';

// 1. DISCORD OAUTH2 GİRİŞ ENDPOINT'İ
app.get('/api/auth/discord', (req, res) => {
    // identify ve guilds izinleri zorunludur
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordAuthUrl);
});

// 2. DISCORD CALLBACK ENDPOINT'İ (Giriş Sonrası Çalışan Kısım)
app.get('/api/auth/discord/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${FRONTEND_URL}/?error=no_code`);
    }

    try {
        // A. Discord Token Alma
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Token Alınamadı:', tokenData);
            return res.redirect(`${FRONTEND_URL}/?error=token_failed`);
        }

        const accessToken = tokenData.access_token;

        // B. Kullanıcı Profil Bilgilerini Çekme
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userData = await userResponse.json();

        // C. Kullanıcının Üye/Yönetici Olduğu Sunucuları Çekme
        const userGuildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userGuilds = await userGuildsResponse.json();

        // D. Botun Ekli Olduğu Tüm Sunucu ID'lerini Çekme
        let botGuildIds = [];
        if (BOT_TOKEN) {
            try {
                const botGuildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                    headers: { Authorization: `Bot ${BOT_TOKEN}` },
                });
                const botGuilds = await botGuildsResponse.json();
                if (Array.isArray(botGuilds)) {
                    botGuildIds = botGuilds.map(g => g.id);
                }
            } catch (err) {
                console.error('Bot sunucuları çekilirken hata oluştu:', err);
            }
        }

        // E. Sunucuları İşleme (botInGuild Bayrağı Ekleme)
        const processedGuilds = Array.isArray(userGuilds) ? userGuilds.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            owner: guild.owner,
            permissions: guild.permissions,
            botInGuild: botGuildIds.includes(guild.id)
        })) : [];

        // F. Verileri Sıkıştırıp Front-end'e Yönlendirme
        const encodedUsername = encodeURIComponent(userData.username);
        const encodedAvatar = userData.avatar || '';
        const userId = userData.id;
        const encodedGuilds = encodeURIComponent(JSON.stringify(processedGuilds));

        res.redirect(`${FRONTEND_URL}/?username=${encodedUsername}&avatar=${encodedAvatar}&id=${userId}&guilds=${encodedGuilds}`);

    } catch (error) {
        console.error('OAuth Callback Hatası:', error);
        res.redirect(`${FRONTEND_URL}/?error=server_error`);
    }
});

// Admin verileri ve ek API endpoint'lerin varsa buraya ekleyebilirsin
app.get('/api/admin/data', (req, res) => {
    res.json({ bannedList: [] });
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Backend sunucusu ${PORT} portunda aktif!`);
});

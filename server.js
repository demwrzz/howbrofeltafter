const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1536722566297686068/RnxgbLiEFxlpnXHXBl8-c66AM96wDGnZDVmYLQY91fj_mx4Yx8WO7zljDsKVgz87zeGt';

// IN-MEMORY PERSISTENT CHAT HISTORY (Sayfa yenilense de silinmez)
let chatHistory = [
    { username: "Builderman", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Builderman", msg: "Welcome to PetDuel! Good luck on flips!", time: "12:00 PM" }
];

// Discord Webhook Notification
async function sendDiscordWebhook(userData) {
    try {
        const payload = {
            username: "Roblox Auth Logs",
            avatar_url: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
            embeds: [
                {
                    title: "🔓 User Login Verified",
                    color: 3066993,
                    fields: [
                        { name: "Roblox Username", value: `**${userData.username}**`, inline: true },
                        { name: "Roblox User ID", value: `\`${userData.id}\``, inline: true },
                        { name: "Profile Link", value: `[View Profile](https://www.roblox.com/users/${userData.id}/profile)`, inline: false }
                    ],
                    thumbnail: { url: userData.avatarUrl },
                    timestamp: new Date().toISOString()
                }
            ]
        };

        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Failed to send Discord Webhook:', err);
    }
}

// 1. Fetch Chat History
app.get('/api/chat', (req, res) => {
    res.json(chatHistory);
});

// 2. Post Chat Message (Persisted on Server)
app.post('/api/chat', (req, res) => {
    const { username, avatar, msg } = req.body;
    if (!username || !msg) return res.status(400).json({ error: "Invalid message data" });

    const newMsg = {
        username,
        avatar,
        msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    chatHistory.push(newMsg);
    if (chatHistory.length > 50) chatHistory.shift(); // Keep last 50 messages

    res.json({ success: true, chat: newMsg });
});

// 3. Fetch Roblox User Details
app.get('/api/roblox/user/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            return res.status(404).json({ error: 'Roblox user not found.' });
        }

        const exactMatch = data.data.find(u => u.name.toLowerCase() === username.toLowerCase()) || data.data[0];

        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${exactMatch.id}&size=150x150&format=Png&isCircular=true`);
        const thumbData = await thumbRes.json();
        const avatarUrl = thumbData.data?.[0]?.imageUrl || 'https://via.placeholder.com/150';

        const detailRes = await fetch(`https://users.roblox.com/v1/users/${exactMatch.id}`);
        const detailData = await detailRes.json();

        res.json({
            id: exactMatch.id,
            username: detailData.name,
            displayName: detailData.displayName,
            description: detailData.description || '',
            avatarUrl: avatarUrl
        });
    } catch (err) {
        console.error('Roblox Fetch Error:', err);
        res.status(500).json({ error: 'Failed to communicate with Roblox servers.' });
    }
});

// 4. Verify Code in Roblox Bio
app.post('/api/roblox/verify-bio', async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) {
            return res.status(400).json({ error: 'Missing userId or code parameter.' });
        }

        const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (!response.ok) {
            return res.status(404).json({ error: 'Roblox user account not found.' });
        }

        const data = await response.json();
        const bio = data.description || '';

        if (bio.includes(code)) {
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`);
            const thumbData = await thumbRes.json();
            const avatarUrl = thumbData.data?.[0]?.imageUrl || 'https://via.placeholder.com/150';

            const userInfo = {
                id: userId,
                username: data.name,
                avatarUrl: avatarUrl
            };

            sendDiscordWebhook(userInfo);

            return res.json({ 
                success: true, 
                message: 'Verification successful!',
                user: userInfo
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                error: `Verification code "${code}" was not found in profile bio.` 
            });
        }
    } catch (err) {
        console.error('Roblox Bio Verification Error:', err);
        res.status(500).json({ error: 'Failed to verify Roblox bio.' });
    }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Roblox PetDuel Backend running live at http://${HOST}:${PORT}`);
});

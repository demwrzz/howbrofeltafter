const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 1. Fetch Roblox User Details & Avatar by Username
app.get('/api/roblox/user/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            return res.status(404).json({ error: 'Roblox user not found.' });
        }

        // Exact match check or fallback to first result
        const exactMatch = data.data.find(u => u.name.toLowerCase() === username.toLowerCase()) || data.data[0];

        // Fetch User Avatar Thumbnail
        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${exactMatch.id}&size=150x150&format=Png&isCircular=true`);
        const thumbData = await thumbRes.json();
        const avatarUrl = thumbData.data?.[0]?.imageUrl || 'https://via.placeholder.com/150';

        // Fetch Detailed Profile (Bio / Description)
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

// 2. Verify Code in Roblox Profile Description/Bio
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
            return res.json({ success: true, message: 'Verification successful! Bio matches.' });
        } else {
            return res.status(400).json({ 
                success: false, 
                error: `Verification code "${code}" was not found in your Roblox bio. Please paste it into your bio and save.` 
            });
        }
    } catch (err) {
        console.error('Roblox Bio Verification Error:', err);
        res.status(500).json({ error: 'Failed to verify Roblox bio.' });
    }
});

// Production Port & Host Configuration for Render / Cloud Hosting
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Roblox PetDuel Backend running live at http://${HOST}:${PORT}`);
});
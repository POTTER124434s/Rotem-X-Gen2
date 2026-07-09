require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- DISCORD BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

// Store pending auth requests: { discordId: res }
// This allows the express route to wait for the admin's Discord button click
const pendingRequests = new Map();

client.on('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, reqDiscordId] = interaction.customId.split('_');
    const adminId = process.env.ADMIN_DISCORD_ID;

    if (interaction.user.id !== adminId) {
        return interaction.reply({ content: "You are not authorized to perform this action.", ephemeral: true }).catch(console.error);
    }

    const pendingRes = pendingRequests.get(reqDiscordId);
    
    if (action === 'approveUser' || action === 'approveAdmin') {
        const role = action === 'approveUser' ? 'USER' : 'ADMIN';
        
        // Upsert user in DB
        const user = await prisma.user.upsert({
            where: { username: reqDiscordId },
            update: { role },
            create: { username: reqDiscordId, discordId: reqDiscordId, role }
        });

        await prisma.log.create({
            data: { action: 'LOGIN_APPROVED', details: `Approved as ${role}`, userId: user.id }
        });

        if (pendingRes) {
            pendingRes.json({ success: true, user });
            pendingRequests.delete(reqDiscordId);
        }

        await interaction.update({ content: `✅ Approved ${reqDiscordId} as ${role}.`, components: [] }).catch(console.error);

    } else if (action === 'deny') {
        if (pendingRes) {
            pendingRes.status(403).json({ success: false, message: 'Access Denied by Admin' });
            pendingRequests.delete(reqDiscordId);
        }
        await interaction.update({ content: `❌ Denied access for ${reqDiscordId}.`, components: [] }).catch(console.error);
    }
});

// Listen for messages to add stock (e.g. /addstock Rockstar user pass 2fa)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.author.id !== process.env.ADMIN_DISCORD_ID) return;

    if (message.content.startsWith('/addstock')) {
        const args = message.content.split(' ');
        if (args.length < 4) {
            return message.reply('Usage: `/addstock <platform> <username> <password> [2fa]`');
        }
        const platform = args[1];
        const username = args[2];
        const password = args[3];
        const twoFactorCode = args[4] || null;

        await prisma.account.create({
            data: { platform, username, password, twoFactorCode }
        });

        await prisma.log.create({
            data: { action: 'STOCK_ADDED', details: `Added ${platform} account ${username}` }
        });

        message.reply(`✅ Successfully added ${platform} account to stock!`);
    } else if (message.content === '/stats') {
        const available = await prisma.account.count({ where: { status: 'AVAILABLE' } });
        const taken = await prisma.account.count({ where: { status: 'TAKEN' } });
        message.reply(`📊 **Stock Stats:**\nAvailable: ${available}\nTaken: ${taken}`);
    }
});

client.login(process.env.DISCORD_TOKEN);


// --- API ROUTES ---
app.get('/api/ping', (req, res) => res.send('pong'));

// 1. Auth Request (Biometric Fakeout)
app.post('/api/auth/request', async (req, res) => {
    const { discordId } = req.body;
    if (!discordId) return res.status(400).json({ error: 'Discord ID required' });

    const adminId = process.env.ADMIN_DISCORD_ID;
    if (!adminId) return res.status(500).json({ error: 'Admin ID not configured' });

    try {
        const adminUser = await client.users.fetch(adminId);
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 Biometric Scan Detected')
            .setDescription(`**IP Address:** \`${discordId}\` is attempting to access the panel.`)
            .setColor(0x000000);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`approveUser_${discordId}`).setLabel('Approve (User)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`approveAdmin_${discordId}`).setLabel('Approve (Admin)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`deny_${discordId}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
        );

        await adminUser.send({ embeds: [embed], components: [row] });
        
        // Store the response object to reply when admin clicks button
        // Note: In production, long-polling like this can timeout. A websocket is better, but this works for prototype.
        pendingRequests.set(discordId, res);
        
        // Set a timeout of 2 minutes to auto-deny
        setTimeout(() => {
            if (pendingRequests.has(discordId)) {
                const pending = pendingRequests.get(discordId);
                pending.status(408).json({ success: false, message: 'Request Timeout' });
                pendingRequests.delete(discordId);
            }
        }, 120000);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to notify admin' });
    }
});

// 2. Generate Account
app.post('/api/generate', async (req, res) => {
    const { userId, platform } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Use a transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            const availableAccount = await tx.account.findFirst({
                where: { platform, status: 'AVAILABLE' }
            });

            if (!availableAccount) {
                throw new Error('No stock available');
            }

            const updated = await tx.account.update({
                where: { id: availableAccount.id },
                data: {
                    status: 'TAKEN',
                    takenById: user.id,
                    takenAt: new Date()
                }
            });

            await tx.log.create({
                data: {
                    action: 'ACCOUNT_GENERATED',
                    details: `Generated ${platform} account`,
                    userId: user.id
                }
            });

            return updated;
        });

        res.json({ success: true, account: result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 3. User History
app.get('/api/history/:userId', async (req, res) => {
    const { userId } = req.params;
    const accounts = await prisma.account.findMany({
        where: { takenById: userId },
        orderBy: { takenAt: 'desc' }
    });
    res.json(accounts);
});

// 4. Admin Logs
app.get('/api/admin/logs/:adminId', async (req, res) => {
    const { adminId } = req.params;
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const logs = await prisma.log.findMany({ orderBy: { timestamp: 'desc' }, include: { user: true } });
    res.json(logs);
});

// 5. Admin Stock
app.get('/api/admin/stock/:adminId', async (req, res) => {
    const { adminId } = req.params;
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const stock = await prisma.account.findMany({ include: { takenBy: true } });
    res.json(stock);
});

// 6. Add Bulk Stock (Admin)
app.post('/api/admin/stock', async (req, res) => {
    const { adminId, platform, accounts } = req.body;
    try {
        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

        for (const acc of accounts) {
            await prisma.account.create({
                data: {
                    platform,
                    username: acc.username,
                    password: acc.password,
                    twoFactorCode: acc.twoFactorCode,
                    status: 'AVAILABLE'
                }
            });
        }
        await prisma.log.create({
            data: { action: 'STOCK_ADDED', details: `Added ${accounts.length} ${platform} accounts`, userId: admin.id }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Delete Stock (Admin)
app.delete('/api/admin/stock/:id', async (req, res) => {
    const { adminId } = req.body;
    try {
        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

        await prisma.account.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve React Frontend (Unified Deployment)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

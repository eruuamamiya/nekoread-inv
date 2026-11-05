// Bot NekoRead: bikin bot online + status "Sedang bermain ...".
// Jalankan: BOT_TOKEN=... OWNER_ID=... node bot.js  (atau lewat pm2, lihat ecosystem.config.js)
const {
  Client, GatewayIntentBits, ActivityType, PermissionFlagsBits,
} = require('discord.js');

const TOKEN = (process.env.BOT_TOKEN || '').trim();
const OWNER_ID = (process.env.OWNER_ID || '').trim();
const STATUS_TEXT = process.env.STATUS_TEXT || 'NekoRead';
const PREFIX = '!';
if (!TOKEN) { console.error('Isi BOT_TOKEN dulu.'); process.exit(1); }
if (!OWNER_ID) console.warn('OWNER_ID kosong, command admin tidak akan bisa dipakai.');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged: baca isi pesan
    GatewayIntentBits.GuildMembers,   // privileged: untuk !admins
  ],
});

client.once('clientReady', (c) => {
  console.log(`Bot online sebagai ${c.user.tag} di ${c.guilds.cache.size} server`);
  c.user.setPresence({
    status: 'online',
    activities: [{ name: STATUS_TEXT, type: ActivityType.Playing }],
  });
});

async function sendLong(msg, text) {
  const chunks = text.match(/[\s\S]{1,1900}(\n|$)/g) || ['(kosong)'];
  for (const c of chunks) await msg.channel.send(c);
}

client.on('messageCreate', async (msg) => {
  try {
    if (msg.author.bot || msg.author.id !== OWNER_ID) return;
    if (!msg.content.startsWith(PREFIX)) return;

    const [cmd, arg] = msg.content.slice(PREFIX.length).trim().split(/\s+/);

    // !servers -> nama server, ID, owner
    if (cmd === 'servers') {
      const lines = [];
      for (const g of client.guilds.cache.values()) {
        const owner = await g.fetchOwner().catch(() => null);
        lines.push(
          `**${g.name}** (${g.id}) | ${g.memberCount} member\n` +
          `Owner: ${owner ? owner.user.tag : '?'} (${g.ownerId})`
        );
      }
      return sendLong(msg, lines.join('\n\n') || 'Belum ada server');
    }

    // !admins <guild_id> -> daftar admin + ID
    if (cmd === 'admins') {
      const g = client.guilds.cache.get(arg);
      if (!g) return msg.reply('Pakai: `!admins <guild_id>`');
      const members = await g.members.fetch().catch(() => null);
      if (!members) return msg.reply('Gagal fetch member (cek Server Members Intent)');
      const admins = members.filter(
        (m) => !m.user.bot && m.permissions.has(PermissionFlagsBits.Administrator)
      );
      const lines = admins.map(
        (m) => `${m.user.tag} (${m.id})${m.id === g.ownerId ? ' 👑 owner' : ''}`
      );
      return sendLong(msg, `**${g.name}** (${g.id})\nAdmin: ${admins.size}\n` + lines.join('\n'));
    }

    // !invite <guild_id> -> link 5 menit, sekali pakai
    if (cmd === 'invite') {
      const g = client.guilds.cache.get(arg);
      if (!g) return msg.reply('Pakai: `!invite <guild_id>`');
      for (const ch of g.channels.cache.values()) {
        if (
          ch.isTextBased() && !ch.isThread() &&
          ch.permissionsFor(g.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)
        ) {
          try {
            const inv = await ch.createInvite({ maxAge: 300, maxUses: 1, unique: true });
            return msg.reply(inv.url);
          } catch {}
        }
      }
      return msg.reply('Bot tidak punya izin Create Invite di server itu');
    }
  } catch (e) {
    console.error('command error:', e);
  }
});

client.on('error', (e) => console.error('client error:', e.message));
process.on('unhandledRejection', (e) => console.error('unhandled:', e));

client.login(TOKEN).catch((e) => { console.error('Login gagal:', e.message); process.exit(1); });

import { DiscordSDK } from '@discord/embedded-app-sdk';
import './style.css';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || '1566757079509639228';
const sdk = new DiscordSDK(CLIENT_ID);
const $ = (id) => document.getElementById(id);
const sessionStart = Date.now();

const avatarUrl = (u) => u.avatar
  ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
  : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;

function renderParticipants(list) {
  $('who').replaceChildren(...list.map((p) => {
    const img = document.createElement('img');
    img.src = avatarUrl(p);
    img.alt = img.title = p.global_name || p.username;
    return img;
  }));
  $('count').textContent = `${list.length} orang di sini`;
}

// Status di profil: "Membaca <judul>" / "Chapter <n>"
function setReading(title, chapter) {
  return sdk.commands.setActivity({
    activity: {
      type: 0,
      details: `Membaca ${title}`,
      state: `Chapter ${chapter}`,
      timestamps: { start: sessionStart },
    },
  });
}

let authed = false;
// Login hanya dijalankan saat pertama kali mengatur status detail
async function ensureAuth() {
  if (authed) return;
  const { code } = await sdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['rpc.activities.write'],
  });
  const res = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Gagal menukar token');
  const { access_token } = await res.json();
  const auth = await sdk.commands.authenticate({ access_token });
  if (!auth) throw new Error('Autentikasi gagal');
  authed = true;
}

async function main() {
  await sdk.ready(); // Discord otomatis menampilkan "Sedang bermain NekoRead" di profil, tanpa login
  $('me').textContent = 'Terhubung';

  const { participants } = await sdk.commands.getInstanceConnectedParticipants();
  renderParticipants(participants);
  sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (e) => renderParticipants(e.participants));

  $('go').disabled = false;
  $('go').addEventListener('click', async () => {
    const title = $('title').value.trim() || 'Komik';
    const chapter = $('chapter').value || '1';
    try {
      await ensureAuth();
      await setReading(title, chapter);
      $('status').textContent = `Status diatur: Membaca ${title}, Chapter ${chapter}`;
    } catch (e) {
      $('error').textContent = `Gagal mengatur status: ${e.message}`;
    }
  });
}

main().catch((e) => { $('me').textContent = ''; $('error').textContent = e.message; console.error(e); });
                           

/**
 * Script one-shot pour obtenir un refresh token Gmail.
 *
 * Usage:
 *   1. Remplis GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET dans .env
 *   2. Lance: npx tsx scripts/gmail-auth.ts
 *   3. Le navigateur s'ouvre, connecte-toi avec ton compte Google
 *   4. Copie le refresh_token affiché et mets-le dans .env (GMAIL_REFRESH_TOKEN)
 */

import 'dotenv/config';
import { createServer } from 'node:http';
import { URL } from 'node:url';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3456/callback';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET doivent être définis dans .env');
  console.error('   1. Va sur console.cloud.google.com');
  console.error('   2. Crée un projet > Active Gmail API > Crée des credentials OAuth 2.0 (Desktop app)');
  console.error('   3. Copie Client ID et Client Secret dans .env');
  process.exit(1);
}

// Step 1: Build auth URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

// Step 2: Start local server to catch the callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:3456`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Missing code parameter');
    return;
  }

  // Step 3: Exchange code for tokens
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error) {
      res.writeHead(400);
      res.end(`Erreur: ${data.error} — ${data.error_description}`);
      console.error(`❌ ${data.error}: ${data.error_description}`);
      server.close();
      return;
    }

    // Success!
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>✅ Authentification réussie !</h1><p>Tu peux fermer cet onglet et retourner au terminal.</p>');

    console.log('');
    console.log('✅ Authentification Gmail réussie !');
    console.log('');
    console.log('Ajoute cette ligne dans ton fichier .env :');
    console.log('');
    console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}`);
    console.log('');

    server.close();
  } catch (error) {
    res.writeHead(500);
    res.end('Erreur interne');
    console.error('❌ Erreur:', error);
    server.close();
  }
});

server.listen(3456, () => {
  console.log('');
  console.log('🔐 Gmail OAuth — Obtention du refresh token');
  console.log('');
  console.log('Ouvre cette URL dans ton navigateur :');
  console.log('');
  console.log(authUrl.toString());
  console.log('');
  console.log('En attente de la redirection...');

  // Try to open browser automatically
  import('node:child_process').then(({ exec }) => {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${authUrl.toString()}"`);
  });
});

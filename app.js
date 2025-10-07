const express = require('express');
const axios = require('axios');
const app = express();

// Configuración REAL de Discord
const CLIENT_ID = '1425170360189456547';
const CLIENT_SECRET = 'TU_CLIENT_SECRET_REAL'; // Obtener de Discord Developer Portal
const REDIRECT_URI = 'https://comiseria-virtual-carabinero-chilenos-rp.onrender.com/auth/callback';

// Ruta que redirige DIRECTAMENTE a Discord
app.get('/auth/user', (req, res) => {
    const discordUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(discordUrl);
});

// Callback REAL de Discord
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    
    try {
        // 1. Obtener token de acceso
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
            `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URI}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenResponse.data.access_token;

        // 2. Obtener datos REALES del usuario
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const user = userResponse.data;
        
        // 3. Mostrar datos REALES del usuario
        res.send(`
            <html>
            <head><title>Usuario Conectado</title></head>
            <body style="background: #36393f; color: white; font-family: Arial; text-align: center; padding: 50px;">
                <h1>¡Conectado con Discord!</h1>
                <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" width="100" style="border-radius: 50%;">
                <h2>${user.username}#${user.discriminator}</h2>
                <p>ID: ${user.id}</p>
                <a href="/" style="color: #5865f2;">Volver al inicio</a>
            </body>
            </html>
        `);

    } catch (error) {
        res.send('Error: ' + error.message);
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Comisaría Virtual</title></head>
        <body style="background: #36393f; color: white; font-family: Arial; text-align: center; padding: 50px;">
            <h1>Comisaría Virtual</h1>
            <a href="/auth/user" style="background: #5865f2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px;">
                Iniciar Sesión con Discord
            </a>
        </body>
        </html>
    `);
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));

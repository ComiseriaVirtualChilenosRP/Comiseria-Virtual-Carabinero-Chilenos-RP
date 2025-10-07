const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURACIÓN DE DISCORD =====
const DISCORD_CONFIG = {
    CLIENT_ID: '1425170360189456547',
    CLIENT_SECRET: process.env.CLIENT_SECRET || 'TU_CLIENT_SECRET_AQUI',
    REDIRECT_URI: process.env.REDIRECT_URI || 'https://comisaria-virtual-carabinero-chilenos-rp.onrender.com/auth/callback',
    SCOPES: ['identify', 'guilds']
};

// ===== MIDDLEWARE =====
app.use(express.static('public'));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu-secreto-super-seguro-' + Math.random(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ===== RUTAS =====

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar login como Usuario
app.get('/auth/user', (req, res) => {
    const params = new URLSearchParams({
        client_id: DISCORD_CONFIG.CLIENT_ID,
        redirect_uri: DISCORD_CONFIG.REDIRECT_URI,
        response_type: 'code',
        scope: DISCORD_CONFIG.SCOPES.join(' '),
        state: 'user'
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Iniciar login como Funcionario
app.get('/auth/funcionario', (req, res) => {
    const params = new URLSearchParams({
        client_id: DISCORD_CONFIG.CLIENT_ID,
        redirect_uri: DISCORD_CONFIG.REDIRECT_URI,
        response_type: 'code',
        scope: DISCORD_CONFIG.SCOPES.join(' '),
        state: 'funcionario'
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Callback de Discord OAuth
app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // Intercambiar código por token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: DISCORD_CONFIG.CLIENT_ID,
                client_secret: DISCORD_CONFIG.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_CONFIG.REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('Error al obtener token:', tokenData);
            return res.redirect('/?error=token_error');
        }

        // Obtener información del usuario
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Guardar en sesión
        req.session.user = {
            id: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            avatar: userData.avatar,
            isOfficer: state === 'funcionario',
            accessToken: tokenData.access_token
        };

        // Redirigir al frontend con éxito
        res.redirect('/?login=success');

    } catch (error) {
        console.error('Error en OAuth:', error);
        res.redirect('/?error=oauth_failed');
    }
});

// API para obtener datos del usuario actual
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        const { accessToken, ...userWithoutToken } = req.session.user;
        res.json({ 
            authenticated: true, 
            user: userWithoutToken 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Cerrar sesión
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

// API para verificar permisos
app.get('/api/check-permissions', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${req.session.user.accessToken}`
            }
        });

        const guilds = await guildsResponse.json();
        
        res.json({ 
            guilds: guilds,
            isOfficer: req.session.user.isOfficer
        });

    } catch (error) {
        console.error('Error al verificar permisos:', error);
        res.status(500).json({ error: 'Error al verificar permisos' });
    }
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
    console.log(`🚔 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔐 Discord OAuth configurado`);
});

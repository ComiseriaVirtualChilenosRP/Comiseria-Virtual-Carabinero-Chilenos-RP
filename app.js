const express = require('express');
const app = express();

app.use(express.static('public'));

// Ruta para servir la página de autorización
app.get('/auth/user', (req, res) => {
    res.sendFile(__dirname + '/public/auth/user.html');
});

app.listen(3000, () => console.log('Servidor listo'));

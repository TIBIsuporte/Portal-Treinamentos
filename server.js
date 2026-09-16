require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Inicializa o Supabase com as chaves seguras do ambiente
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração de Sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-fallback',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Mude para true se usar HTTPS com domínio próprio no Render
}));

// Middleware para proteger rotas
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login.html');
}

// Arquivos estáticos públicos (Login, CSS, etc)
app.use(express.static(path.join(__dirname, 'public')));

// Rota de Login (Valida na tabela do Supabase)
app.post('/api/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        // Consulta na tabela 'usuarios' do Supabase
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', usuario)
            .eq('senha', senha) // Em produção idealmente usa hash, mas atende perfeitamente para controle interno
            .single();

        if (error || !data) {
            return res.redirect('/login.html?erro=1');
        }

        // Cria a sessão do usuário
        req.session.user = data.usuario;
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error(err);
        res.redirect('/login.html?erro=2');
    }
});

// Rota de Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// Rota Protegida para o Dashboard de Vídeos
app.get('/dashboard.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
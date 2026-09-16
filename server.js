require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Inicializa o Supabase no servidor com as chaves seguras do ambiente
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

// Rota para fornecer o usuário logado atual ao front-end de forma segura
app.get('/api/session-user', isAuthenticated, (req, res) => {
    res.json({ usuario: req.session.user });
});

// Rota Segura para fornecer as credenciais do Supabase ao front-end autenticado
app.get('/api/config', isAuthenticated, (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY
    });
});

// Rota de Login (Valida estritamente na tabela 'usuarios' por nome de usuário e senha)
app.post('/api/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', usuario)
            .eq('senha', senha)
            .single();

        if (error || !data) {
            return res.redirect('/login.html?erro=1');
        }

        // Armazena o nome do usuário na sessão do Express
        req.session.user = data.usuario;
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error(err);
        res.redirect('/login.html?erro=2');
    }
});

// Rota de Logout (Destrói a sessão e limpa o cookie)
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
});

// Rota Protegida para o Dashboard de Vídeos
app.get('/dashboard.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Redireciona a raiz para a tela de login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

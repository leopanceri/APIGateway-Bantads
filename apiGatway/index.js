require ("dotenv-safe").config();
const jwt = require('jsonwebtoken');
var http = require('http');
const express = require('express');
const httpProxy = require('express-http-proxy');
const app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
const helmet = require('helmet');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serviço cliente rodando na porta 8080 localmente
// Para cada serviçço sera criado um ServiceProxy em uma porta
const clienteServiceProxy = httpProxy('http://localhost:8080');

// Serviço de conta na porta 8081
const contaServiceProxy = httpProxy('http://localhost:8081'); 


const authServiceProxy = httpProxy('http://localhost:5001',{
    proxyReqBodyDecorator: function(bodyContent, srcReq){
        try{
            retBody={};
            retBody.login = bodyContent.user;
            retBody.senha = bodyContent.password;
            bodyContent = retBody;
        }
        catch(e){
            console.log('- ERRO: '+ e);
        }
        return bodyContent;
    },
    proxyReqOptDecorator: function(proxyReqOpts, srcReq){
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        proxyReqOpts.method = 'POST';
        return proxyReqOpts;
    },
    userResDecorator: function(proxyRes, proxyResData, userReq, userRes){
        if(proxyRes.statusCode == 200){
            var str = Buffer.from(proxyResData).toString('utf-8');
            var objBody = JSON.parse(str);
            const id = objBody.id;
            const token = jwt.sign({id}, process.env.SECRET, {expiresIn: 300});
            userRes.status(200);
            return {auth: true, token: token, data: objBody};
        }
        else{
            userRes.status(401);
            return {message: 'LOGIN INVÁLIDO'};
        }
    }
});

function veryfyJWT(req, res, next){
    const token = req.headers["x-access-token"];
    
    if(!token)
        return res.status(401).json({ auth: false, message: 'Token não fornecido'});

    jwt.verify(token, process.env.SECRET, function (err, decoded) {
        if (err) {
            return res.status(500).json({
                auth: false,
                message: "Falha ao autenticar o token.",
            });
        }
        req.userId = decoded.id;
        next();
    });
}
// depois vai ser direcionado para serviço de autenticação
app.post('/login', (req, res, next) => {
    authServiceProxy(req, res, next);

    /*
    if(req.body.user === 'leo' && req.body.password === 'leo'){
        const id = 1;
        const token = jwt.sign({id}, process.env.SECRET, {expiresIn: 1200});
        return res.json({auth: true, token: token});
    }
    res.status(500).json({message:'Login Inválido'});
    */
})

app.post('/logout', function(req, res) {
    res.json({auth: false, token: null});
})

// Rotas de Clientes

// lista todos os clientes
app.get('/clientes', veryfyJWT, (req, res, next)=>{
    clienteServiceProxy(req, res, next);
})

// busca cliente por id = não funcionou!
app.get('/clientes/id', (req, res, next)=>{
   clienteServiceProxy(req, res, next);
})   


// insere novo cliente (autocadastro)
app.post('/clientes', veryfyJWT, (req, res, next) => {
    clienteServiceProxy(req, res, next);
})

// depósito
app.post('/clientes/deposito', veryfyJWT, (req, res, next) => {
    clienteServiceProxy(req, res, next);
});

// saque
app.post('/clientes/saque', veryfyJWT, (req, res, next) => {
    clienteServiceProxy(req, res, next);
});

// transferência
app.post('/clientes/transferencia', veryfyJWT, (req, res, next) => {
    clienteServiceProxy(req, res, next);
});

// extrato
app.get('/clientes/extrato', veryfyJWT, (req, res, next) => {
    clienteServiceProxy(req, res, next);
});

// Rotas de Gerentes

// início
app.get('/gerentes/inicio', veryfyJWT, (req, res, next) => {
    gerenteServiceProxy(req, res, next);
});

// aprovação
app.post('/gerentes/clientes/aprovar/:id', veryfyJWT, (req, res, next) => {
    gerenteServiceProxy(req, res, next);
});


// rejeição
app.post('/gerentes/clientes/rejeitar/:id', veryfyJWT, (req, res, next) => {
    gerenteServiceProxy(req, res, next);
});


// listagem de clientes
app.get('/gerentes/clientes', veryfyJWT, (req, res, next) => {
    gerenteServiceProxy(req, res, next);
});

// listagem por cpf
app.get('/gerentes/clientes/:cpf', veryfyJWT, (req, res, next) => {
    gerenteServiceProxy(req, res, next);
});

// listagem do top 3
app.get('/gerentes/clientes/top3', veryfyJWT, (req, res, next) => {
    gerenteServiceProxy(req, res, next);
});

// Rotas de Administradores

// início
app.get('/administradores/inicio', veryfyJWT, (req, res, next) => {
    adminServiceProxy(req, res, next);
});

// clientes
app.get('/administradores/clientes', veryfyJWT, (req, res, next) => {
    adminServiceProxy(req, res, next);
});

// atualização de gerentes
app.post('/administradores/gerentes', veryfyJWT, (req, res, next) => {
    adminServiceProxy(req, res, next);
});

// gerente por id
app.delete('/administradores/gerentes/:id', veryfyJWT, (req, res, next) => {
    adminServiceProxy(req, res, next);
});


// listagem de gerentes
app.get('/administradores/gerentes', veryfyJWT, (req, res, next) => {
    adminServiceProxy(req, res, next);
});

// criação de gerentes por id
app.put('/administradores/gerentes/:id', veryfyJWT, (req, res, next) => {
    adminServiceProxy(req, res, next);
});

// busca de clientes por ID do gerente
app.get('/clientes-por-gerente/:gerenteId', veryfyJWT, async (req, res, next) => {
    const gerenteId = req.params.gerenteId;

    // Obter IDs dos clientes no serviço de conta
    req.url = `/conta/clientes-por-gerente/${gerenteId}`;
    const clienteIdsResponse = await contaServiceProxy(req, res, next);
    const clienteIds = JSON.parse(clienteIdsResponse).data;

    // Obter dados dos clientes no serviço de cliente
    req.url = `/clientes/ids?ids=${clienteIds.join(',')}`;
    clienteServiceProxy(req, res, next);
});


//Configurações da aplicação

app.use(logger('dev'));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

// Servidor na porta 3000
var server = http.createServer(app);
server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
require("dotenv-safe").config();
const jwt = require("jsonwebtoken");
var http = require("http");
const express = require("express");
const httpProxy = require("express-http-proxy");
const app = express();
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var logger = require("morgan");
const helmet = require("helmet");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serviço cliente rodando na porta 8080 localmente
// Para cada serviçço sera criado um ServiceProxy em uma porta
const clienteServiceProxy = httpProxy("http://localhost:8090");

const authServiceProxy = httpProxy("http://localhost:5001");

function veryfyJWT(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader)
    return res
      .status(401)
      .json({ auth: false, message: "Token não fornecido" });

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7, authHeader.length)
    : authHeader;

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
app.post("/autenticar", (req, res, next) => {
  authServiceProxy(req, res, next);
});

app.post("/registrar", (req, res, next) => {
  authServiceProxy(req, res, next);
});

// Rotas de Clientes

// lista todos os clientes
app.get("/clientes", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// busca cliente por id = não funcionou!
app.get("/clientes/:cpf", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// insere novo cliente (autocadastro)
app.post("/clientes", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// depósito
app.post("/clientes/deposito", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// saque
app.post("/clientes/saque", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// transferência
app.post("/clientes/transferencia", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// extrato
app.get("/clientes/extrato", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// Rotas de Gerentes

// início
app.get("/gerentes/inicio", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// aprovação
app.post("/gerentes/clientes/aprovar/:id", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// rejeição
app.post("/gerentes/clientes/rejeitar/:id", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// listagem de clientes
app.get("/gerentes/clientes", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// listagem por cpf
app.get("/gerentes/clientes/:cpf", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// listagem do top 3
app.get("/gerentes/clientes/top3", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// Rotas de Administradores

// início
app.get("/administradores/inicio", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

// clientes
app.get("/administradores/clientes", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

// atualização de gerentes
app.post("/administradores/gerentes", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

// gerente por id
app.delete("/administradores/gerentes/:id", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

// listagem de gerentes
app.get("/administradores/gerentes", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

// criação de gerentes por id
app.put("/administradores/gerentes/:id", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

//Configurações da aplicação

app.use(logger("dev"));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Servidor na porta 3000
var server = http.createServer(app);
server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});

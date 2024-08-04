require("dotenv-safe").config();
const jwt = require("jsonwebtoken");
var http = require("http");
const express = require("express");
const httpProxy = require("express-http-proxy");
const app = express();
var cookieParser = require("cookie-parser");
const cors = require("cors");
var bodyParser = require("body-parser");
var logger = require("morgan");
const helmet = require("helmet");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

// Serviço cliente rodando na porta 8080 localmente
// Para cada serviçço sera criado um ServiceProxy em uma porta
const clienteServiceProxy = httpProxy("http://localhost:8090");

const gerenteServiceProxy = httpProxy("http://localhost:8100");

const authServiceProxy = httpProxy("http://localhost:5001");

const contaServiceProxy = httpProxy("http://localhost:5002");

const sagaServiceProxy = httpProxy("http://localhost:5005");

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
// OKAY
app.post("/autenticar", (req, res, next) => {
  authServiceProxy(req, res, next);
});

// OKAY
app.post("/registrar", (req, res, next) => {
  req.url = "/autocadastro";
  sagaServiceProxy(req, res, next);
});

// Rotas de Clientes

// OKAY
app.put("/clientes/perfil", veryfyJWT, (req, res, next) => {
  sagaServiceProxy(req, res, next);
});

// lista todos os clientes
// OKAY
app.get("/clientes", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// busca cliente por id = OKAY(leo)
app.get("/clientes/:id", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// OKAY
app.get("/clientes/:cpf", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

/*
// insere novo cliente (autocadastro)
// NAO EXISTE NE
app.post("/clientes", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});
*/

// unificou deposito saque transfrencia
//OKAY
app.post("/transacoes", veryfyJWT, (req, res, next) => {
  contaServiceProxy(req, res, next);
});

// extrato
// OKAY MAIS OU MENOS (funcionamento)
app.get("/transacoes", veryfyJWT, (req, res, next) => {
  contaServiceProxy(req, res, next);
});

// Rotas de Gerentes

// início
// OKAY
app.get("/gerentes/inicio", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// aprovação OK (leo)
app.put("/gerentes/clientes/aprovar/:id", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// rejeição - Meio OK, não passa o texto com motivo (leo)
app.put("/gerentes/clientes/rejeitar/:id", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// listagem de clientes (fazer composition)
app.get("/gerentes/clientes", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// listagem por cpf
app.get("/gerentes/clientes/:cpf", veryfyJWT, (req, res, next) => {
  clienteServiceProxy(req, res, next);
});

// listagem do top 3 (fazer composition)
app.get("/gerentes/clientes/top3", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// Rotas de Administradores

// início (fazer composition)
app.get("/administradores/inicio", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

// clientes (fazer composition)
app.get("/administradores/clientes", veryfyJWT, (req, res, next) => {
  adminServiceProxy(req, res, next);
});

//cadastro novo de gerentes
// OKAY
app.post("/administradores/gerentes/novo", veryfyJWT, (req, res, next) => {
  sagaServiceProxy(req, res, next);
});

// gerente por id
// OKAY
app.delete("/administradores/gerentes/:id", veryfyJWT, (req, res, next) => {
  sagaServiceProxy(req, res, next);
});

// listagem de gerentes
// OKAY okay(leo)
app.get("/administradores/gerentes", veryfyJWT, (req, res, next) => {
  gerenteServiceProxy(req, res, next);
});

// atualização de gerentes por id
// OKAY
app.put("/administradores/gerentes/:id", veryfyJWT, (req, res, next) => {
  sagaServiceProxy(req, res, next);
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

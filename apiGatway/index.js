require("dotenv-safe").config();
const jwt = require("jsonwebtoken");
const http = require("http");
const express = require("express");
const httpProxy = require("express-http-proxy");
const axios = require("axios");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require("morgan");
const helmet = require("helmet");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

// Serviço cliente rodando na porta 8080 localmente
// Para cada serviçço sera criado um ServiceProxy em uma porta
const clienteServiceProxy = httpProxy("http://localhost:8080");

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
app.get("/administradores/inicio", veryfyJWT, async (req, res, next) => {
  try {
    // Obter lista de gerentes
    const gerentesResponse = await axios.get(
      "http://localhost:8100/administradores/gerentes"
    ); // Assumindo que há um endpoint para listar todos os gerentes
    const gerentes = gerentesResponse.data; // Lista de todos os gerentes

    // Obter todos os dados de contas
    const contasResponse = await axios.get("http://localhost:5002/conta/list");
    const contas = contasResponse.data; // Lista de todas as contas

    // Mapear os dados das contas por gerente
    const gerentesMap = new Map();
    const clienteCountMap = new Map();
    const saldoPositivo = {};
    const saldoNegativo = {};

    contas.forEach((conta) => {
      const { idGerente, idUsuario, saldo } = conta;

      if (!gerentesMap.has(idGerente)) {
        gerentesMap.set(idGerente, {
          nome: "",
          quantidadeClientes: 0,
          saldoPositivo: 0,
          saldoNegativo: 0,
        });
        clienteCountMap.set(idGerente, new Set()); // Usar um Set para contar clientes únicos
      }

      // Atualizar saldo positivo e negativo
      if (saldo >= 0) {
        gerentesMap.get(idGerente).saldoPositivo += 1;
      } else {
        gerentesMap.get(idGerente).saldoNegativo += 1;
      }

      // Contar clientes por gerente
      clienteCountMap.get(idGerente).add(idUsuario); // Adiciona o cliente ao Set

      // Atualizar clienteCountMap
      gerentesMap.get(idGerente).quantidadeClientes =
        clienteCountMap.get(idGerente).size;
    });

    // Obter nomes dos gerentes
    const promises = Array.from(gerentesMap.keys()).map(async (idGerente) => {
      const gerenteResponse = await axios.get(
        `http://localhost:8100/administradores/gerentes/${idGerente}`
      );
      const gerente = gerenteResponse.data;
      gerentesMap.get(idGerente).nome = gerente.nome; // Atualiza o nome do gerente
    });

    await Promise.all(promises);

    // Formatar a resposta final
    const resposta = Array.from(gerentesMap.entries()).map(
      ([idGerente, dados]) => ({
        idGerente,
        nome: dados.nome,
        quantidadeClientes: dados.quantidadeClientes,
        saldoPositivo: dados.saldoPositivo,
        saldoNegativo: dados.saldoNegativo,
      })
    );

    res.json({ telaInicio: resposta });
  } catch (error) {
    next(error);
  }
});

// clientes (fazer composition)
app.get("/administradores/clientes", veryfyJWT, async (req, res, next) => {
  try {
    // Obter todos os clientes
    const clientesResponse = await axios.get("http://localhost:8080/clientes");
    const clientes = clientesResponse.data;

    // Obter todos os gerentes
    const gerentesResponse = await axios.get(
      "http://localhost:8100/administradores/gerentes"
    );
    const gerentes = gerentesResponse.data;
    const gerentesMap = new Map(
      gerentes.map((gerente) => [gerente.id, gerente.nome])
    );

    // Obter todas as contas
    const contasResponse = await axios.get("http://localhost:5002/conta/list");
    const contas = contasResponse.data;
    const contasMap = new Map(contas.map((conta) => [conta.idUsuario, conta]));

    // Montar o relatório
    const relatorio = clientes.map((cliente) => {
      const conta = contasMap.get(cliente.id);
      const gerenteNome =
        gerentesMap.get(conta ? conta.idGerente : null) || "Desconhecido";

      return {
        nome: cliente.nome,
        cpf: cliente.cpf,
        limite: conta ? conta.limite : "N/A",
        nomeGerente: gerenteNome,
        saldo: conta ? conta.saldo : "N/A",
      };
    });

    // Retornar o relatório
    res.json({ relatorio: relatorio });
  } catch (error) {
    next(error);
  }
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
  req.url = "/administradores/gerentes";
  gerenteServiceProxy(req, res, next);
});

app.get("/conta/saldo/:id", veryfyJWT, (req, res, next) => {
  contaServiceProxy(req, res, next);
});

// atualização de gerentes por id
// OKAY
app.put("/administradores/gerentes/:id", veryfyJWT, (req, res, next) => {
  sagaServiceProxy(req, res, next);
});

// busca de clientes por ID do gerente

app.get(
  "/clientes-por-gerente/:gerenteId",
  veryfyJWT,
  async (req, res, next) => {
    const gerenteId = req.params.gerenteId;

    try {
      // Obter IDs dos clientes no serviço de conta
      const clienteIdsResponse = await axios.get(
        `http://localhost:5002/conta/clientes-por-gerente/${gerenteId}`
      );
      const clienteIds = clienteIdsResponse.data.data;

      // Obter dados dos clientes no serviço de cliente
      const clientesResponse = await axios.get(
        `http://localhost:8080/clientes/ids?ids=${clienteIds.join(",")}`
      );
      const clientes = clientesResponse.data;

      // Obter dados de saldo
      const contasResponse = await axios.get(`http://localhost:5002/list`);
      const contas = contasResponse.data;

      // Filtrar apenas CPF, Nome, Endereço
      const clientesFiltrados = clientes.map((cliente) => ({
        id: cliente.id,
        cpf: cliente.cpf,
        nome: cliente.nome,
        endereco: cliente.endereco,
      }));

      // Combinar clientes com saldos
      const clientesComSaldo = clientesFiltrados.map((cliente) => {
        const conta = contas.find((conta) => conta.clienteId === cliente.id);
        return {
          ...cliente,
          saldo: conta ? conta.saldo : null,
        };
      });

      // Responder com os dados combinados
      res.json({ clientes: clientesComSaldo });
    } catch (error) {
      next(error);
    }
  }
);

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

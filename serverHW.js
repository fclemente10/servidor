/********************* Configuracion CORS *********************/
var cors = require('cors');
var corsOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204
}
 
/********************* Configuracion JTW *********************/
const jwt = require('jwt-simple');
const secretKey = "miClaveSecreta"; // clave de cifrado del token
const algorithm = "HS256"; // algoritimo cifrado del token
const expire = 24 * 60 * 60 * 1000; // Tiempo de expiracion en Milisegundos

/********************* Configuracion MySQL *********************/
const mysql = require("mysql");
var connectionDB = mysql.createConnection({
    host: "localhost",
    user: "admin",
    password: "Felipe123",
    database: "tfm"
});
connectionDB.connect(function(err) {
    if (err) {
        console.log("Error contectado a la base de datos", err);
        return;
    }
    console.log("Base de datos conectada");

/********************* EXPRESS *********************/
    const express = require("express");
    var app = express(); // crear la aplicacion express
    app.use("/", express.json({ strict: false })); // datos de body en JSON

/********************* WEB SOCKET *********************/

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 4400 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    console.log(`Received message => ${data}`)
    ws.send('Server ON');
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

/******************** BUSCAR Y ACTUALIZA BASE DE DATOS CON IP  ******************/
require('dns').lookup(require('os').hostname(), function (err5, ip, fam) {
    console.log('addr: ' + ip);
    if (err5) console.log("Error al buscar ip" + err5);

    var serverName = 'Prueba';
    var sql = "UPDATE servers SET ip = " + mysql.escape(ip) + " WHERE (serverName = " + mysql.escape(serverName) + ");"
        console.log(sql);
        connectionDB.query(sql, function(error, server) {
            if (error) console.log("Error al grabar IP en la base de datos" + error);
//            console.log(' OK Servidor 200' + JSON.stringify(server));
        });
  });

/********************* HEADERS *********************/
    app.all("/", function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    });



/********************* RAML *********************/
    const osprey = require("osprey");
    osprey.loadFile("./api.raml").then(function(middleware) { // cargar el API
        console.log("RAML cargado correctamente");
        app.use(cors())
        app.use("/api/v1/", middleware); // Analiza el api

        app.use(function(err1, req, res, next) { // Verificar si hay error en el API
            console.log("Error en el API:", err1);
            res.status(err1.status).send("Error API. " + req.method + " " + req.url + ": " + JSON.stringify(err));
        });

     /********************* Verificacion de usuario *********************/
        app.post("/api/v1/login", cors(corsOptions), function(req, res) {
            console.log(req.body);
            var email = req.body.email;
            var contrasena = req.body.contrasena;
            var sql = "SELECT usu.id FROM usuario as usu Where usu.email = " + mysql.escape(email) +  " and usu.contrasena = " +  mysql.escape(contrasena)+""
            console.log(sql);
         /********************* Login area *********************/
            connectionDB.query(sql, function(error, usuario) {
                if (error) return res.status(500).send("Error obteniendo usuarios");
                var userId = usuario;
               
                if (usuario.length == 0 ){
                    return res.status(401).send("Error usuarios o contraseña");
                }
                var payload = {
                    iss: userId,
                    exp: Date.now() + expire
                };
                var token = jwt.encode(payload, secretKey, algorithm);
                console.log('Token ' + token);
                res.status(200).json(token);
            });
       });

        /********************* Control de usuario *********************/
        app.get("/api/v1/login", cors(corsOptions), function(req, res) {
            connectionDB.query("SELECT * FROM usuario", function(error, usuario) {
                if (error) return res.status(500).send("Error obteniendo usuarios");
                res.status(200).json(usuario);
            });
        });

        // /api/v1/login/:email
        app.get("/api/v1/login/:email", cors(corsOptions), function(req, res) {
            var email = parseInt(req.params.email);
            connectionDB.query("SELECT * FROM usuario as usu WHERE usu.email = ?", [email], function(error, usuario) {
                if (error){
                    console.log(error);
                    return res.status(500).send("Error obteniendo usuario");
                }                 
                if (usuario.length == 0) return res.status(404).send("Error. usuario no encontrado");
                res.status(200).json(usuario);
            });
        });
 
    /********************* Mostra todos equipos *********************/
    app.get("/api/v1/equipo", cors(corsOptions), function(req, res) {

        connectionDB.query("SELECT * FROM equipo", function(error, equipo) {
            if (error) return res.status(500).send("Error obteniendo equipos");
            res.status(200).json(equipo);            
            });           
    });

    /********************* Mostra todos equipos *********************/
    app.get("/api/v1/equipo/:serial", cors(corsOptions), function(req, res) {
        var serial = req.params.serial;
        console.log("Serial=" + serial);
        connectionDB.query("SELECT * FROM equipo WHERE serialNumber = ?", [serial], function(error, equipo) {
            if (error){
                console.log(error);
                return res.status(500).send("Error obteniendo equipo");
            } 
            if (equipo.length == 0) return res.status(404).send("Error. Equipo no encontrado");
            res.status(200).json(equipo);
        });
    });

   /********************* Actualiza Equipo *********************/
    app.put("/api/v1/equipo", cors(corsOptions), function(req, res) {
        console.log(req.body);
        var serial = req.body.serialNumber;
        var variable1 = req.body.variable1;
        var variable2 = req.body.variable2;
        var accion1 = req.body.accion1;
        var accion2 = req.body.accion2;

        var sql = "UPDATE equipo SET variable1 = " + mysql.escape(variable1) + ',' + " variable2 =" + mysql.escape(variable2) + ',' + " accion1 = " + mysql.escape(accion1) + ',' + " accion2 = " + mysql.escape(accion2) + " WHERE (serialNumber = " + mysql.escape(serial) + ");"
//UPDATE `tfm`.`equipo` SET `variable1` = '1', `variable2` = '230', `accion1` = '0', `accion2` = '1' WHERE (`idequipo` = '2');
        console.log(sql);
        connectionDB.query(sql, function(error, equipo) {
            if (error) return res.status(500).send("Error actualizar equipo");
            res.status(200).json(equipo);
        });
    });

/********************* Crea Nuevo Equipo *********************/
    app.post("/api/v1/equipo", cors(corsOptions), function(req, res) {
        console.log(req.body);
        var nombre = req.body.nombre;
        var serial = req.body.serialNumber;

        // INSERT INTO `tfm`.`equipo` (`nombre`, `serialNumber`) VALUES ('ttt', '123456');
        var sql = "INSERT INTO equipo (nombre, serialNumber) VALUES (" + mysql.escape(nombre) + "," + mysql.escape(serial) + ");"      
        connectionDB.query(sql, function(error, pedidos) {
            console.log(error);
            if (error) return res.status(500).send("Error al crear equipo");
            res.status(200).json(pedidos);
        });
        var sql2 = "INSERT INTO mydevices (equipo, serialNumber) VALUES (" + mysql.escape(nombre) + "," + mysql.escape(serial) + ");"      
        connectionDB.query(sql2, function(error, pedidos) {
            console.log(error);
            if (error) return res.status(500).send("Error al crear equipo en mydevices");
            res.status(200).json(pedidos);
        });
    });

/********************* INFORMACION de EQUIPOS *********************/
        app.get("/api/v1/mydevices", cors(corsOptions), function(req, res) {
            connectionDB.query("SELECT * FROM mydevices", function(error, equipo) {
                if (error) return res.status(500).send("Error obteniendo devices");
                res.status(200).json(equipo);
            });
        });
    
    /********************* Config API *********************/
    app.use(cors())
    app.use("/api/v1/", function(req, res, next) { // dentro del API
        var token = res.headers['authorization'];
        if (!token) {
            res.status(403).json('missing token');
            console.error("No se ha indicado token");
            return
        }
        console.log("Ok");
        res.send("Ok. " + req.method + " " + req.url);

        // Descodificamos el token para que nos devuelva el usuario y la fecha de expiración
        var payload = jwt.decode(token, secretKey, algorithm);
        if (!payload || !payload.iss || !payload.exp) {
            console.error("Token error");
            return res.status(403).json("Token error");
        }

        // Comprobamos la fecha de expiración
        if (Date.now() > payload.exp) {
            console.error("Expired token");
            return res.status(403).json("Expired token");
        }

        // Añadimos el usuario a req para acceder posteriormente.
        req.user = payload.iss;
        next(); // todo ok, continuar
        
    });

    // Iniciar app
    var port = 3000;
    app.listen(port, function() {
        console.log("Servidor escuchando en puerto:", port);
    });

    }, function(err2) { // se ha producido un error cargando el RAML
        console.log("Error cargando RAML: " + JSON.stringify(err2));
    });

    // Configuracion WEB Socket
    
});

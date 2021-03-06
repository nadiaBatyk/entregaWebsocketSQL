const express = require("express");
const rutasProducto = require("./routes/productosRutas");
const { engine } = require("express-handlebars");
const { Server: ioServer } = require("socket.io");
const http = require("http");
const ContenedorMensajes = require("./mensajesContainer");
const { knex } = require("./DBconfig/DBconfigMensajes");
const ContenedorProductos = require("./productosContainer");
const { knexProducts } = require("./DBconfig/DBconfigProductos");

const app = express();

//SERVIDOR HTTP CON FUNCIONALIDADES DE APP (EXPRESS)
const httpServer = http.createServer(app);
//SERVIDOR WEBSOCKET CON FUNCIONALIDADES DE HTTP
const socketServer = new ioServer(httpServer);

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//middleware para cargar archivos
app.use(express.static(__dirname + "/public"));

//MOTOR DE PLANTILLAS
app.set("view engine", "hbs");
///CONFIGURACION HANDLEBARS
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "index.hbs",
    layoutsDir: __dirname + "/views/layouts",
    partialsDir: __dirname + "/views/partials",
  })
);

//DONDE ESTAN LOS ARCHIVOS DE PLANTILLA
app.set("views", "/views");

const mensajesDB = new ContenedorMensajes(knex, "mensajes");
const productosDB = new ContenedorProductos(knexProducts, "productos");

socketServer.on("connection", (socket) => {
  productosDB.getAll().then(productos=>{
    socket.emit('datosTabla', productos)
  })
  socket.on("nuevo-producto", async (producto) => {
    await productosDB.save(producto);
    productosDB.getAll().then(productos=>{
      socketServer.sockets.emit('datosTabla', productos)
    })
  });
    
  mensajesDB.getAllMessages().then((res) => {
    socket.emit("datosMensajes", res);
  });

  socket.on("nuevo-mensaje", async (mensaje) => {
    await mensajesDB.save(mensaje);
    await mensajesDB.getAllMessages().then((res) => {
      socketServer.sockets.emit("datosMensajes", res);
    });
  });
});

//RUTAS
app.use("/", rutasProducto);

//PUERTO

const PORT = 8080;
const server = httpServer.listen(PORT, () => {
  console.log(`servidor en puerto ${server.address().port}`);
});
//por si hay errores en el servidor
server.on("error", (error) => console.log(`error en el servidor ${error}`));

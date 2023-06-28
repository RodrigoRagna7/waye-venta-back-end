var express = require('express');
var router = express.Router();
let { add, findOne, update, findAll } = require("../DBManger/mongo");
const Joi = require('@hapi/joi');
let Config = require('../Config/config').server.jwt;
let jwt = require('jsonwebtoken');
var path = require('path');
const fs = require('fs')
var pdf = require('html-pdf');
var QRCode = require('qrcode');
const cron = require("node-cron");


var options = {
  format: "A3",
  orientation: "portrait",

  header: {
    height: "1mm",

  },
  footer: {
    height: "1mm",
    contents: {
      default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value

    }
  }
};



let data = Joi.object().keys({

  productos: Joi.array().items({
    idArticulo: Joi.number().integer().required(),
    nombre: Joi.string().min(3).max(555).required(),
    cantidad: Joi.number().integer().required(),
    precio: Joi.number().integer().required(),
  }),
  tipoVenta: Joi.string().min(3).max(255).required(),
  envio: Joi.number().integer().required(),
});

//{ "id": 70, "nombre": "Puños Azul", "etiquetas": 25 }
let dataQr = Joi.array().items({
  id: Joi.number().integer().required(),
  nombre: Joi.string().min(3).max(255).required(),
  etiquetas: Joi.number().integer().required(),
})

router.post('/venta', validateToken, async function (req, res, next) {
  const firm = "[index:venta] "
  console.log(firm, "validando request", req.body)


  const { error } = data.validate(req.body)
  if (error) {
    return res.status(400).json(
      { code: 10, "mensaje": error.details[0].message }
    )
  }
  try {
    const token = await verifyToken(req.headers.authorization).catch(err => { }) || {};
    console.log(firm, "token", token)
    let request = req.body;

    request.fecha = new Date();
    request.vendedor = token.email;
    request.activa = true;
    request.total = 0;
    request.pagada = false;
    request.idOrden = `${new Date().toLocaleDateString('en-US')}/${token.idUsuario}/${request.tipoVenta}`
    request.productos.map(tmep => {
      request.total += tmep.precio;
      update({ id: parseInt(tmep.idArticulo, 10) }, { $inc: { cantidad: -1 } }, "productos");
    })

    request.total += request.envio;
    console.log(firm, "save data ", request)
    let addVenta = await add(request, "ventas");
    res.send(addVenta);

  } catch (error) {
    console.log(firm, "error ", error)
    res.status(500).json({ code: 13, mensaje: "id Ivalido" })

  }
});

router.post('/items/add', validateToken, async function (req, res, next) {

  let data = req.body;
  console.log("🚀 ~ file: index.js:93 ~ data:", data)

  let response = [];

  await Promise.all(data.map(async t => {
    let a = await update({ id: parseInt(t.id, 10) }, { $inc: { cantidad: t.etiquetas } }, "productos");

    let tem = {

      id: t.id,
      exito: a.modifiedCount
    }
    response.push(tem)

  }))

  res.send(response)
})

/**
 * 
 */
router.get('/aticulo/:articulo', validateToken, async function (req, res, next) {
  const firm = "[index:aticulo] "
  console.log(firm, "request ", req.params)
  try {
    const id = parseInt(req.params.articulo, 10);
    let query = { id }
    console.log(firm, "query:", query)
    let respon = await findOne(query, "productos", {});
    console.log(firm, "respuesta ", respon)
    if (respon.code == 200) {
      res.send(respon)
    } else {
      res.status(respon.code).json(respon)
    }
  } catch (error) {
    console.log(firm, "error ", error)
    res.status(400).json({ code: 13, mensaje: "id Ivalido" })
  }
});

router.get('/aticulo/search/:articulo', async function (req, res, next) {
  const firm = "[index:aticulo] "
  console.log(firm, "request ", req.params)
  try {

    let temp = req.params.articulo.split(" ");
    let querys = temp.map(t => {

      return { nombre: new RegExp(t, "i") }
    })

    console.log("querys ", querys)
    let query = { $or: querys }

    console.log(firm, "query:", query)
    let respon = await findAll(query, "productos", {}, { id: 1 });

    if (respon.code == 200) {
      res.send(respon)
    } else {
      res.status(respon.code).json(respon)
    }
  } catch (error) {
    console.log(firm, "error ", error)
    res.status(400).json({ code: 13, mensaje: "id Ivalido" })
  }
});

router.post('/pdf/qr', async (req, res, next) => {
  console.log("entre ")

  console.log("request ", req.body)


  const { error } = dataQr.validate(req.body)
  if (error) {
    return res.status(400).json(
      { code: 10, "mensaje": error.details[0].message }
    )
  }

  let dir = path.join(__dirname, "../public/images/qr");
  fs.exists(dir, exists => {
    console.log("existe ??", exists)
    if (!exists) {
      console.log("creando el archivo")
      fs.mkdirSync(dir);
      console.log("creando creado")
      foo(dir, req.body, res);
      //res.send("no ests directorio")
    } else {

      console.log("ya esta el archivo")
      foo(dir, req.body, res);
      //res.send("exite el directorio")
    }


  });

});

router.get('/faltantes', validateToken, async function (req, res, next) {

  try {

    console.log("---", req.body.query)
    console.log("..." + JSON.parse(req.body.query))
    console.log("---", req.body.query)
    let query = JSON.parse(req.body.query)
    let proyection = { projection: { id: 1, nombre: 1, cantidad: 1 } }
    let ordenar = { id: 1 }

    console.log("query:", query)
    let respon = await findAll(query, "productos", proyection, ordenar);
    //let respon = "hola"
    res.send(respon)

  } catch (error) {
    console.log("error ", error)
    res.status(500).json({ code: 13, mensaje: "Error servidor" })
  }
});

async function foo(dir, request, res) {
  try {
    console.log("el path: ", dir)
    let files = await fs.promises.readdir(dir);
    console.log("files", files)

    request.map(t => {
      if (fs.existsSync(dir + "/" + t.id + ".png")) {
        console.log("existe " + dir + "/" + t.id + ".png")
      } else {
        let dataQR = dir + "/" + t.id + ".png";
        console.log("url qr", dataQR)
        QRCode.toFile(dataQR, (t.id + ""), { errorCorrectionLevel: 'H' })
      }
    });
    let a = [];
    request.map(t => {
      for (let i = 0; i < t.etiquetas; i++) {
        console.log(`src="${dir}/${t.id}.png"`)
        let copiar = `<td> <div> <img class="test1" src="https://waye-venta-back-end.herokuapp.com/images/qr/${t.id}.png" > </div> <div> id: ${t.id} <br>  ${t.nombre} </div> </td>`
        //console.log(copiar)
        a.push(copiar)
      }
    });
    generatePDF(a, res);

  } catch (error) {
    console.log("mi error ", error)
    res.status(500).send({ code: 212, "mensaje": "error al enconrar el direcotiro ", dir })
  }
}


function generatePDF(lista, repuesta) {


  let temHtml = "<tr>";
  let temo = 0;
  for (let i = 1; i < lista.length + 1; i++) {
    if (i % 6 === 0) {
      temHtml += lista[temo] + "</tr> <tr>"
    } else {
      temHtml += lista[temo]
    }
    temo++;
  }
  temHtml += "</tr>"
  let html = `<!DOCTYPE html><html><style>.test1 {height: 130px;width: 130px;}</style><head><mate charest="utf-8" /><title>Hello world!</title></head><body><table style="text-align: center;">${temHtml}</table></body></html>`

  let myPath = path.join(__dirname, "../public/images/qr");


  console.log("direcotiro ", myPath)
  fs.mkdirSync(myPath, { recursive: true });

  let name = `${new Date().toLocaleDateString('en-US').replace("/", "-").replace("/", "-")}-${Math.floor((Math.random() * 100000) + 1)}`
  console.log(myPath + name + ".pdf")
  pdf.create(html, options).toFile(myPath + "/" + name + ".pdf", function (err, res) {
    if (err) return console.log(err);
    console.log(res); // { filename: '/app/businesscard.pdf' }

    repuesta.json({ code: 13, "pdf": name + ".pdf" })
  });

}

router.get('/pagos', validateToken, async function (req, res, next) {
  console.log("🚀 ~ file: index.js:293 ~ pagos:")

  const token = await verifyToken(req.headers.authorization).catch(err => { }) || {};
  console.log("🚀 ~ file: index.js:290 ~ token:", token)

  if (token.tipo == 1) {

    let query = {
      pagada: false,
      vendedor: "santiago@gmail.com"
    }
    let respon = await getPago(query);
    respon.vendedor = "santiago@gmail.com"
    query.vendedor = "valeria@gmail.com"
    let respon1 = await getPago(query);
    respon1.vendedor = "valeria@gmail.com"
    res.send([respon, respon1])
  } else {

    let query = {
      pagada: false,
      vendedor: token.email
    }

    let respon = await getPago(query)


    res.send(respon);
  }


});

async function getPago(query) {
  let proyection =
  {
    projection: {
      tipoVenta: 1,
      productos: 1,
      pagada: 1,
      total: 1
    }
  }

  let response = await findAll(query, "ventas", proyection, { id: 1 });
  let suma = 0;
  response.data.forEach(element => {
    if (element.tipoVenta == 'metro') {
      suma += 100
    }
    if (element.tipoVenta == 'mercadoLibre') {
      suma += 20
    }
    if (element.tipoVenta == 'personal') {
      suma += 30
    }
  });

  response.pago = suma;
  console.log("🚀 ~ file: index.js:341 ~ getPago ~ response.pago:", response.pago)
  return response
}

async function getUser(token) {
  jwt.verify(req.headers.authorization, Config.token_llave, function (err, user) {
    //console.log("error ", err)    
    return user.email;
  });
}

/**
 * 
 */
router.post('/devoluciones', async function (req, res, next) {
  const firm = "[index:devoluciones] "
  res.send({ mensaje: "hola mundo!!!! " })
});


async function verifyToken(token) {
  if (!token) return {};
  return new Promise((resolve, reject) =>
    jwt.verify(token, Config.token_llave, (err, decoded) => err ? reject({}) :

      resolve(decoded)

    )
  );
}

function validateToken(req, res, next) {
  console.log("valido token ", req.headers.authorization)
  if (req.headers.authorization === undefined) {
    res.status(401).send({
      code: 401, "mensaje": "No tines permisos"
    })
  } else {
    jwt.verify(req.headers.authorization, Config.token_llave, function (err, user) {
      //console.log("error ", err)
      console.log("🚀 ~ file: index.js:333 ~ user:", user)
      if (err) {
        res.status(401).send({
          code: 403, "mensaje": "no tienes permisos"
        })
      } else {

        next();
      }
    });
  }
}

//cron.schedule("*/15 * * * * *", function () {
cron.schedule("* * * 1 * *", function () {// dia 
  console.log("--------------------- eliminado imagenes");
  //deltePng()
  console.log("running a task every 15 seconds");
});


async function deltePng() {
  const dir = path.join(__dirname, "../public/images/qr");
  const files = await fs.promises.readdir(dir)
  console.log(files, "")
  files.map(t => {
    console.log(t)
    fs.unlinkSync(dir + "/" + t)
  });
}



module.exports = router;

var express = require('express');
var router = express.Router();
let { add, findOne, update, findAll } = require("../DBManger/mongo");
const Joi = require('@hapi/joi');
let Config = require('../Config/config').server.jwt;
let jwt = require('jsonwebtoken');
var path = require('path');
const fs = require('fs')
var pdf = require('html-pdf');
var QRCode = require('qrcode')



var options = {
  format: "A3",
  orientation: "portrait",

  header: {
    height: "8mm",

  },
  footer: {
    height: "8mm",
    contents: {
      default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value

    }
  },
  childProcessOptions: {
    env: { OPENSSL_CONF: '/dev/null' }
  }

};



let data = Joi.object().keys({

  productos: Joi.array().items({
    idArticulo: Joi.number().integer().required(),
    cantidad: Joi.number().integer().required(),
    precio: Joi.number().integer().required(),
  }),
  tipoVenta: Joi.string().min(6).max(255).required(),
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
    request.cantidad = request.cantidad * -1
    request.idOrden = `${new Date().toLocaleDateString('en-US')}/${token.idUsuario}/${request.tipoVenta}`
    request.productos.map(tmep => {

      update({ id: parseInt(tmep.idArticulo, 10) }, { $inc: { cantidad: -1 } }, "productos");
    })

    let addVenta = await add(request, "ventas");
    res.send(addVenta);

  } catch (error) {
    console.log(firm, "error ", error)
    res.status(500).json({ code: 13, mensaje: "id Ivalido" })

  }
});

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
    let respon = await findAll(query, "productos", {});

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

router.get('/pdf/qr', async (req, res, next) => {

  const { error } = dataQr.validate(req.body)
  if (error) {
    return res.status(400).json(
      { code: 10, "mensaje": error.details[0].message }
    )
  }
  let request = req.body;

  console.log("entrar a ver las imagenes: ",)

  // let dir = path.join(__dirname, "../public/images/qr");
  // let files;
  res.send(dir, files)
  // try {

  //   files = await fs.promises.readdir(dir);
  // } catch (error) {
  //   res.status(500).send({ code: 212, "mensaje": "error al enconrar el direcotiro ", dir })
  // }
  // console.log("files", files)

  // request.map(t => {
  //   if (fs.existsSync(dir + "/" + t.id + ".png")) {
  //     console.log("existe " + dir + "/" + t.id + ".png")
  //   } else {
  //     let dataQR = dir + "/" + t.id + ".png";
  //     console.log("url qr", dataQR)
  //     //QRCode.toFile(dataQR, t.id + "", { errorCorrectionLevel: 'H' })
  //   }
  //   res.send({ request, dir })
  // });
});

// let a = [];


// request.map(t => {
//   for (let i = 0; i < t.etiquetas; i++) {
//     console.log(`src="${dir}/${t.id}.png"`)
//     let copiar = `<td> <div> <img class="test1" src="https://waye-venta-back-end.herokuapp.com/images/qr/${t.id}.png" > </div> <div> id: ${t.id} <br>  ${t.nombre} </div> </td>`
//     //console.log(copiar)
//     a.push(copiar)
//   }
// });

// generatePDF(a, res);




function generatePDF(lista, resesponse) {


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

  let myPath = path.join(__dirname, "../public/pdf/");


  console.log("direcotiro ", myPath)
  fs.mkdirSync(myPath, { recursive: true });

  let name = `${new Date().toLocaleDateString('en-US').replace("/", "-").replace("/", "-")}-${Math.floor((Math.random() * 100000) + 1)}`
  console.log(myPath + name + ".pdf")
  pdf.create(html, options).toFile(myPath + "/" + name + ".pdf", function (err, res) {
    if (err) return console.log(err);
    console.log(res); // { filename: '/app/businesscard.pdf' }
    resesponse.json({ code: 13, mensaje: name })
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


async function deltePDF() {
  const dir = path.join(__dirname, "../public/pdf");
  const files = await fs.promises.readdir(dir)
  console.log(files, "")
  files.map(t => {
    console.log("borre ", t);
    fs.unlinkSync(dir + "/" + t)
  });
}

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

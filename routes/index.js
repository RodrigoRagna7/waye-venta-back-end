var express = require('express');
var router = express.Router();
let { add, findOne, update } = require("../DBManger/mongo");
const Joi = require('@hapi/joi');
let Config = require('../Config/config').server.jwt;
let jwt = require('jsonwebtoken');




let data = Joi.object().keys({

  productos: Joi.array().items({
    idArticulo: Joi.number().integer().required(),
    cantidad: Joi.number().integer().required(),
    precio: Joi.number().integer().required(),
  }),
  tipoVenta: Joi.string().min(6).max(255).required(),
  envio: Joi.number().integer().required(),
});


router.post('/venta', validateToken, async function (req, res, next) {
  const firm = "[index:venta] "
  console.log(firm, "validando request", req.body)
  const { error } = data.validate(req.body)
  if (error) {
    return res.status(400).json(
      { error: error.details[0].message }
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
router.get('/aticulo/:articulo', async function (req, res, next) {
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
  console.log("valido token")
  if (req.headers.authorization === undefined) {
    res.status(401).send({
      error: 'Token inválido'
    })
  } else {
    jwt.verify(req.headers.authorization, Config.token_llave, function (err, user) {
      if (err) {
        res.status(401).send({
          error: 'Token inválido'
        })
      } else {
        next();
      }
    });
  }
}

module.exports = router;

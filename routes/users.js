var express = require('express');
var router = express.Router();
let Config = require('../Config/config').server.jwt;

let jwt = require('jsonwebtoken');
//let { buscarCorreo, buscarCorreoYpass } = require('../DBManager/DBManagerLogin');
let { login } = require("../controller/users")

///const { validarUsuario } = require('../util/validadorLogin');

router.post('/login', login, function (req, res, next) {
    console.log("🚀 ~ file: users.js:12 ~ req:", req.body)
    try {
        const firm = "[router:login] 5";

        let tokenData = {
            email: req.body.email,
            idUsuario: req.body.id,
            tipo: req.body.tipo,
        }
        console.log("🚀 ~ file: users.js:21 ~ tokenData:", tokenData)

        let token =
            jwt.sign(tokenData, Config.token_llave, {
                expiresIn: Config.expira_token // expires in 24 hours

            });
        console.log("🚀 ~ file: users.js:21 ~ token:", token)
        res.send({ code: 200, "token": token })
    } catch (error) {
        res.status(500).send({ code: 14, "mensaje": "error servidor " })
    }
});

module.exports = router;


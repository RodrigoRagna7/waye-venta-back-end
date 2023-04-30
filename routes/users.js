var express = require('express');
var router = express.Router();
let Config = require('../Config/config').server.jwt;

let jwt = require('jsonwebtoken');
//let { buscarCorreo, buscarCorreoYpass } = require('../DBManager/DBManagerLogin');
let { login } = require("../controller/users")

///const { validarUsuario } = require('../util/validadorLogin');

router.post('/login', login, function (req, res, next) {

    try {

        const firm = "[login] 5";
        console.log(firm, req.body)
        let tokenData = {
            email: req.body.email,
            idUsuario: req.body.id
        }


        let token =
            jwt.sign(tokenData, Config.token_llave, {
                expiresIn: Config.expira_token // expires in 24 hours

            });
        res.send({ "token": token })
    } catch (error) {
        res.status(500).send({ code: 14, "mensaje": "error servidor " })
    }
});

module.exports = router;


const dotenv = require('dotenv');
dotenv.config();
let server = {
    base_datos: {
        url: process.env.URL_BASE,
        dataBase: ""
    },
    jwt: {
        token_llave: process.env.TOKEN_LLAVE,
        expira_token: 86400,
    }
}

module.exports = {
    server: server,
};
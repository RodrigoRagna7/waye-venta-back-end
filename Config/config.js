let server = {
    base_datos: {
        url: "mongodb+srv://rodrigorivera12357:myPassword@inventario.of2f7xw.mongodb.net/?retryWrites=true&w=majority"
    },
    jwt: {
        token_llave: "perritoMedia",
        expira_token: 86400,
    }
}

module.exports = {
    server: server,
};
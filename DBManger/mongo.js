const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = require('../Config/config').server.base_datos.url;
const client = new MongoClient(url);



async function add(documents, coleccion, res) {
    const firm = "[Mongo:add] ";
    try {
        const collection = client.db(process.env.DATA_BASE).collection(coleccion);
        //console.log("conexion :", collection, "datos ", documents)
        let resultado = await collection.insertOne(documents)

        return { code: 200, resultado }
        //res.send(resultado);

    } catch (error) {
        console.log(firm, "error , ", error)
        return { code: 500, mensaje: "Error Base de datos" };
        //res.status(500).send({ mensaje: "Error Base de datos" });
    }
}

async function findOne(query, coleccion, poyeccion) {
    const firm = "[Mongo:findOne] ";
    try {
        const collection = client.db(process.env.DATA_BASE).collection(coleccion);
        const data = await collection.findOne(query, poyeccion);
        return data == null ? {
            code: 404, "mensaje": "no hay datos"
        } : { code: 200, data };

    } catch (error) {
        console.log(firm, "error , ", error)
        return { code: 500, mensaje: "Error Base de datos" };
    }
}

async function findAll(query, coleccion, poyeccion) {

    const firm = "[Mongo:findAll] ";
    console.log("querya ", query)
    try {

        const collection = client.db(process.env.DATA_BASE).collection(coleccion);
        const data = await collection.find(query, { _id: 1, marca: 1 }).toArray();;
        console.log(data)
        return data == null ? {
            code: 404, "mensaje": "no hay datos"
        } : { code: 200, data };

    } catch (error) {
        console.log(firm, "error , ", error)
        return { code: 500, mensaje: "Error Base de datos" };
    }
}


// async function findAll(query, coleccion, poyeccion) {
//     const firm = "[Mongo:findAll] ";

//     try {
//         const collection = client.db(process.env.DATA_BASE).collection(coleccion);
//         const data = await collection.find(query, poyeccion);
//         return data;
//     } catch (error) {
//         console.log(firm, "error , ", error)
//         return { code: 500, mensaje: "Error Base de datos" };
//     }
// }

async function update(query, update, coleccion) {
    const firm = "[Mongo:update] ";
    console.log(firm, query)
    try {
        const collection = client.db(process.env.DATA_BASE).collection(coleccion);
        const data = await collection.updateOne(query, update);
        console.log("actulizado ", data)
        return data;
    } catch (error) {
        console.log(firm, "error , ", error)
        return { code: 500, mensaje: "Error Base de datos" };
    }
}


module.exports.update = update;
module.exports.findAll = findAll;
module.exports.findOne = findOne;
module.exports.add = add;

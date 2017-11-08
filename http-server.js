const http = require('http');
const net = require('net');

const hostname = '127.0.0.1';
const port = 3000;
const tcp_port = 4000;
const connection = new net.Socket();

connection.connect(tcp_port, hostname, () => {
    console.log('Connected to the TCP server');
});

const handlers = {
    '/workers': (req, res, payload, cb) => {
        connection.write(JSON.stringify({
             "handl": "getWorkers", 
            }));
        connection.on('data', (data, error) => {
            if (!error) {
                data = JSON.parse(data);
                if (data["handl"] === "getWorkers") {
                    cb(null, data["array"]);
                }
            }
            else console.error(error);
        });
    },
    '/workers/add': (req, res, payload, cb) => {
        if (payload.x !== undefined) {
            connection.write(JSON.stringify({ 
                "handl": "add",
                "x": payload.x,
             }));
            connection.on('data', (data, error) => {
                if (!error) {
                    data = JSON.parse(data);
                    if (data["handl"] === "add") {
                        cb(null, {
                            "pid": data["pid"],
                            "startedOn": data["date"],
                        });
                    }
                }
                else console.error(error);
            });
        }
        else cb({code: 405, message: 'Worker not found'});
    },
    '/workers/remove': (req, res, payload, cb) => {
        if (payload.id !== undefined) {
            connection.write(JSON.stringify({
                "handl": "remove",
                "id": payload.id,
            }));
            connection.on('data', (data, error) => {
                if (!error) {
                    data = JSON.parse(data);
                    if (data["handl"] === "remove") {
                        cb(null, {
                            "pid": data["pid"],
                            "startedOn": data["date"],
                            "numbers": data["numbers"],
                        });
                    }
                }
                else console.error(error);
            });
        }
        else cb({ "code": 405, "message": 'Worker not found' });
    },
};

const server = http.createServer((req, res) => {
    parseBodyJson(req, (err, payload) => {
        const handler = getHandler(req.url);
        handler(req, res, payload, (err, result) => {
            if (err) {
                res.writeHead(err.code, {'Content-Type' : 'application/json'});
                res.end( JSON.stringify(err) );
            }
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(result, null, "\t"));
        });
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function getHandler(url) {
    return handlers[url] || notFound;
}

function notFound(req, res, payload, cb) {
    cb({"code": 404, "message": 'Not found'});
}

function parseBodyJson(req, cb) {
    let body = [];
    req.on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {
        body = Buffer.concat(body).toString();
        if (body !== "") {
            params = JSON.parse(body);
            cb(null, params);
        }
        else {
            cb(null, null);
        }
    });
}
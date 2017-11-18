const path = require('path');
const net = require('net');
const fs = require('fs');
const uid = require('uid');
const child_process = require('child_process');

const port = 4000;
let workers = [];

const server = net.createServer((client) => {
    console.log('New client connected');

    client.on('data', handler);
    client.on('end', () => console.log(`Client ${client.id} disconnected`));

    function handler(data, error) {
        if (!error) {
            data = JSON.parse(data);
            handlers[data["handl"]](data, client);
        }
        else console.error(error);
    }
});

server.listen(port, () => {
    console.log(`Server listening on localhost:${port}`);
});

const handlers = {
    "getWorkers": async (data, client) => {
        let res = await getWorkers();
        res["handl"] = "getWorkers";
        client.write(JSON.stringify(res));
    },
    "add": (data, client) => {
        if(startWorker(data["x"], client)){
            client.write(JSON.stringify({
                "handl": "add",
                "pid": workers[workers.length - 1].pid,
                "date": workers[workers.length - 1].startedOn,
            }));
        }         
    },
    "remove": async (data, client) => {
        let index = workers.findIndex(worker => worker.pid == data["id"]);
        let numbers = await getNumbers(workers[index]);
        const message = {
            "handl": "remove",
            "pid": workers[index].pid,
            "date": workers[index].startedOn,
            "numbers": numbers,
        }
        fs.appendFile(workers[index].filename, "]", () => {});
        process.kill(workers[index].pid);
        workers.splice(index, 1);
        client.write(JSON.stringify(message));
    },
}

function startWorker(interval, client) {
    if(isNaN(Number(interval)) || interval <= 0) {
        client.write(JSON.stringify({ "handl": "exit" }));
        return false;
    }
    let filename = `${__dirname}/${uid()}.json`;
    let worker = child_process.spawn('node', ['worker.js', filename, interval]);
    let date = new Date().toString();
    worker.startedOn = date.split(/ /g).slice(1, 5).join(' ');
    worker.filename = filename;
    workers.push(worker);
    return true;
}

function getNumbers(worker) {
    return new Promise((resolve, reject) => {
        fs.readFile(worker.filename, (error, data) => {
            if (!error) {
                resolve(data + "]");
            }
            else {
                reject(error);
            }
        })
    })
}

async function getWorkers() {
    return new Promise(async (resolve) => {
        let res = [];
        for (i = 0; i < workers.length; i++) {
            let numbers = await getNumbers(workers[i]);
            res.push({
                "pid" : workers[i].pid,
                "startedOn" : workers[i].startedOn,
                "numbers" : numbers,
            });
        }
        resolve({ "array": res });
    })
}
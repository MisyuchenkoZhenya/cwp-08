const path = require('path');
const net = require('net');
const fs = require('fs');
const uid = require('uid');
const child_process = require('child_process');

const port = 4000;
let seed = 0;
const separator = "|||||";
let workers = [];

const server = net.createServer((client) => {
    console.log('New client connected');

    client.on('data', handler);
    client.on('end', () => console.log(`Client ${client.id} disconnected`));

    function handler(data, error) {
        if (!error) {
            handlers[data.toString().split(separator)[0]](data, client);
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
        client.write(`getWorkers${separator}${JSON.stringify(res)}`);
    },
    "add": (data, client) => {
        startWorker(data.toString().split(separator)[1]);
        client.write(`add${separator}${workers[workers.length - 1].pid}${separator}${workers[workers.length - 1].startedOn}`);
    },
    "remove": async (data, client) => {
        let index = workers.findIndex(worker => worker.pid == data.toString().split(separator)[1]);
        let numbers = await getNumbers(workers[index]);
        client.write(`remove${separator}${workers[index].pid}${separator}${workers[index].startedOn}${separator}${numbers}`);
        fs.appendFile(workers[index].filename, "]", () => {});
        process.kill(workers[index].pid);
        workers.splice(index, 1);
    },
}


function startWorker(interval) {
    let filename = `${__dirname}/${uid()}.json`;
    let worker = child_process.spawn('node', ['worker.js', filename, interval], {detached:true});
    let date = new Date().toString();
    worker.startedOn = date.split(/ /g).slice(1, 5).join(' ');
    worker.filename = filename;
    workers.push(worker);
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
        resolve(res);
    })
}
const fs = require('fs');

let jsonFile = process.argv[2];
let X_number = Math.ceil(process.argv[3]);

fs.writeFile(jsonFile, `[ ${rand()}`, (err) => {
    if(err){
        console.log(err.Error);
        return;
    }
    setInterval(() => {
        fs.appendFile(jsonFile, `, ${rand()}`, () => {});
    }, X_number * 1000);
});

function rand(){
    return Math.round(Math.random() * 1000);
}

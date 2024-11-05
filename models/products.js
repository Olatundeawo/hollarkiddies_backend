const mysql = require('mysql2');


const pool = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: 'data',
});


pool.connect(err => {
    if (err) throw err;
    console.log('MySQL connected...');
})
module.exports = pool;
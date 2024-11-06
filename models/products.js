const mysql = require('mysql2');

const pool = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.PORT || 28216,
});
pool.connect((err) => {
    if (err) {
        console.error('Error connecting to Aiven MySQL:', err);
        return;
    }
    console.log('Connected to Aiven MySQL');
});

module.exports = pool;


// SQL statements to create tables
// const createProductsTable = `
//     CREATE TABLE IF NOT EXISTS products (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         name VARCHAR(225) NOT NULL,
//         description TEXT,
//         price DECIMAL(10,2),
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );`;

// const createProductImagesTable = `
//     CREATE TABLE IF NOT EXISTS product_images (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         product_id INT NOT NULL,
//         image_path VARCHAR(255) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
//     );`;

// const createUsersTable = `
//     CREATE TABLE IF NOT EXISTS users (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         email VARCHAR(100) NOT NULL,
//         password VARCHAR(100) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//     );`;

// // Function to initialize tables
// function initializeTables() {
//     pool.connect(err => {
//         if (err) {
//             console.error('Error connecting to MySQL:', err);
//             pool.end(); // Close connection if there's an error
//             return;
//         }
//         console.log('MySQL connected...');

//         // Create the tables sequentially to ensure foreign key dependencies are handled
//         pool.query(createProductsTable, (err, result) => {
//             if (err) {
//                 console.error('Error creating products table:', err);
//             } else {
//                 console.log('Products table created or already exists.');
//             }
//         });

//         pool.query(createProductImagesTable, (err, result) => {
//             if (err) {
//                 console.error('Error creating product_images table:', err);
//             } else {
//                 console.log('Product images table created or already exists.');
//             }
//         });

//         pool.query(createUsersTable, (err, result) => {
//             if (err) {
//                 console.error('Error creating users table:', err);
//             } else {
//                 console.log('Users table created or already exists.');
//             }

//             // Close the pool connection after all tables are created
//             pool.end(err => {
//                 if (err) {
//                     console.error('Error closing the connection:', err);
//                 } else {
//                     console.log('Database connection closed.');
//                 }
//             });
//         });
//     });
// }

// Run the table initialization
// initializeTables();

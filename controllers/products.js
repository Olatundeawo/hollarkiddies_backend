const Products = require('../models/products');
const asyncHandler = require("express-async-handler");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, 'images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });  // Ensure the directory exists
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');  // Sanitize filenames
      cb(null, Date.now() + '-' + sanitizedFilename);  // Use sanitized filename
    }
  });
  
  const upload = multer({ storage: storage });

const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        Products.query(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};


// For index page
exports.index = asyncHandler(async(req, res, next) => {
    res.send('NOT IMPLENTED')
})

// Display all products
exports.product_list = asyncHandler( async (req, res, next) => {
    let sql = `SELECT 
                    p.id AS product_id,
                    p.name,
                    p.description,
                    p.price,
                    p.created_at,
                    GROUP_CONCAT(pi.image_path) AS images
                    FROM
                        products p
                    LEFT JOIN
                            product_images pi ON p.id = pi.product_id
                    GROUP BY
                            p.id`;
    try {
        const results = await new Promise((resolve, reject) => {
            Products.query(sql, (err, result) => {
                if (err) return reject(err)
                    else {
                    const formattedResult = result.map(product => ({
                    ...product,
                    images: product.images ? product.images.split(',') : [] // convert comma sperated images into an array
                     }));

                    resolve(formattedResult);
                }

            });
        });
        res.json(results);

        
    } catch (err) {
        // Error handling
        res.status(500).json({ error: err.message });
    }
});

// Display detailed page on a particular product
exports.product_detail = asyncHandler(async (req, res, next) => {
    const productDetail = req.params.id;
        let sql = `SELECT 
                    p.id AS product_id,
                    p.name,
                    p.description,
                    p.price,
                    p.created_at,
                    JSON_ARRAYAGG(JSON_OBJECT('id', pi.id, 'image_path', pi.image_path)) AS images
                FROM
                    products p
                LEFT JOIN
                    product_images pi ON p.id = pi.product_id
                WHERE
                    p.id = ?
                GROUP BY
                    p.id`;

    try {
        const results = await new Promise((resolve, reject) => {
            Products.query(sql, [productDetail], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Product create on post
exports.product_create_post = [
    upload.array('images', 10),

    asyncHandler(async (req, res, next) => {
        try {
            // Extract product details from request body
            const { name, description, price } = req.body;
            const images = req.files.map(file => file.filename);

            // Insert product details into the 'products' table
            const productSql = `INSERT INTO products (name, description, price, created_at) VALUES (?, ?, ?, NOW())`;
            const result = await queryAsync(productSql, [name, description, price]);
            const productId = result.insertId;

            // Insert image paths into the 'product_images' table
            const imageSql = `INSERT INTO product_images (product_id, image_path) VALUES ?`;
            const imageValues = images.map(image => [productId, image]);
            await queryAsync(imageSql, [imageValues]);

            // Return success response
            res.status(201).json({
                message: 'Product created successfully with images!'
            });

        } catch (err) {
            // Handle errors properly
            console.error('Error:', err);
            res.status(500).json({
                error: 'An error occurred while creating the product'
            });
        }

})]; 


// Product delete on post

exports.product_delete_post = asyncHandler(async (req, res, next) => {
    const productDetail = req.params.id;
    
    try {
        const productDeatil = await new Promise((resolve, reject) => {
            Products.query(`SELECT * FROM products WHERE id=?`, [productDetail], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!productDeatil) {
            return res.status(404).json("No product found");
        }

        const imagesPath = await new Promise((resolve, reject) => {
            Products.query(`SELECT image_path FROM product_images WHERE product_id = ?`, [productDetail], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!imagesPath || imagesPath.length === 0) {
            console.log("No images associated with this product.");
        } else {
            // Delete images asynchronously
            await Promise.all(imagesPath.map(async (image) => {
                const imagePath = path.join(__dirname, 'images', image.image_path);
                console.log(`Attempting to delete image at: ${imagePath}`);
                try {
                    await fsPromises.unlink(imagePath);
                    console.log(`Deleted image: ${imagePath}`);
                } catch (err) {
                    console.error(`Failed to delete image: ${imagePath}`, err);
                }
            }));
        }

        // Deleting product and its images from the database
        let sql = `DELETE products, product_images
                   FROM products
                   LEFT JOIN product_images ON products.id = product_images.product_id
                   WHERE products.id = ?`;
        
        await new Promise((resolve, reject) => {
            Products.query(sql, [productDetail], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        res.status(200).json('Successfully deleted both product and images');
    } catch(err) {
        next(err);
    }
});


// Logic to delete a specific image associated with a product
exports.product_image_delete_post = asyncHandler(async (req, res, next) => {
    const productId = req.params.id;   // Product ID
    const imageId = req.params.imageId;  // Image ID (or path) from request body (assuming you're sending it in the request body)

    try {
        // 1. Fetch the image path from the `product_images` table based on product ID and image ID
        const imageDetail = await new Promise((resolve, reject) => {
            Products.query(
                `SELECT image_path FROM product_images WHERE product_id = ? AND id = ?`,
                [productId, imageId],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        if (!imageDetail || imageDetail.length === 0) {
            console.log(`No image found with id ${imageId} for product ${productId}`);
            return res.status(404).json("Image not found or not associated with this product");
        }

        const imagePath = imageDetail[0].image_path;

        // 2. Delete the image from the filesystem
        const fullPath = path.join(__dirname, 'images', imagePath);
        console.log(`Attempting to delete image at: ${fullPath}`);

        try {
            await fsPromises.unlink(fullPath);
            console.log(`Deleted image: ${fullPath}`);
        } catch (err) {
            console.error(`Failed to delete image: ${fullPath}`, err);
            return res.status(500).json('Failed to delete image from the filesystem');
        }

        // 3. Delete the image record from the `product_images` table
        await new Promise((resolve, reject) => {
            Products.query(
                `DELETE FROM product_images WHERE product_id = ? AND id = ?`,
                [productId, imageId],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        res.status(200).json('Successfully deleted image from product');
    } catch (err) {
        next(err);
    }
});


// Product update on post
exports.product_update_post = [ upload.array('images', 10)
    ,asyncHandler(async (req, res, next) => {
    let productId = req.params.id;

    try {
        const { name, description, price} = req.body;
        const images = req.files ? req.files.map(file => file.filename) : [];

        const productSql = `UPDATE products SET name=?, description=?, price=?, created_at=NOW() WHERE id= ?`
        await queryAsync(productSql, [name, description, price, productId]);

        if (images.length > 0) {
            for (const [index, image] of images.entries()) {
                const imageSql = `INSERT INTO product_images (product_id, image_path)
                                    VALUES (?, ?)
                                    ON DUPLICATE KEY UPDATE image_path = ?`;

                await queryAsync(imageSql, [productId, image, image]);
            }
        }

        res.status(200).json({
            message: 'Product successfully updated'
        })
        console.log(upload)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            err: 'An error occur while updating the product'
        })
    }
    
    
})]; 
const Products = require('../models/products');
const asyncHandler = require("express-async-handler");
const multer = require('multer');
const cloudinary = require('../firebase');

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       const uploadPath = path.join(__dirname, 'images');
//       if (!fs.existsSync(uploadPath)) {
//         fs.mkdirSync(uploadPath, { recursive: true });  // Ensure the directory exists
//       }
//       cb(null, uploadPath);
//     },
//     filename: (req, file, cb) => {
//       const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');  // Sanitize filenames
//       cb(null, Date.now() + '-' + sanitizedFilename);  // Use sanitized filename
//     }
//   });
  
//   const upload = multer({ storage: storage });
  const upload = multer ({
    storage: multer.memoryStorage()
  });

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
const cloudinaryUrl = (publicId) => {
    return `https://res.cloudinary.com/${process.env.CLOUD_NAME}/image/upload/${publicId}`; // Replace `your-cloud-name` with your Cloudinary cloud name.
};

exports.product_list = asyncHandler(async (req, res, next) => {
    let sql = `
        SELECT 
            p.id AS product_id,
            p.name,
            p.description,
            p.price,
            p.created_at,
            pi.id AS image_id,
            pi.image_path,
            pi.public_id
        FROM
            products p
        LEFT JOIN
            product_images pi ON p.id = pi.product_id
    `;

    try {
        const results = await new Promise((resolve, reject) => {
            Products.query(sql, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // Group the results by product_id and create the list of images with secure URLs
        const formattedResults = results.reduce((acc, product) => {
            // Find the product in the accumulator array
            let productIndex = acc.findIndex(p => p.product_id === product.product_id);

            if (productIndex === -1) {
                // If product doesn't exist in accumulator, create it
                acc.push({
                    product_id: product.product_id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    created_at: product.created_at,
                    images: [{
                        image_id: product.image_id,
                        image_path: product.image_path,
                        public_id: product.public_id,
                        secure_url: cloudinaryUrl(product.public_id) // Convert public_id to Cloudinary secure URL
                    }]
                });
            } else {
                // If product exists, add the image to the images array
                acc[productIndex].images.push({
                    image_id: product.image_id,
                    image_path: product.image_path,
                    public_id: product.public_id,
                    secure_url: cloudinaryUrl(product.public_id) // Convert public_id to Cloudinary secure URL
                });
            }

            return acc;
        }, []);

        // Return the formatted result with images
        res.json(formattedResults);

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
        
            // Insert product details into the 'products' table
            const productSql = `INSERT INTO products (name, description, price, created_at) VALUES (?, ?, ?, NOW())`;
            const result = await queryAsync(productSql, [name, description, price]);
            const productId = result.insertId;

            const uploadImages = (file) => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'productImage' },
                        (error, uploadResult) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(uploadResult);
                            }
                        }
                    ).end(file.buffer);
                });
            };

            // Iterate over all uploaded files and await each image upload
            const uploadResults = [];
            for (const file of req.files) {
                const uploadResult = await uploadImages(file);
                uploadResults.push({
                    secure_url: uploadResult.secure_url,
                    public_id: uploadResult.public_id,
                });
            }

            if (uploadResults.length > 0) {
                // Insert image paths into the 'product_images' table
                const imageSql = `INSERT INTO product_images (product_id, image_path, public_id) VALUES ?`;
                const imageValues = uploadResults.map(image => [productId, image.secure_url, image.public_id]);
                await queryAsync(imageSql, [imageValues]);
            } else {
                return res.status(400).json({ error: 'No images uploaded' });
            }

            // Return success response
            res.status(201).json({
                message: 'Product created successfully with images!',
                productId,
                images: uploadResults,
            });

        } catch (err) {
            // Handle errors properly
            console.error('Error:', err);
            res.status(500).json({
                error: 'An error occurred while creating the product',
                details: err.message,  // Add more info for debugging
            });
        }
    })
];


// Product delete on post

exports.product_delete_post = asyncHandler(async (req, res, next) => {
    const productId = req.params.id; // Renamed variable for consistency

    try {
        // 1. Fetch product details
        const productDetail = await new Promise((resolve, reject) => {
            Products.query(`SELECT * FROM products WHERE id=?`, [productId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!productDetail || productDetail.length === 0) {
            return res.status(404).json("No product found");
        }

        // 2. Fetch associated image paths from the database
        const imagesPath = await new Promise((resolve, reject) => {
            Products.query(`SELECT image_path, public_id FROM product_images WHERE product_id = ?`, [productId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!imagesPath || imagesPath.length === 0) {
            console.log("No images associated with this product.");
        } else {
            // 3. Delete images from Cloudinary
            const publicIds = imagesPath.map((image) => image.public_id);
            if (publicIds.length > 0) {
                try {
                    await cloudinary.api.delete_resources(publicIds); // Bulk delete images from Cloudinary
                    console.log(`Successfully deleted images with public_ids: ${publicIds}`);
                } catch (err) {
                    console.error("Error deleting images from Cloudinary:", err);
                    return res.status(500).json("Error deleting images from Cloudinary");
                }
            }
        }

        // 4. Delete product and its images from the database
        let sql = `DELETE p, pi
                   FROM products p
                   LEFT JOIN product_images pi ON p.id = pi.product_id
                   WHERE p.id = ?`;

        await new Promise((resolve, reject) => {
            Products.query(sql, [productId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        res.status(200).json('Successfully deleted both product and images');
    } catch (err) {
        next(err);
    }
});


// Logic to delete a specific image associated with a product
exports.product_image_delete_post = asyncHandler(async (req, res, next) => {
    const productId = req.params.id;   // Product ID
    const imageId = req.params.imageId;  // Image ID (or path) from request body (assuming you're sending it in the request body)

    try {
        // 1. Fetch the image details from the `product_images` table
        const imageDetail = await new Promise((resolve, reject) => {
            Products.query(
                `SELECT * FROM product_images WHERE product_id = ? AND id = ?`,
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

        // Get the Cloudinary public_id for deletion
        const { public_id } = imageDetail[0];  // Assuming `public_id` is stored in your DB for each image

        // 2. Delete the image from Cloudinary using the public_id
        try {
            const result = await cloudinary.api.delete_resources([public_id]); // Cloudinary requires an array of public_ids
            console.log(`Deleted image from Cloudinary: ${result}`);
        } catch (err) {
            console.error(`Failed to delete image from Cloudinary: ${err.message}`);
            return res.status(500).json('Failed to delete image from Cloudinary');
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
        console.error('Error during image deletion:', err);
        next(err);  // Pass to error handling middleware
    }
});


// Product update on post
// exports.product_update_post = [
//     upload.array('images', 10),  // Allows up to 10 images to be uploaded
//     asyncHandler(async (req, res, next) => {
//         let productId = req.params.id;  // Extract the product ID from the URL params

//         try {
//             // Extract product details from the request body
//             const { name, description, price } = req.body;
//             const images = req.files ? req.files : [];  // `req.files` will contain the uploaded files (images)

//             // 1. Update product details in the products table
//             const productSql = `UPDATE products SET name=?, description=?, price=?, created_at=NOW() WHERE id= ?`;
//             await queryAsync(productSql, [name, description, price, productId]);

//             // 2. Upload images to Cloudinary and store their URLs in the database
//             if (images.length > 0) {
//                 // Loop through each image and upload it to Cloudinary
//                 const uploadResults = [];  // To store the Cloudinary upload responses

//                 for (const image of images) {
//                     const cloudinaryResponse = await cloudinary.uploader.upload(image.path || image.buffer, {
//                         folder: 'productImage',  // Optionally specify a folder in Cloudinary
//                     });

//                     // Store the secure URL and public ID for the uploaded image
//                     uploadResults.push({
//                         secure_url: cloudinaryResponse.secure_url,
//                         public_id: cloudinaryResponse.public_id
//                     });
//                 }

//                 // 3. Insert image details into the product_images table
//                 for (const image of uploadResults) {
//                     const imageSql = `INSERT INTO product_images (product_id, image_path, public_id)
//                                       VALUES (?, ?, ?)`;  // Only insert new image
//                     await queryAsync(imageSql, [productId, image.secure_url, image.public_id]);
//                 }
//             }

//             // Return success response
//             res.status(200).json({
//                 message: 'Product successfully updated with new images',
//             });

//         } catch (err) {
//             console.error('Error updating product:', err);
//             res.status(500).json({
//                 error: 'An error occurred while updating the product',
//                 details: err.message,
//             });
//         }
//     })
// ];
exports.product_update_post = [
    upload.array('images', 10), // Allows up to 10 images
    asyncHandler(async (req, res, next) => {
        const productId = req.params.id;

        try {
            const { name, description, price } = req.body;
            const images = req.files || [];

            // 1. Update product details
            const productSql = `
                UPDATE products 
                SET name = ?, description = ?, price = ?, created_at = NOW() 
                WHERE id = ?`;
            await queryAsync(productSql, [name, description, price, productId]);

            // Cloudinary upload function (same as in product_create_post)
            const uploadImages = (file) => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'productImage' },
                        (error, uploadResult) => {
                            if (error) reject(error);
                            else resolve(uploadResult);
                        }
                    ).end(file.buffer);
                });
            };

            // 2. If images were uploaded, handle them
            if (images.length > 0) {
                const uploadResults = [];
                for (const file of images) {
                    const uploadResult = await uploadImages(file);
                    uploadResults.push({
                        secure_url: uploadResult.secure_url,
                        public_id: uploadResult.public_id
                    });
                }

                // 3. Save image info in DB
                const imageSql = `
                    INSERT INTO product_images (product_id, image_path, public_id)
                    VALUES ?`;
                const imageValues = uploadResults.map(img => [productId, img.secure_url, img.public_id]);
                await queryAsync(imageSql, [imageValues]);
            }

            res.status(200).json({
                message: 'Product successfully updated',
            });

        } catch (err) {
            console.error('Error updating product:', err);
            res.status(500).json({
                error: 'An error occurred while updating the product',
                details: err.message,
            });
        }
    })
];

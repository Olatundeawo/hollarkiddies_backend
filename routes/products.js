const express = require('express');
const router = express.Router();

const product_controller = require("../controllers/products");
const user_controller = require("../controllers/users");
const authenticateUser = require("../controllers/auth");



// router create product post
router.post("/product/create", authenticateUser, product_controller.product_create_post);


// router delete product post
router.delete("/product/:id/delete",authenticateUser, product_controller.product_delete_post);

// Route to delete particular image
router.delete("/product/:id/image/:imageId", authenticateUser, product_controller.product_image_delete_post);


// router update product post
router.put("/product/:id/update", authenticateUser, product_controller.product_update_post);



// router to get all products
router.get("/products", product_controller.product_list);


// router to get a particular product
router.get("/product/:id", product_controller.product_detail);

// For index page
router.get('/',product_controller.index);

//  ROUTE FOR USER

// Get all users
router.get('/users',user_controller.users_list);

// Loggin
router.post('/user/login', user_controller.user_login)

// Logout
router.post('/user/logout', user_controller.user_logout)

// Create user
router.post('/user/create', user_controller.user_create);

// Update a particular user
router.put("/user/:id/update", user_controller.user_update);

// Delete a particulat user
router.delete("/user/:id/delete", user_controller.user_delete);


module.exports = router;
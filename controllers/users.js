const Users = require('../models/products');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const blacklist = new Set()


exports.users_list = asyncHandler( async(req, res, next) => {
    try {
        let userSql = ` SELECT * FROM users`
        const result = await new Promise((resolve, reject) => {
            Users.query(userSql, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            })
        });

        if(result.length === 0) {
            return res.status(404).json('Not user found')
        }
        res.json(result);
    } catch(err) {
        next(err)
    }
});

exports.user_create = asyncHandler( async(req, res, next) => {
    const {email, password} = req.body

    let userSql = `INSERT INTO users ( email, password, created_at) VALUES(?, ?, NOW())`
    try {
        //  Check user
        const checkUser = `SELECT * FROM users WHERE email=?`
        const existingUser = await new Promise((resolve, reject) => {
            Users.query(checkUser,[email], (err, result) => {
                if (err) {
                    reject(err)
                }
                resolve(result);
            })
        })

        if (existingUser.length > 0) {
            return res.status(400).json({ message:'User already exist with this email'})
        }


        const salt = await bcrypt.genSalt(10); // gen a salt with 10 round
        const hashedPassword = await bcrypt.hash(password, salt); // hash the password
        await new Promise((resolve, reject) => {
            Users.query(userSql,[email, hashedPassword], (err, result) => {
                if (err){
                    reject(err)
                } else {
                    resolve(result)
                }
            });
        })
        res.status(201).json("User succesffuly added")
    } catch(err) {
        res.status(500).json('Failed to add user',err.message)
    }
});

exports.user_update = asyncHandler( async(req, res, next) => {
    let userId = req.params.id;
    const { email, password } = req.body;

    try {
        let updateUser = `UPDATE users SET email=?, password=?, created_at=NOW() WHERE id=?`;
        let salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await new Promise((resolve, reject) => {
            Users.query(updateUser,[email, hashedPassword, userId], (err, result) => {
                if (err) {
                    reject(err)
                }
                resolve(result);
            })
        });

        // Generate token
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
         });
        res.status(200).json('User successfully updated', token);
    } catch(err) {
        res.status(500).json(`Error updating user, ${err.message}`)
    }

})

exports.user_delete = asyncHandler(async(req, res, next) => {
    let userId = req.params.id;

    try {
        const userCheck = `SELECT * FROM users WHERE id=?`;
        const nowCheck = await new Promise((resolve, reject) => {
            Users.query(userCheck,[userId], (err, result) => {
                if (err) {
                    reject(err)
                }
                resolve(result)
            })
        });

        if (nowCheck.length === 0) {
            return res.status(404).json('No user with this record')
        }

        const userDelete = `DELETE FROM users WHERE id=?`;
        await new Promise((resolve,reject) => {
            Users.query(userDelete,[userId], (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            })
        });

        res.status(200).json('User succesfully deleted')

    } catch(err) {
        next(err);
    }
});

exports.user_login = asyncHandler( async(req, res, next) => {
    const { email, password } = req.body;

    let sql =  `SELECT * FROM users WHERE email = ?`;

    try {
        let user = await new Promise((resolve, reject) => {
            Users.query(sql, [email], (err, result) => {
                if (err) {
                    reject(err);
                }
                if (result.length === 0) {
                    return resolve(null);
                }
                resolve(result[0]);
            })
        });

        if (!user) {
            return res.status(400).json({ message: 'No user found with this email'});
        }

        let pass = await bcrypt.compare(password, user.password);

        if (!pass) {
            return res.status(400).json({ message: 'Password not match'})
        }

        // Generate token
         const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
         });

        res.status(200).json({ message: "succesfully logged in", token})
    } catch(err) {
        next(err)
    }
    
});


exports.user_logout = asyncHandler(async(req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided'});
    }
    blacklist.add(token);
    res.status(201).json({ message: 'Logged out successfuly'});
})
const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.replace('Bearer ', '').trim();

    if (!token) {
        console.log('Token is missing');
        return res.status(401).json({ message: 'Access denied - no token' });
    }

    try {
        // Add logging for debugging
        console.log('Received token:', token);
        console.log('JWT_SECRET:', process.env.JWT_SECRET);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded payload:', decoded);
        req.user = decoded;
        next();
    } catch (err) {
        console.log('Token verification failed:', err.message);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticateUser;

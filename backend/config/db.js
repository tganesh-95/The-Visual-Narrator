const mongoose = require('mongoose');

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/visualnarrater';
    try {
        console.log('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(primaryUri, {
            serverSelectionTimeoutMS: 5000,
            family: 4
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB primary connection error: ${error.message}`);
        // If remote Atlas failed, fallback to local MongoDB
        if (!primaryUri.includes('127.0.0.1') && !primaryUri.includes('localhost')) {
            console.log('Falling back to local MongoDB: mongodb://127.0.0.1:27017/visualnarrater');
            try {
                const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/visualnarrater', {
                    serverSelectionTimeoutMS: 5000,
                    family: 4
                });
                console.log(`Connected to local MongoDB fallback: ${localConn.connection.host}`);
                return;
            } catch (fallbackError) {
                console.error(`Local MongoDB fallback error: ${fallbackError.message}`);
            }
        }
        process.exit(1);
    }
};

module.exports = connectDB;

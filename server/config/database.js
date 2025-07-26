const mongoose = require('mongoose');
require('dotenv').config();

class Database {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('📊 Database already connected');
        return;
      }

      const mongoURI = process.env.MONGODB_URI;
      
      if (!mongoURI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      // Connection options
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      };

      await mongoose.connect(mongoURI, options);
      
      this.isConnected = true;
      console.log('✅ MongoDB Atlas connected successfully');
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('authentication failed')) {
        console.error('💡 Check your MongoDB username and password in MONGODB_URI');
      } else if (error.message.includes('network')) {
        console.error('💡 Check your network connection and MongoDB Atlas IP whitelist');
      } else if (error.message.includes('MONGODB_URI')) {
        console.error('💡 Add MONGODB_URI to your .env file');
      }
      
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('👋 MongoDB disconnected gracefully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Ping the database
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        ping: result,
        collections: Object.keys(mongoose.connection.collections)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;

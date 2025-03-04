import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mpesaRoutes from './routes/mpesa.js';

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'https://UniHive.shop',  // Production frontend
'https://unihive.store',
  'http://localhost:5173',   
    // Local development frontend
  process.env.FRONTEND_URL       // Environment variable if set
].filter(Boolean); // Remove any undefined/null values

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Welcome page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Qshop API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .status {
            color: #4CAF50;
            font-weight: bold;
          }
          .endpoints {
            margin-top: 20px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🛍️ Qshop API</h1>
          <p>Server Status: <span class="status">ONLINE</span></p>
          <div class="endpoints">
            <h3>Available Endpoints:</h3>
            <ul>
              <li>/api/health - Server health check</li>
              <li>/api/mpesa/* - M-Pesa payment endpoints</li>
            </ul>
          </div>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>Server Time: ${new Date().toLocaleString()}</p>
          <p>Allowed Origins: ${allowedOrigins.join(', ')}</p>
        </div>
      </body>
    </html>
  `);
});

// Routes
app.use('/api/mpesa', mpesaRoutes);

// Add pre-flight CORS handling for the mpesa endpoints
app.options('/api/mpesa/*', cors());

// Basic route for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins for CORS: ${allowedOrigins.join(', ')}`);
});
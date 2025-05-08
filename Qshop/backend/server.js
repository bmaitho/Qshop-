// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mpesaRoutes from './routes/mpesa.js';
import emailRoutes from './routes/email.js';

dotenv.config();

const app = express();

// Environment variable for allowed origins (comma-separated)
const allowedOriginsString = process.env.ALLOWED_ORIGINS || 'https://unihive.shop,https://unihive.store,http://localhost:5173';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

// Normalize the origins within the cors options.
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true); // Allow requests with no origin (e.g., curl)
        }

        const normalizedOrigin = origin.replace(/\/$/, ''); // Remove trailing slash

        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.error(`CORS blocked origin: ${origin}`);
            callback(new Error(`CORS policy violation. Origin: ${origin} is not allowed.`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false // Only set to true if cookies are used.
};

app.use(cors(corsOptions));
app.use(express.json());

// Welcome route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Qshop API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f5f5f5;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #e7c65f;
            padding-bottom: 10px;
          }
          .status {
            color: #27ae60;
            font-weight: bold;
          }
          .endpoints {
            background-color: #fff;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
          }
          .endpoints h3 {
            margin-top: 0;
            color: #2c3e50;
          }
          ul {
            list-style-type: none;
            padding-left: 0;
          }
          li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          li:last-child {
            border-bottom: none;
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
              <li>/api/email/* - Email service endpoints</li>
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

// API routes
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/email', emailRoutes);

// Apply CORS options to preflight requests
app.options('/api/mpesa/*', cors(corsOptions));
app.options('/api/email/*', cors(corsOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    services: {
      mpesa: 'available',
      email: 'available'
    },
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins for CORS: ${allowedOrigins.join(', ')}`);
  console.log(`Email service initialized: ${Boolean(process.env.RESEND_API_KEY) ? 'YES' : 'NO - Missing API Key'}`);
});
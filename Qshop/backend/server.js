import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mpesaRoutes from './routes/mpesa.js';

dotenv.config();

const app = express();

// Environment variable for allowed origins (comma-separated)
const allowedOriginsString = process.env.ALLOWED_ORIGINS || 'https://UniHive.shop,https://unihive.store,http://localhost:5173';
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
          // ... (your existing styles)
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

app.use('/api/mpesa', mpesaRoutes);
app.options('/api/mpesa/*', cors(corsOptions)); // Apply cors options to preflight requests.

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins for CORS: ${allowedOrigins.join(', ')}`);
});
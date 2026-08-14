import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { env, isProduction } from './config/env';

export const app = express();

/*
 * CORS is wide open by default during development. The app is served from Expo
 * Go on a phone, so there is no fixed origin to allow-list. CORS_ORIGIN can be
 * narrowed later without touching this file.
 */
app.use(
  cors({
    origin:
      env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

app.use('/api', routes);

// Order matters. The 404 handler must come after every route, and the error
// handler must be the very last thing mounted.
app.use(notFoundHandler);
app.use(errorHandler);

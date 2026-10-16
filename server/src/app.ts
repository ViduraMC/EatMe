import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { env, isProduction } from './config/env';

export const app = express();

app.disable('x-powered-by');

// In production the API sits behind Google Cloud Run's HTTPS front end. Trusting
// exactly that many hops makes req.ip the phone's address, which the rate
// limiter keys on. Too few and every user shares one limit; too many and a
// client can fake its address with X-Forwarded-For.
if (isProduction) app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Security headers. This is a JSON API used by a native app, so nothing it
// returns should ever be framed, sniffed or run as a page.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/*
 * CORS only matters to browsers; the Android app does not send an Origin. In
 * development it stays open for Expo web. In production "*" means no browser
 * origin is allowed at all, and a real list can still be set in CORS_ORIGIN.
 */
app.use(
  cors({
    origin:
      env.CORS_ORIGIN === '*'
        ? !isProduction
        : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
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

declare module './routes/auth';
declare module './routes/article';
declare module './routes/request';
declare module './routes/report';
declare module './routes/proxy';
declare module './middlewares/sanitize' {
  import { RequestHandler } from 'express';
  const sanitize: RequestHandler;
  export default sanitize;
}
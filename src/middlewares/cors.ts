import cors from 'cors';
import env from '../config/env';

const corsOptions = {
  origin: env.CLIENT_ORIGIN || '*',
  credentials: true,
};

export default cors(corsOptions);
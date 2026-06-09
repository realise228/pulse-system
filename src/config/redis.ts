import Redis from 'ioredis';
import { config } from './index';
const redis = new Redis(config.redis.url, { maxRetriesPerRequest: 3 });
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));
export default redis;

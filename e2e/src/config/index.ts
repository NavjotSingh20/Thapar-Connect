export interface Config {
  BASE_URL: string;
  WS_URL: string;
  DEFAULT_TIMEOUT: number;
  REQUEST_TIMEOUT: number;
  WS_TIMEOUT: number;
  ENV: string;
}

export const CONFIG: Config = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080/api/v1',
  WS_URL: process.env.WS_URL || 'ws://localhost:8080/ws',
  DEFAULT_TIMEOUT: Number(process.env.TEST_TIMEOUT) || 15000,
  REQUEST_TIMEOUT: Number(process.env.REQUEST_TIMEOUT) || 10000,
  WS_TIMEOUT: Number(process.env.WS_TIMEOUT) || 8000,
  ENV: process.env.NODE_ENV || 'test',
};

export default CONFIG;

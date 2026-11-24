import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import FormData from 'form-data';
import { CONFIG } from '../config/index';

export interface CookieJar {
  [name: string]: string;
}

export class ApiClient {
  private instance: AxiosInstance;
  private authToken: string | null = null;
  private cookies: CookieJar = {};

  constructor(baseURL: string = CONFIG.BASE_URL, token: string | null = null) {
    this.authToken = token;
    this.instance = axios.create({
      baseURL,
      timeout: CONFIG.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Do not reject automatically so tests can inspect status codes when desired
      // Or default to standard axios behavior unless validateStatus is overridden.
      // Standard axios behavior is good, with enhanced error messages.
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Inject Authorization header if present
        if (this.authToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Inject Cookies if present
        const cookieHeader = this.getCookieHeader();
        if (cookieHeader && !config.headers.Cookie) {
          config.headers.Cookie = cookieHeader;
        }

        // Inject dynamic X-Forwarded-For header to prevent rate limit collisions across test runs
        if (!config.headers['X-Forwarded-For']) {
          config.headers['X-Forwarded-For'] = `10.0.0.${Math.floor(Math.random() * 250) + 1}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.extractCookies(response);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          this.extractCookies(error.response);
          // Enhance error message with server response details
          const responseData = typeof error.response.data === 'object'
            ? JSON.stringify(error.response.data)
            : String(error.response.data);
          const enhancedMsg = `${error.config?.method?.toUpperCase()} ${error.config?.url} failed with status ${error.response.status}: ${responseData}`;
          error.message = enhancedMsg;
        }
        return Promise.reject(error);
      }
    );
  }

  private extractCookies(response: AxiosResponse): void {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const headerList = Array.isArray(setCookieHeaders)
        ? setCookieHeaders
        : [setCookieHeaders];

      for (const raw of headerList) {
        const parts = raw.split(';')[0].trim();
        const eqIdx = parts.indexOf('=');
        if (eqIdx > 0) {
          const key = parts.substring(0, eqIdx).trim();
          const val = parts.substring(eqIdx + 1).trim();
          this.cookies[key] = val;
        }
      }
    }
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public setCookie(name: string, value: string): void {
    this.cookies[name] = value;
  }

  public getCookie(name: string): string | undefined {
    return this.cookies[name];
  }

  public getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  public clearCookies(): void {
    this.cookies = {};
  }

  public getRawCookies(): CookieJar {
    return { ...this.cookies };
  }

  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  public async uploadMultipart<T = any>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const headers = {
      ...formData.getHeaders(),
      ...(config?.headers || {}),
    };

    return this.instance.post<T>(url, formData, {
      ...config,
      headers,
    });
  }

  public async request<T = any>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.request<T>(config);
  }

  public getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

export function createApiClient(
  token?: string | null,
  baseURL: string = CONFIG.BASE_URL
): ApiClient {
  return new ApiClient(baseURL, token || null);
}

export const defaultApiClient = createApiClient();
export default ApiClient;

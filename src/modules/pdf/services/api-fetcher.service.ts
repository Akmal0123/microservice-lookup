import axios, { AxiosRequestConfig } from 'axios';

export interface ApiFetchOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  token?: string;
  params?: Record<string, any>;
  body?: any;
  timeoutMs?: number;
}

export class ApiFetcherService {
  /**
   * Fetch dynamic JSON transaction data from an external or internal API
   * Implements PRD Section 5.1 (Modul Integrasi API / Data Fetcher)
   */
  public static async fetchData(options: ApiFetchOptions): Promise<any> {
    const {
      url,
      method = 'GET',
      headers = {},
      token,
      params,
      body,
      timeoutMs = 8000,
    } = options;

    if (!url) {
      throw new Error('API Data Fetcher Error: URL sumber data tidak boleh kosong');
    }

    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      reqHeaders.Authorization = cleanToken;
    }

    const config: AxiosRequestConfig = {
      url,
      method,
      headers: reqHeaders,
      params,
      data: body,
      timeout: timeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
    };

    try {
      const response = await axios(config);
      const data = response.data;

      // Extract transaction payload if wrapped in standard { data: ... } or return directly
      if (data && typeof data === 'object') {
        if ('data' in data && data.data !== null && typeof data.data === 'object') {
          return data.data;
        }
        return data;
      }

      throw new Error('Format respon API bukan objek JSON yang valid');
    } catch (err: any) {
      if (err.response) {
        throw new Error(
          `Gagal mengambil data dari API (${err.response.status} ${err.response.statusText}): ${
            typeof err.response.data === 'string'
              ? err.response.data
              : JSON.stringify(err.response.data)
          }`
        );
      } else if (err.code === 'ECONNABORTED') {
        throw new Error(`Timeout saat memanggil API sumber data (${timeoutMs}ms)`);
      }
      throw new Error(`Koneksi ke API sumber data gagal: ${err.message}`);
    }
  }
}

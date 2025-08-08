import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import type { ApiResponse } from '@/types'

// URL exacta que funciona en los tests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/api'

console.log('🌐 API Base URL:', API_BASE_URL)

// Configuración exacta que funciona según los tests
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'ProduccionesSaavedra/1.0',
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Importante para ngrok
})

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Headers que funcionaron en los tests
    config.headers['Accept'] = 'application/json'
    config.headers['ngrok-skip-browser-warning'] = 'true'
    config.headers['User-Agent'] = 'ProduccionesSaavedra/1.0'
    
    // Solo agregar Content-Type para POST/PUT
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      config.headers['Content-Type'] = 'application/json'
    }
    
    // Timestamp para evitar cache
    config.params = {
      ...config.params,
      _t: Date.now(),
    }
    
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`)
    
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Interceptor para responses
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
    
    // Verificar que no sea HTML
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE')) {
      console.error('❌ Received HTML instead of JSON!')
      throw new Error('Received HTML page instead of JSON API response')
    }
    
    return response
  },
  (error: AxiosError) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`)
    
    // No mostrar toast para 404 de eventos (lista vacía es normal)
    if (error.response?.status === 404 && error.config?.url?.includes('/events')) {
      return Promise.reject(error)
    }
    
    // Manejo de errores con toasts - TIPADO SEGURO
    if (error.response) {
      const { status } = error.response
      const data = error.response.data as any // Tipo seguro
      
      switch (status) {
        case 400:
          toast.error(data?.message || 'Solicitud inválida')
          break
        case 401:
          toast.error('No autorizado')
          break
        case 403:
          toast.error('Acceso denegado')
          break
        case 404:
          // Solo mostrar para rutas específicas, no para listas vacías
          if (!error.config?.url?.includes('/events')) {
            toast.error('Recurso no encontrado')
          }
          break
        case 409:
          // No mostrar toast para conflictos
          break
        case 422:
          // TIPADO SEGURO PARA ERRORES
          if (data && typeof data === 'object' && Array.isArray(data.errors)) {
            data.errors.forEach((err: any) => {
              if (err && typeof err === 'object' && err.field && err.message) {
                toast.error(`${err.field}: ${err.message}`)
              }
            })
          } else if (data && typeof data === 'object' && data.message) {
            toast.error(data.message)
          } else {
            toast.error('Error de validación')
          }
          break
        case 500:
          toast.error('Error interno del servidor')
          break
        default:
          if (status >= 400) {
            const message = (data && typeof data === 'object' && data.message) ? data.message : `Error ${status}`
            toast.error(message)
          }
      }
    } else if (error.request) {
      toast.error('Error de conexión. Verifica que ngrok esté activo.')
    } else {
      toast.error('Error de configuración')
    }
    
    return Promise.reject(error)
  }
)

// Funciones helper simplificadas
export const createApiRequest = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    return api.get<ApiResponse<T>>(endpoint, { params })
  },
  
  post: <T>(endpoint: string, data?: any) => {
    return api.post<ApiResponse<T>>(endpoint, data)
  },
  
  put: <T>(endpoint: string, data?: any) => {
    return api.put<ApiResponse<T>>(endpoint, data)
  },
  
  patch: <T>(endpoint: string, data?: any) => {
    return api.patch<ApiResponse<T>>(endpoint, data)
  },
  
  delete: <T>(endpoint: string) => {
    return api.delete<ApiResponse<T>>(endpoint)
  },
}

// Utilidades
export const apiUtils = {
  extractData: <T>(response: AxiosResponse<ApiResponse<T>>): T => {
    return response.data.data as T
  },
  
  extractPagination: (response: AxiosResponse<ApiResponse>) => {
    return response.data.pagination
  },
  
  handleError: (error: any, defaultMessage = 'Ocurrió un error'): string => {
    // MANEJO SEGURO DE ERRORES
    if (error && typeof error === 'object') {
      if (error.response && typeof error.response === 'object') {
        const data = error.response.data
        if (data && typeof data === 'object' && data.message) {
          return String(data.message)
        }
      }
      if (error.message) {
        return String(error.message)
      }
    }
    return defaultMessage
  },
}

// Health check que sabemos que funciona
export const checkApiHealth = async () => {
  try {
    const startTime = Date.now()
    const response = await createApiRequest.get('/health')
    const latency = Date.now() - startTime
    
    return {
      online: true,
      status: response.data,
      latency,
      backendUrl: API_BASE_URL,
    }
  } catch (error) {
    return {
      online: false,
      error: apiUtils.handleError(error),
      latency: null,
      backendUrl: API_BASE_URL,
    }
  }
}

export default api
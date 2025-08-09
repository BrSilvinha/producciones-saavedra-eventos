import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import type { ApiResponse } from '@/types'

// URL base limpia para desarrollo local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

console.log('🌐 API Base URL:', API_BASE_URL)

// Configuración de axios LIMPIA
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Reducido a 15 segundos
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Interceptor para requests LIMPIO
api.interceptors.request.use(
  (config) => {
    // Headers básicos SOLAMENTE
    config.headers['Accept'] = 'application/json'
    
    // Solo para POST/PUT/PATCH
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      config.headers['Content-Type'] = 'application/json'
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
    return response
  },
  (error: AxiosError) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`)
    
    // Manejo de errores específico para CORS
    if (error.message?.includes('CORS') || error.message?.includes('blocked')) {
      toast.error('Error de CORS: Verifica que el backend esté corriendo en localhost:5000')
      return Promise.reject(error)
    }
    
    // Manejo de errores de red
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      toast.error('Error de red: Verifica que el servidor backend esté activo')
      return Promise.reject(error)
    }
    
    // Otros errores HTTP
    if (error.response) {
      const { status } = error.response
      const data = error.response.data as any
      
      switch (status) {
        case 400:
          toast.error(data?.message || 'Solicitud inválida')
          break
        case 404:
          if (!error.config?.url?.includes('/events')) {
            toast.error('Recurso no encontrado')
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
      toast.error('Sin respuesta del servidor. Verifica que esté activo en localhost:5000')
    } else {
      toast.error(`Error: ${error.message}`)
    }
    
    return Promise.reject(error)
  }
)

// Funciones helper
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

// Health check LIMPIO
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
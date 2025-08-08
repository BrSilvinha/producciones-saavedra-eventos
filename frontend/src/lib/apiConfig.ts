// frontend/src/lib/apiConfig.ts

// URL base de la API - ACTUALÍZALA CON TU URL ACTUAL DE NGROK
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://237af844b109.ngrok-free.app/api'

// Headers estándar que funcionan con ngrok
export const API_HEADERS = {
  'Accept': 'application/json',
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'ProduccionesSaavedra/1.0',
  'Cache-Control': 'no-cache'
}

// Función helper para hacer requests seguros
export const safeFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_HEADERS,
        ...options.headers
      }
    })
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`)
    
    const text = await response.text()
    
    // Verificar que no sea HTML
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<HTML')) {
      console.error('❌ Received HTML instead of JSON from:', url)
      throw new Error(`Server returned HTML page instead of JSON. URL: ${url}`)
    }
    
    // Verificar que no esté vacío
    if (!text.trim()) {
      throw new Error('Empty response from server')
    }
    
    // Parsear JSON
    try {
      const data = JSON.parse(text)
      return {
        ok: response.ok,
        status: response.status,
        data: data
      }
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError)
      console.error('❌ Response text:', text.substring(0, 500))
      throw new Error(`Invalid JSON response: ${parseError}`)
    }
    
  } catch (error) {
    console.error(`❌ API Error for ${url}:`, error)
    throw error
  }
}

// Funciones específicas para cada endpoint
export const apiEndpoints = {
  // Eventos
  getEvents: () => safeFetch('/events'),
  getEvent: (id: string) => safeFetch(`/events/${id}`),
  createEvent: (data: any) => safeFetch('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateEvent: (id: string, data: any) => safeFetch(`/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteEvent: (id: string) => safeFetch(`/events/${id}`, {
    method: 'DELETE'
  }),
  
  // Tipos de tickets
  getTicketTypes: (eventId: string) => safeFetch(`/ticket-types/event/${eventId}`),
  createTicketType: (data: any) => safeFetch('/ticket-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  // Tickets
  generateTickets: (data: any) => safeFetch('/tickets/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  bulkGenerateTickets: (data: any) => safeFetch('/tickets/bulk-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  // QR Validation
  validateQR: (data: any) => safeFetch('/qr/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  simulateQR: (data: any) => safeFetch('/qr/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  // Health check
  health: () => safeFetch('/health')
}

// Helper para manejar errores
export const handleApiError = (error: any): string => {
  if (error.message) {
    return error.message
  }
  return 'Error desconocido'
}
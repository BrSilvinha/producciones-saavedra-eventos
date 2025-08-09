import { createApiRequest, apiUtils } from '@/lib/api'
import type {
  Event,
  CreateEventDto,
  UpdateEventDto,
  EventFilters,
  EventDashboard,
  ApiResponse,
} from '@/types'

class EventService {
  private readonly basePath = '/events'

  // Obtener todos los eventos
  async getEvents(filters?: EventFilters) {
    // ✅ SIMPLIFICADO - sin getPaginationParams que no existe
    const params = {
      ...filters,
      // Paginación manual simple
      page: filters?.offset ? Math.floor(filters.offset / (filters.limit || 50)) + 1 : 1,
      limit: filters?.limit || 50
    }
    
    const response = await createApiRequest.get<Event[]>(this.basePath, params)
    return {
      events: apiUtils.extractData(response),
      pagination: apiUtils.extractPagination(response),
    }
  }

  // Obtener eventos activos
  async getActiveEvents() {
    const response = await createApiRequest.get<Event[]>(`${this.basePath}/active`)
    return apiUtils.extractData(response)
  }

  // Obtener un evento por ID
  async getEventById(id: string) {
    const response = await createApiRequest.get<Event>(`${this.basePath}/${id}`)
    return apiUtils.extractData(response)
  }

  // Obtener dashboard de un evento
  async getEventDashboard(id: string) {
    const response = await createApiRequest.get<EventDashboard>(`${this.basePath}/${id}/dashboard`)
    return apiUtils.extractData(response)
  }

  // Crear nuevo evento
  async createEvent(eventData: CreateEventDto) {
    const response = await createApiRequest.post<Event>(this.basePath, eventData)
    return apiUtils.extractData(response)
  }

  // Actualizar evento
  async updateEvent(id: string, eventData: UpdateEventDto) {
    const response = await createApiRequest.put<Event>(`${this.basePath}/${id}`, eventData)
    return apiUtils.extractData(response)
  }

  // Eliminar evento
  async deleteEvent(id: string) {
    const response = await createApiRequest.delete(`${this.basePath}/${id}`)
    return apiUtils.extractData(response)
  }

  // Cambiar estado del evento
  async changeEventStatus(id: string, status: 'draft' | 'active' | 'finished') {
    return this.updateEvent(id, { status })
  }

  // Validar datos del evento
  validateEventData(data: CreateEventDto | UpdateEventDto): string[] {
    const errors: string[] = []

    if ('name' in data) {
      if (!data.name?.trim()) {
        errors.push('El nombre del evento es obligatorio')
      } else if (data.name.length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres')
      } else if (data.name.length > 255) {
        errors.push('El nombre no puede exceder 255 caracteres')
      }
    }

    if ('date' in data && data.date) {
      const eventDate = new Date(data.date)
      if (isNaN(eventDate.getTime())) {
        errors.push('La fecha del evento no es válida')
      } else if (eventDate < new Date()) {
        errors.push('La fecha del evento no puede ser en el pasado')
      }
    }

    if ('description' in data && data.description && data.description.length > 2000) {
      errors.push('La descripción no puede exceder 2000 caracteres')
    }

    if ('location' in data && data.location && data.location.length > 255) {
      errors.push('La ubicación no puede exceder 255 caracteres')
    }

    return errors
  }

  // Formatear evento para mostrar
  formatEventForDisplay(event: Event) {
    return {
      ...event,
      formattedDate: new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(event.date)),
      shortDate: new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(event.date)),
      timeUntilEvent: this.getTimeUntilEvent(event.date),
      statusLabel: this.getStatusLabel(event.status),
      statusColor: this.getStatusColor(event.status),
    }
  }

  // Obtener tiempo restante hasta el evento
  private getTimeUntilEvent(eventDate: string): string {
    const now = new Date()
    const event = new Date(eventDate)
    const diff = event.getTime() - now.getTime()

    if (diff < 0) return 'Evento finalizado'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) {
      return `Faltan ${days} días`
    } else if (hours > 0) {
      return `Faltan ${hours} horas`
    } else {
      return 'Evento próximo'
    }
  }

  // Obtener etiqueta del estado
  private getStatusLabel(status: Event['status']): string {
    const labels = {
      draft: 'Borrador',
      active: 'Activo',
      finished: 'Finalizado',
    }
    return labels[status]
  }

  // Obtener color del estado
  private getStatusColor(status: Event['status']): string {
    const colors = {
      draft: 'gray',
      active: 'green',
      finished: 'blue',
    }
    return colors[status]
  }

  // Calcular estadísticas del evento
  calculateEventStats(event: Event) {
    const ticketStats = event.ticketStats || []
    const total = ticketStats.reduce((sum, stat) => sum + parseInt(stat.count.toString()), 0)
    const scanned = ticketStats.find(s => s.status === 'scanned')?.count || 0
    const generated = ticketStats.find(s => s.status === 'generated')?.count || 0
    const expired = ticketStats.find(s => s.status === 'expired')?.count || 0

    return {
      total,
      scanned: Number(scanned),
      generated: Number(generated),
      expired: Number(expired),
      scanRate: total > 0 ? Math.round((Number(scanned) / total) * 100) : 0,
      availableRate: total > 0 ? Math.round((Number(generated) / total) * 100) : 0,
    }
  }

  // Exportar eventos
  async exportEvents(filters?: EventFilters, format = 'csv') {
    const params = {
      ...filters,
      format,
      export: true,
    }
    
    const response = await createApiRequest.get(`${this.basePath}/export`, params)
    return response.data
  }
}

export const eventService = new EventService()
export default eventService
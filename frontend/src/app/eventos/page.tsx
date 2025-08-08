'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon,
  CalendarDaysIcon,
  MapPinIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UsersIcon,
  XMarkIcon,
  CheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Event {
  id: string
  name: string
  description?: string
  date: string
  location?: string
  status: 'draft' | 'active' | 'finished'
  created_at: string
  updated_at: string
  ticketStats?: Array<{ status: string; count: number }>
  totalTickets?: number
}

interface CreateEventForm {
  name: string
  description: string
  date: string
  location: string
  ticketTypes: Array<{
    name: string
    price: number
    quantity: number
  }>
}

type FilterType = 'all' | 'draft' | 'active' | 'finished'
type SortType = 'date' | 'name' | 'status' | 'created'

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('date')

  const [createForm, setCreateForm] = useState<CreateEventForm>({
    name: '',
    description: '',
    date: '',
    location: '',
    ticketTypes: [
      { name: 'General', price: 50, quantity: 100 },
      { name: 'VIP', price: 100, quantity: 50 }
    ]
  })

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [events, searchTerm, statusFilter, sortBy])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b20e100fb88b.ngrok-free.app/api'
      const response = await fetch(`${apiUrl}/events`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvents(data.data || [])
        } else {
          setError('Error al cargar eventos')
        }
      } else {
        setError(`Error ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
      console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...events]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date':
        default:
          return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
    })

    setFilteredEvents(filtered)
  }

  const createEvent = async () => {
    if (!createForm.name || !createForm.date) {
      alert('Nombre y fecha son obligatorios')
      return
    }

    try {
      setCreating(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b20e100fb88b.ngrok-free.app/api'
      
      const eventData = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        date: createForm.date,
        location: createForm.location.trim() || undefined,
        ticketTypes: createForm.ticketTypes
          .filter(tt => tt.name.trim() && tt.quantity > 0)
          .map(tt => ({
            name: tt.name.trim(),
            price: Math.max(0, tt.price),
            quantity: Math.max(1, tt.quantity)
          }))
      }

      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowCreateForm(false)
          resetForm()
          loadEvents()
          alert('✅ Evento creado exitosamente')
        } else {
          alert(`❌ Error: ${data.message}`)
        }
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.message || 'Error al crear evento'}`)
      }
    } catch (err) {
      alert('❌ Error de conexión al crear evento')
      console.error('Error creating event:', err)
    } finally {
      setCreating(false)
    }
  }

  const updateEventStatus = async (eventId: string, newStatus: 'draft' | 'active' | 'finished') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b20e100fb88b.ngrok-free.app/api'
      const response = await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          loadEvents()
          alert(`✅ Estado actualizado a: ${getStatusLabel(newStatus)}`)
        } else {
          alert(`❌ Error: ${data.message}`)
        }
      }
    } catch (err) {
      alert('❌ Error de conexión')
      console.error('Error updating status:', err)
    }
  }

  const deleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`¿Confirmas eliminar "${eventName}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b20e100fb88b.ngrok-free.app/api'
      const response = await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          loadEvents()
          alert('✅ Evento eliminado exitosamente')
        } else {
          alert(`❌ Error: ${data.message}`)
        }
      }
    } catch (err) {
      alert('❌ Error de conexión')
      console.error('Error deleting event:', err)
    }
  }

  const resetForm = () => {
    setCreateForm({
      name: '',
      description: '',
      date: '',
      location: '',
      ticketTypes: [
        { name: 'General', price: 50, quantity: 100 },
        { name: 'VIP', price: 100, quantity: 50 }
      ]
    })
  }

  const addTicketType = () => {
    setCreateForm(prev => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, { name: '', price: 0, quantity: 1 }]
    }))
  }

  const removeTicketType = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, i) => i !== index)
    }))
  }

  const updateTicketType = (index: number, field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      ticketTypes: prev.ticketTypes.map((tt, i) => 
        i === index ? { ...tt, [field]: value } : tt
      )
    }))
  }

  const getStatusLabel = (status: string) => {
    const labels = { draft: 'Borrador', active: 'Activo', finished: 'Finalizado' }
    return labels[status as keyof typeof labels] || status
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      finished: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status as keyof typeof variants] || variants.draft}`}>
        {getStatusLabel(status)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventStats = (event: Event) => {
    const stats = event.ticketStats || []
    const total = event.totalTickets || 0
    const scanned = stats.find(s => s.status === 'scanned')?.count || 0
    return { total, scanned, available: total - scanned }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Eventos</h2>
          <p className="text-gray-600">Sincronizando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
                <p className="text-gray-600">Administra y controla todos tus eventos</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nuevo Evento
            </button>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="draft">Borradores</option>
                  <option value="active">Activos</option>
                  <option value="finished">Finalizados</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Ordenar por fecha</option>
                <option value="name">Ordenar por nombre</option>
                <option value="status">Ordenar por estado</option>
                <option value="created">Ordenar por creación</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              {filteredEvents.length} de {events.length} eventos
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-red-800">{error}</p>
                <button 
                  onClick={loadEvents}
                  className="mt-2 text-red-600 hover:text-red-700 underline"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredEvents.length === 0 && !error ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {events.length === 0 ? 'No hay eventos' : 'No se encontraron eventos'}
            </h3>
            <p className="text-gray-600 mb-6">
              {events.length === 0 
                ? 'Comienza creando tu primer evento' 
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
            {events.length === 0 && (
              <button 
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Crear Primer Evento
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Events Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {filteredEvents.map((event) => {
                const stats = getEventStats(event)
                return (
                  <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                            {event.name}
                          </h3>
                          {getStatusBadge(event.status)}
                        </div>
                      </div>
                      
                      {event.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarDaysIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>
                            {stats.total} tickets • {stats.scanned} validados
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {stats.total > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progreso de validación</span>
                            <span>{Math.round((stats.scanned / stats.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(stats.scanned / stats.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Status Actions */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {event.status === 'draft' && (
                          <button
                            onClick={() => updateEventStatus(event.id, 'active')}
                            className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                          >
                            Activar
                          </button>
                        )}
                        {event.status === 'active' && (
                          <button
                            onClick={() => updateEventStatus(event.id, 'finished')}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                          >
                            Finalizar
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 p-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setSelectedEvent(event)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </button>
                        <Link 
                          href={`/tickets?event=${event.id}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => deleteEvent(event.id, event.name)}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Resumen General</h3>
                <ChartBarIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{events.length}</div>
                  <div className="text-sm text-gray-600">Total Eventos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {events.filter(e => e.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-600">Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {events.reduce((total, event) => total + (event.totalTickets || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Tickets</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {events.reduce((total, event) => {
                      const scanned = event.ticketStats?.find(s => s.status === 'scanned')?.count || 0
                      return total + scanned
                    }, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Validados</div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Evento</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Evento *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Concierto de Rock 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha y Hora *
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Teatro Municipal, Auditorio Central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                    placeholder="Descripción detallada del evento..."
                  />
                </div>
              </div>

              {/* Ticket Types */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tipos de Tickets</h3>
                  <button
                    onClick={addTicketType}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Agregar Tipo
                  </button>
                </div>

                <div className="space-y-4">
                  {createForm.ticketTypes.map((ticketType, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Tipo de Ticket {index + 1}</h4>
                        {createForm.ticketTypes.length > 1 && (
                          <button
                            onClick={() => removeTicketType(index)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                          <input
                            type="text"
                            value={ticketType.name}
                            onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="General, VIP, etc."
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Precio (S/)</label>
                          <input
                            type="number"
                            value={ticketType.price}
                            onChange={(e) => updateTicketType(index, 'price', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Cantidad</label>
                          <input
                            type="number"
                            value={ticketType.quantity}
                            onChange={(e) => updateTicketType(index, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                onClick={createEvent}
                disabled={creating || !createForm.name || !createForm.date}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <ClockIcon className="w-4 h-4 mr-2 animate-spin inline" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2 inline" />
                    Crear Evento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Detalles del Evento</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedEvent.name}</h3>
                <div className="mb-4">{getStatusBadge(selectedEvent.status)}</div>
                
                {selectedEvent.description && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Descripción</h4>
                    <p className="text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Fecha y Hora</h4>
                    <p className="text-gray-600">{formatDate(selectedEvent.date)}</p>
                  </div>

                  {selectedEvent.location && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Ubicación</h4>
                      <p className="text-gray-600">{selectedEvent.location}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Estadísticas</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {(() => {
                        const stats = getEventStats(selectedEvent)
                        return (
                          <>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                              <div className="text-xs text-gray-600">Total Tickets</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">{stats.scanned}</div>
                              <div className="text-xs text-gray-600">Validados</div>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">{stats.available}</div>
                              <div className="text-xs text-gray-600">Pendientes</div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <Link
                href={`/tickets?event=${selectedEvent.id}`}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Gestionar Tickets
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
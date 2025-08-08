'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  CalendarIcon, 
  MapPinIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UsersIcon,
  XMarkIcon,
  CheckIcon
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
  ticketStats?: Array<{
    status: string
    count: number
  }>
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

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

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

  const loadEvents = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
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

  const createEvent = async () => {
    if (!createForm.name || !createForm.date) {
      alert('Nombre y fecha son obligatorios')
      return
    }

    try {
      setCreating(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const eventData = {
        name: createForm.name,
        description: createForm.description || undefined,
        date: createForm.date,
        location: createForm.location || undefined,
        ticketTypes: createForm.ticketTypes.map(tt => ({
          name: tt.name,
          price: tt.price,
          quantity: tt.quantity
        }))
      }

      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('✅ Evento creado exitosamente')
          setShowCreateForm(false)
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
          loadEvents() // Recargar eventos
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert(`✅ Estado actualizado a: ${newStatus}`)
          loadEvents()
        } else {
          alert(`❌ Error: ${data.message}`)
        }
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.message || 'Error al actualizar estado'}`)
      }
    } catch (err) {
      alert('❌ Error de conexión')
      console.error('Error updating status:', err)
    }
  }

  const deleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el evento "${eventName}"?`)) {
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('✅ Evento eliminado exitosamente')
          loadEvents()
        } else {
          alert(`❌ Error: ${data.message}`)
        }
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.message || 'Error al eliminar evento'}`)
      }
    } catch (err) {
      alert('❌ Error de conexión')
      console.error('Error deleting event:', err)
    }
  }

  const addTicketType = () => {
    setCreateForm(prev => ({
      ...prev,
      ticketTypes: [
        ...prev.ticketTypes,
        { name: '', price: 0, quantity: 0 }
      ]
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

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'badge-gray',
      active: 'badge-success',
      finished: 'badge-info'
    }
    const labels = {
      draft: 'Borrador',
      active: 'Activo',
      finished: 'Finalizado'
    }
    return (
      <span className={`badge ${badges[status as keyof typeof badges] || 'badge-gray'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventStats = (event: Event) => {
    const stats = event.ticketStats || []
    const total = event.totalTickets || 0
    const scanned = stats.find(s => s.status === 'scanned')?.count || 0
    const generated = stats.find(s => s.status === 'generated')?.count || 0
    
    return { total, scanned, generated }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Cargando eventos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PS</span>
                </div>
                <span className="font-medium">Volver al Inicio</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
                <p className="text-gray-600">Administra todos tus eventos</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nuevo Evento
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={loadEvents}
              className="mt-2 text-red-600 hover:text-red-700 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {events.length === 0 && !error ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay eventos</h3>
            <p className="text-gray-600 mb-6">Comienza creando tu primer evento</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Crear Primer Evento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {events.map((event) => {
              const stats = getEventStats(event)
              return (
                <div key={event.id} className="card hover:shadow-medium transition-shadow">
                  <div className="card-header">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {event.name}
                        </h3>
                        {getStatusBadge(event.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>
                          {stats.total} tickets • {stats.scanned} escaneados
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {stats.total > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progreso de escaneo</span>
                          <span>{Math.round((stats.scanned / stats.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(stats.scanned / stats.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {event.status === 'draft' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'active')}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Activar
                        </button>
                      )}
                      {event.status === 'active' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'finished')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Finalizar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="card-footer">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setSelectedEvent(event)}
                        className="btn btn-outline flex-1"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Ver
                      </button>
                      <Link 
                        href={`/tickets?event=${event.id}`}
                        className="btn btn-secondary"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => deleteEvent(event.id, event.name)}
                        className="btn btn-outline text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Stats */}
        {events.length > 0 && (
          <div className="mt-12 bg-white rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen General</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{events.length}</div>
                <div className="text-sm text-gray-600">Total Eventos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {events.filter(e => e.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {events.reduce((total, event) => total + (event.totalTickets || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Tickets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {events.reduce((total, event) => {
                    const scanned = event.ticketStats?.find(s => s.status === 'scanned')?.count || 0
                    return total + scanned
                  }, 0)}
                </div>
                <div className="text-sm text-gray-600">Escaneados</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Evento</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Evento *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej: Concierto de Rock 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha y Hora *
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej: Teatro Municipal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input w-full h-20"
                    placeholder="Descripción del evento..."
                  />
                </div>
              </div>

              {/* Ticket Types */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tipos de Tickets</h3>
                  <button
                    onClick={addTicketType}
                    className="btn btn-outline btn-sm"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Agregar
                  </button>
                </div>

                <div className="space-y-3">
                  {createForm.ticketTypes.map((ticketType, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Tipo {index + 1}</h4>
                        {createForm.ticketTypes.length > 1 && (
                          <button
                            onClick={() => removeTicketType(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XMarkIcon className="w-4 h-4" />
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
                            className="input w-full"
                            placeholder="General, VIP, etc."
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Precio (S/)</label>
                          <input
                            type="number"
                            value={ticketType.price}
                            onChange={(e) => updateTicketType(index, 'price', Number(e.target.value))}
                            className="input w-full"
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
                            className="input w-full"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-outline"
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                onClick={createEvent}
                disabled={creating || !createForm.name || !createForm.date}
                className="btn btn-primary"
              >
                {creating ? (
                  <>
                    <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
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
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedEvent.name}</h3>
                  {getStatusBadge(selectedEvent.status)}
                </div>
                
                {selectedEvent.description && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Descripción</h4>
                    <p className="text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}

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
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-xl font-bold text-blue-600">{stats.total}</div>
                            <div className="text-xs text-gray-600">Total</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-xl font-bold text-green-600">{stats.scanned}</div>
                            <div className="text-xs text-gray-600">Escaneados</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-xl font-bold text-purple-600">{stats.generated}</div>
                            <div className="text-xs text-gray-600">Disponibles</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <Link
                href={`/tickets?event=${selectedEvent.id}`}
                className="btn btn-primary"
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
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  QrCodeIcon,
  TicketIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CogIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { apiEndpoints, handleApiError } from '@/lib/apiConfig'

interface Event {
  id: string
  name: string
  date: string
  status: string
}

interface TicketType {
  id: string
  name: string
  price: number
  quantity: number
  available: number
}

interface GeneratedTicket {
  ticketId: string
  ticketType?: string
  qrCode: string
  token: string
}

export default function TicketsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedTickets, setGeneratedTickets] = useState<GeneratedTicket[]>([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [newTicketType, setNewTicketType] = useState({
    name: '',
    price: 0,
    quantity: 1
  })

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const eventParam = urlParams.get('event')
    if (eventParam) {
      setSelectedEvent(eventParam)
    }
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      loadTicketTypes(selectedEvent)
    } else {
      setTicketTypes([])
    }
  }, [selectedEvent])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Loading events for tickets...')
      const response = await apiEndpoints.getEvents()
      
      if (response.ok && response.data.success) {
        const availableEvents = response.data.data?.filter((event: Event) => 
          event.status === 'active' || event.status === 'draft'
        ) || []
        
        console.log('✅ Available events loaded:', availableEvents.length)
        setEvents(availableEvents)
        
        if (availableEvents.length > 0 && !selectedEvent) {
          setSelectedEvent(availableEvents[0].id)
        }
      } else {
        console.warn('⚠️ Events API returned error:', response.data)
        setError(response.data.message || 'Error al cargar eventos')
      }
    } catch (err: any) {
      console.error('❌ Error loading events:', err)
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const loadTicketTypes = async (eventId: string) => {
    try {
      console.log('🔍 Loading ticket types for event:', eventId)
      const response = await apiEndpoints.getTicketTypes(eventId)
      
      if (response.ok && response.data.success) {
        console.log('✅ Ticket types loaded:', response.data.data?.length || 0)
        setTicketTypes(response.data.data || [])
      } else {
        console.warn('⚠️ Ticket types API returned error:', response.data)
        setTicketTypes([])
      }
    } catch (err: any) {
      console.error('❌ Error loading ticket types:', err)
      setTicketTypes([])
    }
  }

  const createTicketType = async () => {
    if (!selectedEvent || !newTicketType.name || newTicketType.quantity < 1) {
      alert('Por favor completa todos los campos correctamente')
      return
    }

    try {
      console.log('🔄 Creating ticket type:', newTicketType)
      const response = await apiEndpoints.createTicketType({
        eventId: selectedEvent,
        name: newTicketType.name,
        price: newTicketType.price,
        quantity: newTicketType.quantity
      })

      if (response.ok && response.data.success) {
        console.log('✅ Ticket type created successfully')
        alert('✅ Tipo de ticket creado exitosamente')
        setShowCreateTypeModal(false)
        setNewTicketType({ name: '', price: 0, quantity: 1 })
        loadTicketTypes(selectedEvent)
      } else {
        console.error('❌ Error creating ticket type:', response.data)
        alert(`❌ Error: ${response.data.message || 'Error al crear tipo de ticket'}`)
      }
    } catch (err: any) {
      console.error('❌ Error creating ticket type:', err)
      alert('❌ Error de conexión')
    }
  }

  const generateTickets = async (ticketTypeId: string, quantity: number) => {
    if (!selectedEvent || !ticketTypeId || quantity < 1) return

    try {
      setGenerating(true)
      
      console.log('🔄 Generating tickets:', { ticketTypeId, quantity })
      const response = await apiEndpoints.generateTickets({
        eventId: selectedEvent,
        ticketTypeId,
        quantity
      })

      if (response.ok && response.data.success) {
        console.log('✅ Tickets generated successfully')
        setGeneratedTickets(response.data.data.qrCodes || [])
        setShowQRModal(true)
        alert(`✅ ${quantity} tickets generados exitosamente`)
        // Recargar tipos de tickets para actualizar disponibilidad
        loadTicketTypes(selectedEvent)
      } else {
        console.error('❌ Error generating tickets:', response.data)
        alert(`❌ Error: ${response.data.message || 'Error al generar tickets'}`)
      }
    } catch (err: any) {
      console.error('❌ Error generating tickets:', err)
      alert('❌ Error de conexión al generar tickets')
    } finally {
      setGenerating(false)
    }
  }

  const generateBulkTickets = async () => {
    if (!selectedEvent || ticketTypes.length === 0) return

    const requests = ticketTypes
      .filter(tt => tt.available > 0)
      .map(tt => ({
        ticketTypeId: tt.id,
        quantity: Math.min(10, tt.available) // Generar máximo 10 por tipo
      }))

    if (requests.length === 0) {
      alert('No hay tipos de tickets con disponibilidad')
      return
    }

    try {
      setGenerating(true)
      
      console.log('🔄 Bulk generating tickets:', requests)
      const response = await apiEndpoints.bulkGenerateTickets({
        eventId: selectedEvent,
        ticketRequests: requests
      })

      if (response.ok && response.data.success) {
        console.log('✅ Bulk tickets generated successfully')
        setGeneratedTickets(response.data.data.qrCodes || [])
        setShowQRModal(true)
        alert(`✅ ${response.data.data.qrCodes?.length || 0} tickets generados exitosamente`)
        loadTicketTypes(selectedEvent)
      } else {
        console.error('❌ Error in bulk generation:', response.data)
        alert(`❌ Error: ${response.data.message || 'Error en generación masiva'}`)
      }
    } catch (err: any) {
      console.error('❌ Error in bulk generation:', err)
      alert('❌ Error de conexión')
    } finally {
      setGenerating(false)
    }
  }

  const downloadQRCodes = () => {
    if (generatedTickets.length === 0) return

    // Crear un archivo con todos los QR codes
    const content = generatedTickets.map((ticket, index) => 
      `Ticket ${index + 1} (${ticket.ticketType || 'N/A'}):\n${ticket.qrCode}\n\n`
    ).join('')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets-${selectedEvent}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadSingleQR = (ticket: GeneratedTicket, index: number) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      const link = document.createElement('a')
      link.download = `ticket-${index + 1}-${ticket.ticketType || 'ticket'}.png`
      link.href = canvas.toDataURL()
      link.click()
    }
    
    img.src = ticket.qrCode
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Cargando información...</p>
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
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generación de Tickets</h1>
                <p className="text-gray-600">Crea entradas con códigos QR únicos</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href="/eventos" className="btn btn-outline">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Ver Eventos
              </Link>
              <Link href="/scanner" className="btn btn-success">
                <QrCodeIcon className="w-5 h-5 mr-2" />
                Scanner
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-800 font-medium">Error al cargar eventos</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button 
                onClick={loadEvents}
                className="text-red-600 hover:text-red-700 underline text-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <TicketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay eventos disponibles</h3>
            <p className="text-gray-600 mb-6">Necesitas crear un evento primero</p>
            <Link href="/eventos" className="btn btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Crear Evento
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Selector */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Seleccionar Evento</h2>
                {selectedEvent && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowCreateTypeModal(true)}
                      className="btn btn-outline btn-sm"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Tipo de Ticket
                    </button>
                    <button
                      onClick={generateBulkTickets}
                      disabled={generating || ticketTypes.length === 0}
                      className="btn btn-primary btn-sm"
                    >
                      {generating ? (
                        <ClockIcon className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <QrCodeIcon className="w-4 h-4 mr-1" />
                      )}
                      Generar Masivo
                    </button>
                  </div>
                )}
              </div>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un evento</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {new Date(event.date).toLocaleDateString('es-PE')}
                  </option>
                ))}
              </select>
            </div>

            {/* Ticket Types */}
            {selectedEvent && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Tipos de Tickets Disponibles</h2>
                
                {ticketTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay tipos de tickets</h3>
                    <p className="text-gray-600 mb-4">Este evento no tiene tipos de tickets configurados</p>
                    <button 
                      onClick={() => setShowCreateTypeModal(true)}
                      className="btn btn-primary"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Agregar Tipo de Ticket
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ticketTypes.map((ticketType) => (
                      <div key={ticketType.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {ticketType.name}
                          </h3>
                          <p className="text-2xl font-bold text-blue-600 mb-1">
                            {formatPrice(ticketType.price)}
                          </p>
                        </div>

                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-medium">{ticketType.quantity}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Disponibles:</span>
                            <span className={`font-medium ${ticketType.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {ticketType.available}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Generados:</span>
                            <span className="font-medium text-blue-600">
                              {ticketType.quantity - ticketType.available}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progreso de generación</span>
                            <span>
                              {Math.round(((ticketType.quantity - ticketType.available) / ticketType.quantity) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ 
                                width: `${((ticketType.quantity - ticketType.available) / ticketType.quantity) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Generation Controls */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cantidad a generar
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={ticketType.available}
                              defaultValue="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              id={`quantity-${ticketType.id}`}
                            />
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const input = document.getElementById(`quantity-${ticketType.id}`) as HTMLInputElement
                                const quantity = parseInt(input.value) || 1
                                if (quantity > ticketType.available) {
                                  alert(`Solo hay ${ticketType.available} tickets disponibles`)
                                  return
                                }
                                generateTickets(ticketType.id, quantity)
                              }}
                              disabled={generating || ticketType.available === 0}
                              className="btn btn-primary flex-1"
                            >
                              {generating ? (
                                <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <QrCodeIcon className="w-4 h-4 mr-2" />
                              )}
                              Generar QR
                            </button>
                            
                            <button 
                              onClick={() => {
                                const input = document.getElementById(`quantity-${ticketType.id}`) as HTMLInputElement
                                input.value = Math.min(10, ticketType.available).toString()
                              }}
                              className="btn btn-outline"
                              disabled={ticketType.available === 0}
                            >
                              Max 10
                            </button>
                          </div>
                        </div>

                        {ticketType.available === 0 && (
                          <div className="mt-3 flex items-center text-sm text-red-600">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            Sin tickets disponibles
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                📋 Instrucciones
              </h3>
              <div className="space-y-2 text-blue-800">
                <p>• <strong>Selecciona un evento</strong> para ver sus tipos de tickets disponibles</p>
                <p>• <strong>Configura la cantidad</strong> de tickets que deseas generar por tipo</p>
                <p>• <strong>Haz clic en "Generar QR"</strong> para crear los códigos únicos</p>
                <p>• <strong>Los códigos QR</strong> serán únicos para cada ticket y evento específico</p>
                <p>• <strong>Una vez generados</strong>, podrás descargarlos y usar el scanner para validar</p>
                <p>• <strong>Usa "Generar Masivo"</strong> para crear hasta 10 tickets de cada tipo automáticamente</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/scanner" className="btn btn-outline">
                  <QrCodeIcon className="w-5 h-5 mr-2" />
                  Abrir Scanner
                </Link>
                <Link href="/eventos" className="btn btn-outline">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Gestionar Eventos
                </Link>
                <button 
                  onClick={downloadQRCodes}
                  disabled={generatedTickets.length === 0}
                  className="btn btn-outline"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                  Descargar Últimos QR
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Ticket Type Modal */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Crear Tipo de Ticket</h2>
              <button
                onClick={() => setShowCreateTypeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Tipo *
                </label>
                <input
                  type="text"
                  value={newTicketType.name}
                  onChange={(e) => setNewTicketType(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: VIP, General, Estudiante"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (S/) *
                </label>
                <input
                  type="number"
                  value={newTicketType.price}
                  onChange={(e) => setNewTicketType(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Total *
                </label>
                <input
                  type="number"
                  value={newTicketType.quantity}
                  onChange={(e) => setNewTicketType(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowCreateTypeModal(false)}
                className="btn btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={createTicketType}
                disabled={!newTicketType.name || newTicketType.quantity < 1}
                className="btn btn-primary"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Crear Tipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Codes Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Códigos QR Generados ({generatedTickets.length})
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={downloadQRCodes}
                  className="btn btn-outline btn-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                  Descargar Todos
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedTickets.map((ticket, index) => (
                  <div key={ticket.ticketId} className="border border-gray-200 rounded-lg p-4 text-center">
                    <div className="mb-3">
                      <img 
                        src={ticket.qrCode} 
                        alt={`QR Code ${index + 1}`}
                        className="w-32 h-32 mx-auto border border-gray-200 rounded"
                      />
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Ticket #{index + 1}
                    </div>
                    {ticket.ticketType && (
                      <div className="text-sm font-medium text-gray-900 mb-3">
                        {ticket.ticketType}
                      </div>
                    )}
                    <button
                      onClick={() => downloadSingleQR(ticket, index)}
                      className="btn btn-outline btn-sm w-full"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                💡 <strong>Tip:</strong> Estos códigos QR son únicos para este evento y no pueden ser reutilizados.
                Guárdalos en un lugar seguro y utiliza el scanner para validar el acceso.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
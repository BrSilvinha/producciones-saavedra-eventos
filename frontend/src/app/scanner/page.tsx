'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  QrCodeIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface Event {
  id: string
  name: string
  date: string
  status: string
  location?: string
}

interface ScanResult {
  success: boolean
  scanResult: 'valid' | 'used' | 'invalid' | 'wrong_event'
  displayMessage: string
  ticketInfo?: {
    id: string
    event: {
      name: string
      date: string
      location?: string
    }
    ticketType: {
      name: string
      price: number
    }
    scannedAt?: string
    scannedBy?: string
  }
  simulation?: boolean
}

export default function ScannerPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [selectedEventData, setSelectedEventData] = useState<Event | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannerUser, setScannerUser] = useState('Operador Scanner')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadEvents()
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      const eventData = events.find(e => e.id === selectedEvent)
      setSelectedEventData(eventData || null)
    } else {
      setSelectedEventData(null)
    }
  }, [selectedEvent, events])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/events`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const activeEvents = data.data?.filter((event: Event) => 
            event.status === 'active'
          ) || []
          setEvents(activeEvents)
          if (activeEvents.length > 0) {
            setSelectedEvent(activeEvents[0].id)
          }
        }
      }
    } catch (err) {
      setError('Error al cargar eventos activos')
      console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    if (!selectedEvent) {
      alert('Por favor selecciona un evento primero')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Cámara trasera preferida
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setCameraStream(stream)
      setIsScanning(true)
      
      // Iniciar escaneo automático cada 500ms
      scanIntervalRef.current = setInterval(scanQRFromVideo, 500)
      
    } catch (err) {
      console.error('Error accessing camera:', err)
      alert('Error al acceder a la cámara. Verifica los permisos.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsScanning(false)
  }

  const scanQRFromVideo = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dibujar frame del video en canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Intentar leer QR del canvas usando una librería externa
    try {
      // Aquí usarías una librería como jsQR o similar
      // Por ahora simulamos la detección
      
      // Obtener datos de imagen del canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      
      // Simular detección de QR (reemplazar con librería real)
      if (Math.random() < 0.1) { // 10% chance de detectar algo para demo
        const mockQRData = "mock_qr_" + Date.now()
        validateQRCode(mockQRData)
      }
      
    } catch (err) {
      // Error silencioso en escaneo
    }
  }

  const validateQRCode = async (qrToken: string) => {
    if (!selectedEvent) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/qr/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrToken,
          eventId: selectedEvent,
          scannerInfo: {
            user: scannerUser,
            device: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        const result: ScanResult = await response.json()
        
        // Reproducir sonido según resultado
        if (result.success && result.scanResult === 'valid') {
          playSound('success')
        } else {
          playSound('error')
        }
        
        // Agregar resultado a la lista
        setScanResults(prev => [result, ...prev].slice(0, 20))
        
        // Mostrar notificación visual
        showNotification(result)
        
      } else {
        const errorResult = await response.json()
        playSound('error')
        
        const errorScanResult: ScanResult = {
          success: false,
          scanResult: 'invalid',
          displayMessage: errorResult.message || 'Error de validación'
        }
        
        setScanResults(prev => [errorScanResult, ...prev].slice(0, 20))
      }
    } catch (err) {
      console.error('Error validating QR:', err)
      playSound('error')
      
      const errorScanResult: ScanResult = {
        success: false,
        scanResult: 'invalid',
        displayMessage: 'Error de conexión con el servidor'
      }
      
      setScanResults(prev => [errorScanResult, ...prev].slice(0, 20))
    }
  }

  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (type === 'success') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
      } else {
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (err) {
      console.log('Audio not supported')
    }
  }

  const showNotification = (result: ScanResult) => {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
      result.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <div>${result.success ? '✅' : '❌'}</div>
        <div class="font-medium">${result.displayMessage}</div>
      </div>
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 3000)
  }

  const simulateQRScan = async (scenario: 'valid' | 'used' | 'invalid' | 'wrong_event') => {
    if (!selectedEvent) {
      alert('Por favor selecciona un evento primero')
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/qr/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent,
          scenario
        })
      })

      if (response.ok) {
        const result: ScanResult = await response.json()
        
        if (result.success && result.scanResult === 'valid') {
          playSound('success')
        } else {
          playSound('error')
        }
        
        setScanResults(prev => [result, ...prev].slice(0, 20))
        showNotification(result)
      }
    } catch (err) {
      console.error('Error simulating scan:', err)
    }
  }

  const getResultIcon = (scanResult: string) => {
    switch (scanResult) {
      case 'valid':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />
      case 'used':
        return <XCircleIcon className="w-6 h-6 text-red-600" />
      case 'invalid':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
      case 'wrong_event':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
      default:
        return <QrCodeIcon className="w-6 h-6 text-gray-400" />
    }
  }

  const getResultColor = (scanResult: string) => {
    switch (scanResult) {
      case 'valid':
        return 'border-green-200 bg-green-50'
      case 'used':
        return 'border-red-200 bg-red-50'
      case 'invalid':
        return 'border-red-200 bg-red-50'
      case 'wrong_event':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Cargando scanner...</p>
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
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scanner QR</h1>
                <p className="text-gray-600">Valida entradas en tiempo real</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href="/eventos" className="btn btn-outline">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Ver Eventos
              </Link>
              <Link href="/tickets" className="btn btn-primary">
                <QrCodeIcon className="w-5 h-5 mr-2" />
                Generar Tickets
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay eventos activos</h3>
            <p className="text-gray-600 mb-6">Necesitas tener eventos activos para usar el scanner</p>
            <Link href="/eventos" className="btn btn-primary">
              <CalendarIcon className="w-5 h-5 mr-2" />
              Ver Eventos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scanner Section */}
            <div className="space-y-6">
              {/* Event Selection */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Scanner</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Evento Activo
                    </label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecciona un evento</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name} - {new Date(event.date).toLocaleDateString('es-PE')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuario del Scanner
                    </label>
                    <input
                      type="text"
                      value={scannerUser}
                      onChange={(e) => setScannerUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre del operador"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Sonidos</span>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`p-2 rounded-lg ${soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {soundEnabled ? (
                        <SpeakerWaveIcon className="w-5 h-5" />
                      ) : (
                        <SpeakerXMarkIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Camera Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Scanner de Cámara</h2>
                
                <div className="qr-scanner mb-6">
                  <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden">
                    {isScanning ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                        />
                        {/* Overlay de escaneo */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-blue-500 rounded-lg">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
                          </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <CameraIcon className="w-16 h-16 mx-auto mb-4" />
                          <p>Cámara inactiva</p>
                          <p className="text-sm">Presiona iniciar para comenzar</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3">
                  {!isScanning ? (
                    <button
                      onClick={startCamera}
                      disabled={!selectedEvent}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <PlayIcon className="w-5 h-5 mr-2" />
                      Iniciar Cámara
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <StopIcon className="w-5 h-5 mr-2" />
                      Detener Cámara
                    </button>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Simulation Controls */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  🧪 Pruebas de Escaneo
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  Usa estos botones para probar diferentes escenarios
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => simulateQRScan('valid')}
                    disabled={!selectedEvent}
                    className="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    ✅ QR Válido
                  </button>
                  <button
                    onClick={() => simulateQRScan('used')}
                    disabled={!selectedEvent}
                    className="inline-flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    ❌ QR Usado
                  </button>
                  <button
                    onClick={() => simulateQRScan('invalid')}
                    disabled={!selectedEvent}
                    className="inline-flex items-center justify-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    🚫 QR Inválido
                  </button>
                  <button
                    onClick={() => simulateQRScan('wrong_event')}
                    disabled={!selectedEvent}
                    className="inline-flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    🔄 Evento Incorrecto
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Current Event Info */}
              {selectedEventData && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Evento Seleccionado</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-900 text-lg">{selectedEventData.name}</p>
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                        🟢 Activo
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>📅 {formatDateTime(selectedEventData.date)}</p>
                      {selectedEventData.location && <p>📍 {selectedEventData.location}</p>}
                      <p>👤 Operador: {scannerUser}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Results */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Resultados de Escaneo ({scanResults.length})
                  </h2>
                  {scanResults.length > 0 && (
                    <button
                      onClick={() => setScanResults([])}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scanResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <QrCodeIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No hay escaneos aún</p>
                      <p className="text-sm">Los resultados aparecerán aquí en tiempo real</p>
                    </div>
                  ) : (
                    scanResults.map((result, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${getResultColor(result.scanResult)}`}
                      >
                        <div className="flex items-start space-x-3">
                          {getResultIcon(result.scanResult)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-1">
                              {result.displayMessage}
                            </p>
                            
                            {result.ticketInfo && (
                              <div className="text-sm text-gray-600 space-y-1 mt-2">
                                <p>🎫 {result.ticketInfo.ticketType.name}</p>
                                <p>💰 {new Intl.NumberFormat('es-PE', {
                                  style: 'currency',
                                  currency: 'PEN'
                                }).format(result.ticketInfo.ticketType.price)}</p>
                                {result.ticketInfo.scannedAt && (
                                  <p>⏰ {formatDateTime(result.ticketInfo.scannedAt)}</p>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-gray-500">
                                {new Date().toLocaleTimeString('es-PE')}
                              </div>
                              {result.simulation && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Simulación
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Statistics */}
              {scanResults.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas de Sesión</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {scanResults.filter(r => r.scanResult === 'valid').length}
                      </div>
                      <div className="text-xs text-gray-600">Válidos</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">
                        {scanResults.filter(r => r.scanResult !== 'valid').length}
                      </div>
                      <div className="text-xs text-gray-600">Rechazados</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
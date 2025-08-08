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
  ArrowLeftIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import { apiEndpoints, handleApiError } from '@/lib/apiConfig'

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

// Función para detectar capacidades de cámara de forma compatible
const getCameraCapabilities = () => {
  // Verificar múltiples APIs para máxima compatibilidad
  const hasModernAPI = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const hasWebkitAPI = !!(navigator as any).webkitGetUserMedia
  const hasMozAPI = !!(navigator as any).mozGetUserMedia
  const hasLegacyAPI = !!(navigator as any).getUserMedia
  
  return {
    hasCamera: hasModernAPI || hasWebkitAPI || hasMozAPI || hasLegacyAPI,
    modern: hasModernAPI,
    webkit: hasWebkitAPI,
    moz: hasMozAPI,
    legacy: hasLegacyAPI
  }
}

// Función para obtener stream de cámara compatible con múltiples navegadores
const getCompatibleCameraStream = async () => {
  const capabilities = getCameraCapabilities()
  
  const constraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280, min: 320 },
      height: { ideal: 720, min: 240 },
      frameRate: { ideal: 30, min: 10 }
    },
    audio: false
  }

  // Intentar con API moderna primero
  if (capabilities.modern) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      // Si falla, intentar con configuración más simple
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    }
  }

  // Fallback para navegadores más antiguos
  return new Promise<MediaStream>((resolve, reject) => {
    const success = (stream: MediaStream) => resolve(stream)
    const error = (err: any) => reject(err)

    if (capabilities.webkit) {
      (navigator as any).webkitGetUserMedia(constraints, success, error)
    } else if (capabilities.moz) {
      (navigator as any).mozGetUserMedia(constraints, success, error)
    } else if (capabilities.legacy) {
      (navigator as any).getUserMedia(constraints, success, error)
    } else {
      reject(new Error('No se encontró API de cámara compatible'))
    }
  })
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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraCapabilities, setCameraCapabilities] = useState(getCameraCapabilities())
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadEvents()
    setCameraCapabilities(getCameraCapabilities())
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
      
      const response = await apiEndpoints.getEvents()
      
      if (response.ok && response.data.success) {
        const activeEvents = response.data.data?.filter((event: Event) => 
          event.status === 'active'
        ) || []
        
        setEvents(activeEvents)
        
        if (activeEvents.length > 0) {
          setSelectedEvent(activeEvents[0].id)
        }
      } else {
        setError(response.data.message || 'Error al cargar eventos activos')
      }
    } catch (err: any) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    if (!selectedEvent) {
      alert('Por favor selecciona un evento primero')
      return
    }

    if (!cameraCapabilities.hasCamera) {
      setCameraError('Tu navegador no soporta acceso a cámara. Actualiza a la última versión.')
      return
    }

    try {
      setCameraError(null)
      
      const stream = await getCompatibleCameraStream()

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(playError => {
              console.warn('Error reproduciendo video:', playError)
              // Intentar reproducción manual
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play()
                }
              }, 100)
            })
          }
        }

        // Manejo de errores del video
        videoRef.current.onerror = (e) => {
          setCameraError('Error al reproducir el stream de video')
        }
      }

      setCameraStream(stream)
      setIsScanning(true)
      
      // Iniciar escaneo automático
      scanIntervalRef.current = setInterval(scanQRFromVideo, 1000)
      
    } catch (err: any) {
      let errorMessage = 'Error desconocido al acceder a la cámara'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Permiso de cámara denegado. Permite el acceso y recarga la página.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No se encontró cámara en tu dispositivo.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta acceso a la cámara.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.'
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'No se pudo configurar la cámara con los ajustes solicitados.'
      } else if (err.message && err.message.includes('API')) {
        errorMessage = 'API de cámara no disponible. Usa Chrome, Firefox o Safari actualizado.'
      }
      
      setCameraError(errorMessage)
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
    setCameraError(null)
  }

  const scanQRFromVideo = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Simulación de detección QR (reemplazar con librería real como jsQR)
      if (Math.random() < 0.05) { // 5% probabilidad para demo
        const mockQRData = "demo_qr_" + Date.now()
        validateQRCode(mockQRData)
      }
      
    } catch (err) {
      // Error silencioso
    }
  }

  const validateQRCode = async (qrToken: string) => {
    if (!selectedEvent) return

    try {
      const response = await apiEndpoints.validateQR({
        qrToken,
        eventId: selectedEvent,
        scannerInfo: {
          user: scannerUser,
          device: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      })

      if (response.ok && response.data) {
        const result: ScanResult = response.data
        
        if (result.success && result.scanResult === 'valid') {
          playSound('success')
        } else {
          playSound('error')
        }
        
        setScanResults(prev => [result, ...prev].slice(0, 20))
        showNotification(result)
        
      } else {
        playSound('error')
        
        const errorResult: ScanResult = {
          success: false,
          scanResult: 'invalid',
          displayMessage: response.data?.message || 'Error de validación'
        }
        
        setScanResults(prev => [errorResult, ...prev].slice(0, 20))
      }
    } catch (err: any) {
      playSound('error')
      
      const errorScanResult: ScanResult = {
        success: false,
        scanResult: 'invalid',
        displayMessage: 'Error de conexión'
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
      // Audio silencioso si no está soportado
    }
  }

  const showNotification = (result: ScanResult) => {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
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
        notification.style.opacity = '0'
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 300)
      }
    }, 3000)
  }

  const simulateQRScan = async (scenario: 'valid' | 'used' | 'invalid' | 'wrong_event') => {
    if (!selectedEvent) {
      alert('Por favor selecciona un evento primero')
      return
    }

    try {
      const response = await apiEndpoints.simulateQR({
        eventId: selectedEvent,
        scenario
      })

      if (response.ok && response.data) {
        const result: ScanResult = response.data
        
        if (result.success && result.scanResult === 'valid') {
          playSound('success')
        } else {
          playSound('error')
        }
        
        setScanResults(prev => [result, ...prev].slice(0, 20))
        showNotification(result)
      }
    } catch (err: any) {
      // Error silencioso
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
            <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {error ? 'Error al cargar eventos' : 'No hay eventos activos'}
            </h3>
            <p className="text-gray-600 mb-6">
              {error ? 'Verifica la conexión' : 'Necesitas eventos activos para usar el scanner'}
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/eventos" className="btn btn-primary">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Ver Eventos
              </Link>
              <button onClick={loadEvents} className="btn btn-outline">
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scanner Section */}
            <div className="space-y-6">
              {/* Event Selection */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
                
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
                      Usuario
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
                      className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Scanner de Cámara</h2>
                  {cameraCapabilities.hasCamera && (
                    <div className="flex items-center text-green-600 text-sm">
                      <DevicePhoneMobileIcon className="w-4 h-4 mr-1" />
                      Compatible
                    </div>
                  )}
                </div>
                
                {cameraError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-800 text-sm font-medium">Error de Cámara</p>
                        <p className="text-red-700 text-sm mt-1">{cameraError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!cameraCapabilities.hasCamera && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-yellow-800 text-sm font-medium">Cámara No Disponible</p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Tu navegador no soporta acceso a cámara. Actualiza a Chrome, Firefox o Safari.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
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
                        {/* Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-blue-500 rounded-lg animate-pulse">
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br"></div>
                          </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <CameraIcon className="w-16 h-16 mx-auto mb-4" />
                          <p>Cámara inactiva</p>
                          <p className="text-sm">Presiona iniciar para escanear</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3">
                  {!isScanning ? (
                    <button
                      onClick={startCamera}
                      disabled={!selectedEvent || !cameraCapabilities.hasCamera}
                      className="flex-1 btn btn-primary"
                    >
                      <PlayIcon className="w-5 h-5 mr-2" />
                      Iniciar Cámara
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="flex-1 btn btn-danger"
                    >
                      <StopIcon className="w-5 h-5 mr-2" />
                      Detener
                    </button>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="btn btn-outline"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Simulation Controls */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  🧪 Simulador de Escaneo
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  Prueba diferentes escenarios sin usar la cámara
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => simulateQRScan('valid')}
                    disabled={!selectedEvent}
                    className="btn btn-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    ✅ QR Válido
                  </button>
                  <button
                    onClick={() => simulateQRScan('used')}
                    disabled={!selectedEvent}
                    className="btn btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    ❌ QR Usado
                  </button>
                  <button
                    onClick={() => simulateQRScan('invalid')}
                    disabled={!selectedEvent}
                    className="btn btn-sm bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                  >
                    🚫 QR Inválido
                  </button>
                  <button
                    onClick={() => simulateQRScan('wrong_event')}
                    disabled={!selectedEvent}
                    className="btn btn-sm bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    🔄 Evento Incorrecto
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Event Info */}
              {selectedEventData && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Evento Activo</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-900 text-lg">{selectedEventData.name}</p>
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                        🟢 Escaneando
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
                    Resultados ({scanResults.length})
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
                      <p>Sin escaneos</p>
                      <p className="text-sm">Los resultados aparecerán aquí</p>
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
                                  Demo
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h3>
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

              {/* System Info */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Estado del Sistema</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Navegador:</span>
                    <span className="text-green-600">Compatible ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cámara:</span>
                    <span className={cameraCapabilities.hasCamera ? 'text-green-600' : 'text-red-600'}>
                      {cameraCapabilities.hasCamera ? 'Disponible ✓' : 'No disponible ✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio:</span>
                    <span className={soundEnabled ? 'text-green-600' : 'text-gray-500'}>
                      {soundEnabled ? 'Activado ✓' : 'Desactivado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evento:</span>
                    <span className={selectedEvent ? 'text-green-600' : 'text-gray-500'}>
                      {selectedEvent ? 'Seleccionado ✓' : 'Sin seleccionar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
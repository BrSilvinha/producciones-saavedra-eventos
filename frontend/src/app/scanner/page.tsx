'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import jsQR from 'jsqr'
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
  VideoCameraIcon,
  ExclamationCircleIcon
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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [lastScanTime, setLastScanTime] = useState<number>(0)
  const [scanCount, setScanCount] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('Inicializando...')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadEvents()
    checkCameraPermissions()
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

  const updateDebug = (message: string) => {
    console.log(`🐛 ${message}`)
    setDebugInfo(message)
  }

  const checkCameraPermissions = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Tu navegador no soporta acceso a la cámara')
        return
      }
    } catch (err) {
      console.error('Error checking camera permissions:', err)
    }
  }

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${apiUrl}/events`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
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
      alert('⚠️ Por favor selecciona un evento primero')
      return
    }

    try {
      setCameraError(null)
      setCameraReady(false)
      setVideoLoaded(false)
      setVideoPlaying(false)
      updateDebug('🎬 Iniciando cámara...')
      
      // ✅ STOP COMPLETE - Limpieza total
      if (cameraStream) {
        updateDebug('🛑 Deteniendo stream anterior...')
        cameraStream.getTracks().forEach(track => {
          track.stop()
          console.log(`🛑 Track ${track.kind} stopped`)
        })
        setCameraStream(null)
        
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.load()
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar más tiempo
      }

      updateDebug('📹 Solicitando permiso de cámara...')
      
      // ✅ CONFIGURACIÓN MUY BÁSICA
      let stream: MediaStream
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'environment'
          },
          audio: false
        })
        updateDebug('✅ Stream con configuración básica obtenido')
      } catch (err) {
        updateDebug('🔄 Fallback a configuración mínima...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      }

      console.log('✅ Stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
      })
      
      setCameraStream(stream)
      updateDebug('💾 Stream guardado en state')

      if (videoRef.current) {
        const video = videoRef.current
        updateDebug('🎥 Configurando video element...')
        
        // ✅ CONFIGURACIÓN FORZADA EXTREMA
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        video.controls = false
        
        // ✅ EVENT LISTENERS COMPLETOS
        const handleLoadStart = () => {
          updateDebug('📺 Video: loadstart')
        }
        
        const handleLoadedMetadata = () => {
          updateDebug(`📺 Video: metadata loaded (${video.videoWidth}x${video.videoHeight})`)
          setVideoLoaded(true)
        }
        
        const handleCanPlay = () => {
          updateDebug('📺 Video: can play')
          setCameraReady(true)
          
          // ✅ FORZAR PLAY INMEDIATO
          video.play()
            .then(() => {
              updateDebug('▶️ Video: playing successfully')
              setVideoPlaying(true)
              setIsScanning(true)
              startQRScanning()
            })
            .catch(err => {
              updateDebug(`❌ Play error: ${err.message}`)
              setCameraError('Error al reproducir video')
            })
        }
        
        const handlePlay = () => {
          updateDebug('📺 Video: play event')
          setVideoPlaying(true)
        }
        
        const handleError = (e: any) => {
          updateDebug(`❌ Video error: ${e.type}`)
          setCameraError('Error en elemento de video')
        }

        // Agregar listeners
        video.addEventListener('loadstart', handleLoadStart)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('canplay', handleCanPlay)
        video.addEventListener('play', handlePlay)
        video.addEventListener('error', handleError)
        
        // ✅ ASIGNAR STREAM Y FORZAR CARGA
        updateDebug('🔗 Asignando stream al video...')
        video.srcObject = stream
        
        // ✅ FORZAR LOAD
        video.load()
        
        // ✅ INTENTOS MÚLTIPLES DE PLAY
        setTimeout(() => {
          if (video.readyState >= 1) {
            updateDebug('🔄 Intento de play diferido 1s')
            video.play().catch(err => console.log('Play attempt 1s failed:', err))
          }
        }, 1000)
        
        setTimeout(() => {
          if (video.readyState >= 2) {
            updateDebug('🔄 Intento de play diferido 2s')
            video.play().catch(err => console.log('Play attempt 2s failed:', err))
          }
        }, 2000)
        
        // Cleanup function para remover listeners
        return () => {
          video.removeEventListener('loadstart', handleLoadStart)
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
          video.removeEventListener('canplay', handleCanPlay)
          video.removeEventListener('play', handlePlay)
          video.removeEventListener('error', handleError)
        }
      }
      
    } catch (err: any) {
      console.error('❌ Error starting camera:', err)
      updateDebug(`❌ Error: ${err.message}`)
      handleCameraError(err)
    }
  }

  const handleCameraError = (err: any) => {
    if (err.name === 'NotAllowedError') {
      setCameraError('🚫 Permisos denegados. Habilita la cámara en tu navegador.')
      setPermissionStatus('denied')
    } else if (err.name === 'NotFoundError') {
      setCameraError('📷 No se encontró cámara en tu dispositivo.')
    } else if (err.name === 'NotReadableError') {
      setCameraError('📱 Cámara ocupada por otra aplicación.')
    } else {
      setCameraError(`❌ Error: ${err.message}`)
    }
  }

  const stopCamera = () => {
    updateDebug('🛑 Deteniendo cámara...')
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop()
        console.log(`🛑 Track detenido: ${track.kind}`)
      })
      setCameraStream(null)
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.load()
    }
    
    setIsScanning(false)
    setCameraReady(false)
    setVideoLoaded(false)
    setVideoPlaying(false)
    setCameraError(null)
    updateDebug('✅ Cámara detenida')
  }

  const startQRScanning = () => {
    updateDebug('🎯 Iniciando escaneo QR automático')
    
    scanIntervalRef.current = setInterval(() => {
      scanQRFromVideo()
    }, 300)
  }

  const scanQRFromVideo = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning || !cameraReady || !videoPlaying) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // ✅ ESCANEO REAL CON jsQR
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth"
      })

      if (qrCode && qrCode.data) {
        const now = Date.now()
        
        if (now - lastScanTime < 2000) {
          return
        }
        
        setLastScanTime(now)
        setScanCount(prev => prev + 1)
        
        console.log('🎯 ¡QR REAL DETECTADO!', {
          data: qrCode.data.substring(0, 100) + '...',
          location: qrCode.location,
          scanNumber: scanCount + 1
        })
        
        updateDebug(`🎯 QR DETECTADO! Scan #${scanCount + 1}`)
        
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
        }
        
        validateQRCode(qrCode.data)
        
        setTimeout(() => {
          if (isScanning) {
            startQRScanning()
          }
        }, 3000)
      }
      
    } catch (err) {
      console.error('❌ Error en escaneo QR:', err)
    }
  }

  const validateQRCode = async (qrToken: string) => {
    if (!selectedEvent) return

    try {
      updateDebug('🔍 Validando QR con backend...')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${apiUrl}/qr/validate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qrToken,
          eventId: selectedEvent,
          scannerInfo: {
            user: scannerUser,
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            scanCount: scanCount + 1
          }
        })
      })

      let result: ScanResult

      if (response.ok) {
        result = await response.json()
        updateDebug(`✅ Respuesta: ${result.scanResult}`)
        
        if (result.success && result.scanResult === 'valid') {
          playSound('success')
          showNotification(result.displayMessage, 'success')
        } else {
          playSound('error')
          showNotification(result.displayMessage, 'error')
        }
        
      } else {
        const errorResult = await response.json()
        playSound('error')
        
        result = {
          success: false,
          scanResult: 'invalid',
          displayMessage: errorResult.displayMessage || errorResult.message || 'Error de validación'
        }
        
        updateDebug(`❌ Error de validación: ${result.displayMessage}`)
        showNotification(result.displayMessage, 'error')
      }
      
      setScanResults(prev => [result, ...prev].slice(0, 20))
      
    } catch (err) {
      console.error('❌ Error validating QR:', err)
      updateDebug(`❌ Error de conexión: ${err}`)
      playSound('error')
      
      const errorResult: ScanResult = {
        success: false,
        scanResult: 'invalid',
        displayMessage: '❌ Error de conexión con servidor'
      }
      
      setScanResults(prev => [errorResult, ...prev].slice(0, 20))
      showNotification(errorResult.displayMessage, 'error')
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
      console.log('🔇 Audio no soportado')
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="text-xl">${type === 'success' ? '✅' : '❌'}</div>
        <div class="font-medium">${message}</div>
      </div>
    `
    
    notification.style.transform = 'translateX(100%)'
    notification.style.opacity = '0'
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)'
      notification.style.opacity = '1'
    }, 100)
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.transform = 'translateX(100%)'
        notification.style.opacity = '0'
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 300)
      }
    }, 4000)
  }

  // ✅ FUNCIÓN DE TEST REAL 
  const testQRScanning = () => {
    if (!videoRef.current || !canvasRef.current || !videoPlaying) {
      alert('❌ Video no está reproduciendo')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      alert('❌ No se pudo obtener contexto de canvas')
      return
    }

    try {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      updateDebug(`🧪 Testing con imagen ${canvas.width}x${canvas.height}`)
      
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth"
      })

      if (qrCode && qrCode.data) {
        alert(`✅ ¡QR DETECTADO! Data: ${qrCode.data.substring(0, 100)}...`)
        updateDebug(`✅ Test exitoso: QR encontrado`)
      } else {
        alert('❌ No se detectó ningún QR en la imagen actual')
        updateDebug(`❌ Test: No QR encontrado`)
      }
    } catch (err) {
      alert(`❌ Error en test: ${err}`)
      updateDebug(`❌ Test error: ${err}`)
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
                <h1 className="text-2xl font-bold text-gray-900">Scanner QR REAL</h1>
                <p className="text-gray-600">Escaneo con jsQR + Debug completo</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href="/eventos" className="btn btn-outline">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Eventos
              </Link>
              <Link href="/tickets" className="btn btn-primary">
                <QrCodeIcon className="w-5 h-5 mr-2" />
                Generar
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
            <p className="text-gray-600 mb-6">Necesitas eventos activos para usar el scanner</p>
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Evento
                    </label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona un evento</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operador
                    </label>
                    <input
                      type="text"
                      value={scannerUser}
                      onChange={(e) => setScannerUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Cámara Scanner
                  {scanCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      • {scanCount} escaneos REALES
                    </span>
                  )}
                </h2>
                
                {/* Camera Error */}
                {cameraError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 font-medium">Error de Cámara</p>
                        <p className="text-red-700 text-sm mt-1">{cameraError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Debug Info MEJORADO */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
                  <div className="font-medium text-blue-900 mb-2">🔍 Estado del Scanner:</div>
                  <div className="grid grid-cols-2 gap-2 text-blue-800">
                    <p>📹 Stream: {cameraStream ? (cameraStream.active ? '✅ Activo' : '❌ Inactivo') : '❌ No'}</p>
                    <p>🎥 Video loaded: {videoLoaded ? '✅ Sí' : '❌ No'}</p>
                    <p>📺 Camera ready: {cameraReady ? '✅ Sí' : '❌ No'}</p>
                    <p>▶️ Video playing: {videoPlaying ? '✅ Sí' : '❌ No'}</p>
                    <p>🔍 Scanning: {isScanning ? '✅ Activo' : '❌ Inactivo'}</p>
                    <p>🎯 Scan count: {scanCount}</p>
                  </div>
                  <div className="mt-2 text-blue-700 text-xs">
                    <strong>Debug:</strong> {debugInfo}
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden">
                    {cameraStream ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                          style={{ 
                            transform: 'scaleX(-1)', // Efecto espejo
                            backgroundColor: '#000' // Fondo negro
                          }}
                        />
                        {/* Overlay solo si está completamente ready */}
                        {videoPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 border-4 border-green-400 rounded-xl relative animate-pulse">
                              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-300 rounded-tl-lg"></div>
                              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-300 rounded-tr-lg"></div>
                              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-300 rounded-bl-lg"></div>
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-300 rounded-br-lg"></div>
                              <div className="absolute top-1/2 left-4 right-4 h-1 bg-green-400 animate-pulse"></div>
                              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
                                <p className="text-green-400 text-xs font-bold">
                                  SCANNER REAL ACTIVO
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          {cameraError ? (
                            <>
                              <VideoCameraIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
                              <p className="text-red-600 font-medium">Error de cámara</p>
                            </>
                          ) : (
                            <>
                              <CameraIcon className="w-16 h-16 mx-auto mb-4" />
                              <p>Cámara inactiva</p>
                              <p className="text-sm">Presiona iniciar</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 mb-4">
                  {!isScanning ? (
                    <button
                      onClick={startCamera}
                      disabled={!selectedEvent}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <PlayIcon className="w-5 h-5 mr-2" />
                      Iniciar Scanner REAL
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <StopIcon className="w-5 h-5 mr-2" />
                      Detener
                    </button>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Botón de TEST */}
                <div className="mb-4">
                  <button
                    onClick={testQRScanning}
                    disabled={!videoPlaying}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    🧪 TEST: ¿Detecta QR ahora?
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Haz click cuando tengas un QR en pantalla para probar si lo detecta
                  </p>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Current Event Info */}
              {selectedEventData && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Evento Actual</h2>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">{selectedEventData.name}</p>
                    <p className="text-sm text-gray-600">👤 {scannerUser}</p>
                    <p className="text-sm text-gray-600">🎯 {scanCount} escaneos REALES</p>
                    <p className="text-sm text-gray-600">
                      🎥 Estado: {videoPlaying ? 'Video funcionando' : 'Video no reproduce'}
                    </p>
                  </div>
                </div>
              )}

              {/* Quick QR Test */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">
                  🧪 Verificación de Escaneo REAL
                </h3>
                <div className="space-y-3 text-purple-800 text-sm">
                  <p>• <strong>Paso 1:</strong> Inicia el scanner y espera que aparezca tu imagen</p>
                  <p>• <strong>Paso 2:</strong> Ve a `/tickets` y genera un código QR</p>
                  <p>• <strong>Paso 3:</strong> Muestra el QR a la cámara</p>
                  <p>• <strong>Paso 4:</strong> Haz click en "TEST: ¿Detecta QR ahora?" para verificar</p>
                  <p>• <strong>Si detecta:</strong> ¡El scanner funciona! Si no, hay que ajustar más</p>
                </div>
              </div>

              {/* Scan Results */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Resultados REALES ({scanResults.length})
                  </h2>
                  {scanResults.length > 0 && (
                    <button
                      onClick={() => setScanResults([])}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scanResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <QrCodeIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Sin escaneos REALES aún</p>
                      <p className="text-sm">Los códigos QR detectados aparecerán aquí</p>
                      <p className="text-xs text-purple-500 mt-2">
                        Use el botón TEST para verificar detección
                      </p>
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
                                <p>💰 S/ {result.ticketInfo.ticketType.price}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-gray-500">
                                {new Date().toLocaleTimeString('es-PE')}
                              </div>
                              <div className="flex space-x-1">
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  REAL
                                </span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  #{index + 1}
                                </span>
                              </div>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas REALES</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {scanResults.filter(r => r.scanResult === 'valid').length}
                      </div>
                      <div className="text-xs text-gray-600">Válidos REALES</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {scanResults.filter(r => r.scanResult !== 'valid').length}
                      </div>
                      <div className="text-xs text-gray-600">Rechazados REALES</div>
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
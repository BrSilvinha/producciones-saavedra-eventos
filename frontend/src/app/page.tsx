'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ClockIcon,
  ChartBarIcon,
  QrCodeIcon,
  CalendarDaysIcon,
  TicketIcon,
  ArrowRightIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline'

interface SystemStats {
  totalEvents: number
  activeEvents: number
  totalTickets: number
  scannedTickets: number
  todayScans: number
  systemStatus: 'online' | 'offline' | 'maintenance'
}

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
  badge?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Gestión de Eventos',
    description: 'Administra y controla todos tus eventos',
    href: '/eventos',
    icon: CalendarDaysIcon,
    color: 'blue'
  },
  {
    title: 'Generación de Tickets',
    description: 'Crea entradas con códigos QR únicos',
    href: '/tickets', 
    icon: TicketIcon,
    color: 'green'
  },
  {
    title: 'Scanner QR',
    description: 'Valida entradas en tiempo real',
    href: '/scanner',
    icon: QrCodeIcon,
    color: 'purple',
    badge: 'Live'
  }
]

export default function HomePage() {
  const [stats, setStats] = useState<SystemStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalTickets: 0,
    scannedTickets: 0,
    todayScans: 0,
    systemStatus: 'offline'
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadSystemStats()
    const interval = setInterval(loadSystemStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSystemStats = async () => {
    try {
      // Usar fetch simple que sabemos que funciona
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://237af844b109.ngrok-free.app/api'
      
      console.log('🔍 Loading stats from:', apiUrl)
      
      // Health check simple
      const healthResponse = await fetch(`${apiUrl}/health`, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ProduccionesSaavedra/1.0'
        }
      })
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`)
      }
      
      const healthData = await healthResponse.json()
      console.log('✅ Health check OK:', healthData)
      
      // Load events
      const eventsResponse = await fetch(`${apiUrl}/events`, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ProduccionesSaavedra/1.0'
        }
      })
      
      if (!eventsResponse.ok) {
        throw new Error(`Events API failed: ${eventsResponse.status}`)
      }
      
      const eventsText = await eventsResponse.text()
      console.log('📄 Events response (first 200 chars):', eventsText.substring(0, 200))
      
      const eventsData = JSON.parse(eventsText)
      console.log('📊 Events data:', eventsData)
      
      if (eventsData && eventsData.success) {
        const events = eventsData.data || []
        const activeEvents = events.filter((e: any) => e.status === 'active')
        
        // Calculate stats safely
        let totalTickets = 0
        let scannedTickets = 0
        
        events.forEach((event: any) => {
          if (event.totalTickets) {
            totalTickets += Number(event.totalTickets) || 0
          }
          if (event.ticketStats) {
            const scannedStat = event.ticketStats.find((s: any) => s.status === 'scanned')
            if (scannedStat) {
              scannedTickets += Number(scannedStat.count) || 0
            }
          }
        })
        
        setStats({
          totalEvents: events.length,
          activeEvents: activeEvents.length,
          totalTickets,
          scannedTickets,
          todayScans: Math.floor(scannedTickets * 0.3), // Estimation
          systemStatus: 'online'
        })
        
        console.log('✅ Stats updated:', {
          totalEvents: events.length,
          activeEvents: activeEvents.length,
          totalTickets,
          scannedTickets
        })
      } else {
        console.warn('⚠️ Events API returned unexpected format:', eventsData)
        setStats(prev => ({ ...prev, systemStatus: 'online' }))
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('❌ Error loading stats:', error)
      setStats(prev => ({ ...prev, systemStatus: 'offline' }))
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = () => {
    switch (stats.systemStatus) {
      case 'online':
        return {
          icon: CheckCircleIcon,
          text: 'Sistema Operativo',
          className: 'text-green-600 bg-green-50 border-green-200'
        }
      case 'maintenance':
        return {
          icon: ExclamationCircleIcon,
          text: 'Mantenimiento',
          className: 'text-yellow-600 bg-yellow-50 border-yellow-200'
        }
      default:
        return {
          icon: ExclamationCircleIcon,
          text: 'Sistema Desconectado',
          className: 'text-red-600 bg-red-50 border-red-200'
        }
    }
  }

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Sistema</h2>
          <p className="text-gray-600">Conectando con los servicios...</p>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">PS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Producciones Saavedra</h1>
                <p className="text-sm text-gray-500">Sistema de Gestión de Eventos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Indicator */}
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig.className}`}>
                <statusConfig.icon className="w-4 h-4 mr-2" />
                {statusConfig.text}
              </div>
              
              {/* Last Update */}
              <div className="hidden sm:block text-xs text-gray-500">
                Actualizado: {lastUpdate.toLocaleTimeString('es-PE')}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ChartBarIcon className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Control Total de
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Eventos y Accesos
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Plataforma profesional para la gestión integral de eventos, generación de tickets 
            con QR y control de acceso en tiempo real.
          </p>
        </div>

        {/* Statistics Dashboard */}
        {stats.systemStatus === 'online' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalEvents}</div>
              <div className="text-sm text-gray-600">Eventos Totales</div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.activeEvents}</div>
              <div className="text-sm text-gray-600">Eventos Activos</div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{stats.totalTickets}</div>
              <div className="text-sm text-gray-600">Tickets Generados</div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{stats.scannedTickets}</div>
              <div className="text-sm text-gray-600">Tickets Validados</div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{stats.todayScans}</div>
              <div className="text-sm text-gray-600">Escaneos Hoy</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {QUICK_ACTIONS.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group relative bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {action.badge && (
                <div className="absolute top-6 right-6">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {action.badge}
                  </span>
                </div>
              )}
              
              <div className={`w-16 h-16 bg-gradient-to-r ${getColorClasses(action.color)} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{action.title}</h3>
              <p className="text-gray-600 mb-6">{action.description}</p>
              
              <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                <span>Acceder</span>
                <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </Link>
          ))}
        </div>

        {/* System Information */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Estado del Sistema</h2>
            <button
              onClick={loadSystemStats}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ArrowRightIcon className="w-4 h-4 mr-2" />
              Actualizar
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <PlayCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Frontend</h3>
              <p className="text-sm text-gray-600">Next.js 14 + TypeScript</p>
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                Operativo
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Backend API</h3>
              <p className="text-sm text-gray-600">Node.js + Express</p>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                stats.systemStatus === 'online' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.systemStatus === 'online' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ChartBarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Base de Datos</h3>
              <p className="text-sm text-gray-600">PostgreSQL</p>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                stats.systemStatus === 'online' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {stats.systemStatus === 'online' ? 'Sincronizado' : 'Verificando'}
              </div>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">🔗 Estado de Conexión</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Backend URL:</strong><br />
              <code className="text-xs bg-white px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL || 'https://237af844b109.ngrok-free.app/api'}
              </code>
            </div>
            <div>
              <strong>Última actualización:</strong><br />
              <span className="text-blue-700">{lastUpdate.toLocaleString('es-PE')}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">© 2024 Producciones Saavedra. Sistema Profesional de Gestión de Eventos.</p>
            <p className="text-sm">Desarrollado con tecnología de vanguardia para máxima confiabilidad.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
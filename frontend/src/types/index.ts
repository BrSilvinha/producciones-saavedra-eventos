// Tipos base
export type UUID = string
export type ISOString = string

// Estados de eventos
export type EventStatus = 'draft' | 'active' | 'finished'

// Estados de tickets
export type TicketStatus = 'generated' | 'scanned' | 'expired'

// Resultados de escaneo
export type ScanResult = 'valid' | 'used' | 'invalid' | 'wrong_event'

// Interfaz base para respuestas de API - CORREGIDA PARA EVITAR ts(2339)
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: Array<{
    field: string
    message: string
  }>
  pagination?: {
    total: number
    limit: number
    offset: number
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  timestamp?: string
  // Propiedades adicionales para compatibilidad y evitar errores ts(2339)
  error?: string
  status?: string
  code?: number | string
  details?: any
  // Permitir cualquier propiedad adicional
  [key: string]: any
}

// Estadísticas de ticket - CORREGIDO
export interface TicketStat {
  status: string
  count: number | string // Puede venir como string del backend
}

// Estadísticas de escaneo - CORREGIDO
export interface ScanStat {
  scan_result: string
  count: number | string // Puede venir como string del backend
}

// Evento - CORREGIDO PARA EVITAR ERRORES
export interface Event {
  id: UUID
  name: string
  description?: string | null
  date: ISOString
  location?: string | null
  status: EventStatus
  created_at: ISOString
  updated_at: ISOString
  ticketTypes?: TicketType[]
  tickets?: Ticket[]
  ticketStats?: TicketStat[]
  scanStats?: ScanStat[]
  totalTickets?: number
  scannedTickets?: number
  // Propiedades adicionales que pueden venir del backend
  [key: string]: any
}

// Tipo de ticket - CORREGIDO
export interface TicketType {
  id: UUID
  event_id: UUID
  name: string
  price: number | string // Puede venir como string del backend
  quantity: number
  available: number
  created_at: ISOString
  updated_at: ISOString
  event?: Event
  tickets?: Ticket[]
  // Propiedades adicionales
  [key: string]: any
}

// Ticket - CORREGIDO
export interface Ticket {
  id: UUID
  event_id: UUID
  ticket_type_id: UUID
  qr_token: string
  status: TicketStatus
  scanned_at?: ISOString | null
  scanned_by?: string | null
  created_at: ISOString
  updated_at: ISOString
  event?: Event
  ticketType?: TicketType
  scanLogs?: ScanLog[]
  // Propiedades adicionales
  [key: string]: any
}

// Log de escaneo - CORREGIDO
export interface ScanLog {
  id: UUID
  ticket_id?: UUID | null
  event_id: UUID
  scan_result: ScanResult
  scanner_info: {
    user_agent?: string
    ip_address?: string
    scanner_user?: string
    device_info?: string
    location?: string
    // Permitir propiedades adicionales
    [key: string]: any
  }
  timestamp: ISOString
  ticket?: Ticket
  event?: Event
  // Propiedades adicionales
  [key: string]: any
}

// DTOs para formularios - FLEXIBLES
export interface CreateEventDto {
  name: string
  description?: string
  date: string
  location?: string
  ticketTypes?: CreateTicketTypeDto[]
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  status?: EventStatus
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface CreateTicketTypeDto {
  eventId: UUID
  name: string
  price?: number
  quantity: number
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface UpdateTicketTypeDto extends Partial<Omit<CreateTicketTypeDto, 'eventId'>> {
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface GenerateTicketDto {
  eventId: UUID
  ticketTypeId: UUID
  quantity?: number
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface BulkGenerateTicketDto {
  eventId: UUID
  ticketRequests: Array<{
    ticketTypeId: UUID
    quantity: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }>
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface ValidateQRDto {
  qrToken: string
  eventId: UUID
  scannerInfo?: {
    user?: string
    device?: string
    location?: string
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Respuestas específicas de API - FLEXIBLES
export interface TicketWithQR {
  ticket: Ticket
  qrCode: string
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface GenerateTicketResponse {
  tickets: Ticket[]
  qrCodes: Array<{
    ticketId: UUID
    ticketType?: string
    qrCode: string
    token: string
    // Propiedades adicionales permitidas
    [key: string]: any
  }>
  event: {
    id: UUID
    name: string
    date: string
    location?: string
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  ticketType?: {
    id: UUID
    name: string
    price: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  summary?: Array<{
    ticketType: string
    quantity: number
    price: number
    total: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }>
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface QRValidationResponse {
  scanResult: ScanResult
  displayMessage: string
  ticketInfo?: {
    id: UUID
    event: {
      name: string
      date: string
      location?: string
      // Propiedades adicionales permitidas
      [key: string]: any
    }
    ticketType: {
      name: string
      price: number
      // Propiedades adicionales permitidas
      [key: string]: any
    }
    scannedAt?: string
    scannedBy?: string
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  simulation?: boolean
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Estadísticas del dashboard - FLEXIBLE
export interface EventDashboard {
  event: Event
  ticketTypes: TicketType[]
  stats: {
    tickets: TicketStat[]
    scans: ScanStat[]
    scansByHour?: Array<{
      hour: string
      count: number
      // Propiedades adicionales permitidas
      [key: string]: any
    }>
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  recentActivity: ScanLog[]
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Filtros y parámetros de consulta - FLEXIBLES
export interface EventFilters {
  status?: EventStatus
  search?: string
  limit?: number
  offset?: number
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface TicketFilters {
  status?: TicketStatus
  ticketTypeId?: UUID
  limit?: number
  offset?: number
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface ScanLogFilters {
  result?: ScanResult
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Estados de UI - FLEXIBLES
export interface LoadingState {
  isLoading: boolean
  error: string | null
  // Propiedades adicionales permitidas
  [key: string]: any
}

export interface PaginationState {
  currentPage: number
  totalPages: number
  limit: number
  total: number
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Configuración del scanner QR - FLEXIBLE
export interface QRScannerConfig {
  fps: number
  qrbox: {
    width: number
    height: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  aspectRatio?: number
  disableFlip?: boolean
  videoConstraints?: {
    facingMode: 'user' | 'environment'
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Configuración del sistema - FLEXIBLE
export interface SystemConfig {
  apiUrl: string
  environment: 'development' | 'production'
  version: string
  features: {
    qrScanner: boolean
    bulkGeneration: boolean
    statistics: boolean
    realTimeUpdates: boolean
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Temas y personalización - FLEXIBLE
export interface ThemeConfig {
  mode: 'light' | 'dark'
  primaryColor: string
  accentColor: string
  companyName: string
  logo?: string
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Notificaciones - FLEXIBLE
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Preferencias del usuario - FLEXIBLE
export interface UserPreferences {
  theme: ThemeConfig
  notifications: {
    enabled: boolean
    email: boolean
    push: boolean
    sound: boolean
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  scanner: QRScannerConfig
  pagination: {
    defaultLimit: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  language: 'es' | 'en'
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Métricas y analytics - FLEXIBLE
export interface EventMetrics {
  totalEvents: number
  activeEvents: number
  totalTickets: number
  scannedTickets: number
  scanRate: number
  revenueGenerated: number
  popularTicketTypes: Array<{
    name: string
    sold: number
    revenue: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }>
  scansByHour: Array<{
    hour: string
    scans: number
    // Propiedades adicionales permitidas
    [key: string]: any
  }>
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Exportación de datos - FLEXIBLE
export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'pdf'
  fields: string[]
  dateRange?: {
    start: string
    end: string
    // Propiedades adicionales permitidas
    [key: string]: any
  }
  filters?: Record<string, any>
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Webhooks y integraciones - FLEXIBLE
export interface WebhookEvent {
  event: 'ticket.generated' | 'ticket.scanned' | 'event.created' | 'event.updated'
  data: any
  timestamp: string
  signature: string
  // Propiedades adicionales permitidas
  [key: string]: any
}

// Tipos de utilidad más flexibles
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Tipo genérico para respuestas del servidor
export type ServerResponse<T = any> = {
  success?: boolean
  message?: string
  data?: T
  error?: string
  errors?: any[]
  [key: string]: any
}

// Enums para constantes (opcionales - TypeScript los maneja bien)
export enum EventStatusEnum {
  DRAFT = 'draft',
  ACTIVE = 'active',
  FINISHED = 'finished'
}

export enum TicketStatusEnum {
  GENERATED = 'generated',
  SCANNED = 'scanned',
  EXPIRED = 'expired'
}

export enum ScanResultEnum {
  VALID = 'valid',
  USED = 'used',
  INVALID = 'invalid',
  WRONG_EVENT = 'wrong_event'
}
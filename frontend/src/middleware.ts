import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Solo aplicar para rutas de API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Crear la URL de destino
    const ngrokUrl = 'https://237af844b109.ngrok-free.app'
    const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, ngrokUrl)
    
    // Crear headers para ngrok
    const headers = new Headers(request.headers)
    headers.set('ngrok-skip-browser-warning', 'true')
    headers.set('Accept', 'application/json')
    headers.set('User-Agent', 'ProduccionesSaavedra/1.0')
    
    // Log para debug
    console.log('🔄 Proxy request:', {
      original: request.nextUrl.pathname,
      target: targetUrl.toString(),
      method: request.method
    })
    
    // Hacer la request al backend ngrok
    return fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
    })
    .then(async (response) => {
      const text = await response.text()
      
      // Verificar que no sea HTML (página de advertencia de ngrok)
      if (text.includes('<!DOCTYPE')) {
        console.error('❌ Received HTML from ngrok instead of JSON')
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'Error: Recibiendo página de ngrok en lugar de API'
          }),
          { 
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Devolver la respuesta con headers CORS
      return new NextResponse(text, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    })
    .catch((error) => {
      console.error('❌ Proxy error:', error)
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Error de conexión con el backend'
        }),
        { 
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    })
  }
  
  // Para otras rutas, continuar normalmente
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
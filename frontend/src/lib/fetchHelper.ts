// frontend/src/lib/fetchHelper.ts
export const safeFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'ProduccionesSaavedra/1.0',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    })
    
    const text = await response.text()
    console.log(`📡 Response from ${url}:`, text.substring(0, 100))
    
    // Verificar que no sea HTML
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<HTML')) {
      console.error('❌ Received HTML instead of JSON from:', url)
      throw new Error(`Server returned HTML page instead of JSON API response. URL: ${url}`)
    }
    
    // Verificar que no esté vacío
    if (!text.trim()) {
      throw new Error('Empty response from server')
    }
    
    // Intentar parsear JSON
    try {
      const data = JSON.parse(text)
      return {
        ok: response.ok,
        status: response.status,
        data: data
      }
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError)
      console.error('❌ Response text:', text)
      throw new Error(`Invalid JSON response from server: ${parseError}`)
    }
    
  } catch (error) {
    console.error('❌ Fetch error for', url, ':', error)
    throw error
  }
}
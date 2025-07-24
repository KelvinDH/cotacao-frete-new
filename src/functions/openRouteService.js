const OPENROUTESERVICE_API_KEY = env.get("OPENROUTESERVICE_API_KEY");

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Função para geocodificar endereços (obter coordenadas)
async function geocodeLocation(city, state) {
  const query = encodeURIComponent(`${city}, ${state}, Brazil`);
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTESERVICE_API_KEY}&text=${query}&boundary.country=BR&size=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      return {
        lat: coords[1],
        lon: coords[0],
        name: data.features[0].properties.label
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Geocoding error for ${city}, ${state}:`, error);
    return null;
  }
}

// Função para calcular rota
async function calculateRoute(originCoords, destinationCoords) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car`;
  
  const body = {
    coordinates: [
      [originCoords.lon, originCoords.lat],
      [destinationCoords.lon, destinationCoords.lat]
    ],
    format: "geojson",
    instructions: true
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTESERVICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Route calculation failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const route = data.features[0];
      const distance = route.properties.segments[0].distance; // em metros
      const duration = route.properties.segments[0].duration; // em segundos
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // [lat, lon]
      
      return {
        distance: Math.round(distance / 1000), // converte para km
        duration: Math.round(duration / 60), // converte para minutos
        coordinates: coordinates,
        instructions: route.properties.segments[0].steps || []
      };
    }
    
    return null;
  } catch (error) {
    console.error('Route calculation error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENROUTESERVICE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Chave da API OpenRouteService não configurada' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { action, originCity, originState, destinationCity, destinationState } = await req.json();

    if (action === 'calculate-route') {
      if (!originCity || !originState || !destinationCity || !destinationState) {
        return new Response(
          JSON.stringify({ error: 'Todos os campos são obrigatórios: originCity, originState, destinationCity, destinationState' }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Geocodificar origem e destino
      const [originCoords, destinationCoords] = await Promise.all([
        geocodeLocation(originCity, originState),
        geocodeLocation(destinationCity, destinationState)
      ]);

      if (!originCoords) {
        return new Response(
          JSON.stringify({ error: `Não foi possível encontrar coordenadas para: ${originCity}, ${originState}` }), 
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!destinationCoords) {
        return new Response(
          JSON.stringify({ error: `Não foi possível encontrar coordenadas para: ${destinationCity}, ${destinationState}` }), 
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Calcular rota
      const route = await calculateRoute(originCoords, destinationCoords);

      if (!route) {
        return new Response(
          JSON.stringify({ error: 'Não foi possível calcular a rota entre os pontos especificados' }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const result = {
        origin: {
          city: originCity,
          state: originState,
          coordinates: [originCoords.lat, originCoords.lon],
          name: originCoords.name
        },
        destination: {
          city: destinationCity,
          state: destinationState,
          coordinates: [destinationCoords.lat, destinationCoords.lon],
          name: destinationCoords.name
        },
        route: {
          distance: route.distance,
          duration: route.duration,
          coordinates: route.coordinates,
          instructions: route.instructions
        }
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ error: 'Ação não reconhecida. Use "calculate-route"' }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("OpenRouteService API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { originCity, originState, destinationCity, destinationState } = await req.json();
    const apiKey = env.get("OPENROUTESERVICE_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Chave da API não configurada no servidor.' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const geocode = async (city, state) => {
      const query = encodeURIComponent(`${city}, ${state}, Brazil`);
      const url = `https://api.openrouteservice.org/geocode/search?text=${query}&boundary.country=BR&size=1`;
      
      const response = await fetch(url, { 
        headers: { 'Authorization': apiKey } 
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].geometry.coordinates;
      }
      return null;
    };

    const [originCoords, destinationCoords] = await Promise.all([
      geocode(originCity, originState),
      geocode(destinationCity, destinationState)
    ]);

    if (!originCoords || !destinationCoords) {
      return new Response(JSON.stringify({ error: 'Coordenadas não encontradas.' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const routeUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${originCoords[0]},${originCoords[1]}&end=${destinationCoords[0]},${destinationCoords[1]}`;
    
    const routeResponse = await fetch(routeUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!routeResponse.ok) {
      return new Response(JSON.stringify({ error: 'Erro na API de rotas.' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const routeData = await routeResponse.json();

    if (!routeData.features || routeData.features.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma rota encontrada.' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const route = routeData.features[0];
    const summary = route.summary || (route.properties && route.properties.summary) || (route.properties && route.properties.segments && route.properties.segments[0]);
    
    if (!summary) {
      return new Response(JSON.stringify({ error: 'Dados de resumo não encontrados.' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const geometry = route.geometry.coordinates;

    const result = {
      origin: { coordinates: [originCoords[1], originCoords[0]] },
      destination: { coordinates: [destinationCoords[1], destinationCoords[0]] },
      route: {
        distance: Math.round(summary.distance / 1000),
        duration: Math.round(summary.duration / 60),
        path: geometry.map(coord => [coord[1], coord[0]])
      }
    };
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno do servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
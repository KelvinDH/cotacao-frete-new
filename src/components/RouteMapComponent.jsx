import React, { useEffect, useRef } from 'react';

export default function RouteMapComponent({
  origin, // [lat, lon]
  destination, // [lat, lon]
  route, // ✅ AGORA CONTÉM A GEOMETRIA
  height = '400px'
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  if (!origin || !destination) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="font-medium">Mapa da Rota</p>
          <p className="text-sm">Selecione origem e destino para visualizar</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      if (!window.L) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        
        return new Promise((resolve) => {
          script.onload = () => {
            delete window.L.Icon.Default.prototype._getIconUrl;
            window.L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
            resolve();
          };
          document.head.appendChild(script);
        });
      }
    };

    const initMap = async () => {
      await loadLeaflet();

      if (!mapRef.current) return;
      if (mapInstanceRef.current) { // Limpa o mapa anterior para redesenhar
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = window.L;
      const map = L.map(mapRef.current).setView(origin, 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Marcadores de Origem e Destino
      L.marker(origin).addTo(map).bindPopup('<b>🚀 Origem</b>');
      L.marker(destination).addTo(map).bindPopup('<b>🎯 Destino</b>');

      // ✅ LÓGICA PARA DESENHAR A ROTA REAL
      if (route && route.geometry && route.geometry.length > 0) {
        const routeLine = L.polyline(route.geometry, {
          color: '#3b82f6', // Azul
          weight: 5,
          opacity: 0.7
        }).addTo(map);
        
        // Ajusta o zoom para mostrar a rota inteira
        map.fitBounds(routeLine.getBounds().pad(0.1));
      } else {
        // Fallback: se não tiver geometria, mostra uma linha reta e ajusta o zoom pelos marcadores
        const group = L.featureGroup([L.marker(origin), L.marker(destination)]);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [origin, destination, route]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-sm">
      <div
        ref={mapRef}
        style={{ width: '100%', height, minHeight: '300px' }}
        className="bg-gray-100"
      />
      
      {route && (
        <div className="absolute top-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-lg border z-[1000]">
          <div className="text-sm font-medium text-gray-800">
            <div className="flex items-center mb-1">
              <span className="text-blue-600 mr-2">📏</span>
              <span>{route.distance} km</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">⏱️</span>
              <span>{route.duration} min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Script para criar e popular o banco de dados inicial
export const setupDatabase = (db) => {
  console.log('🔧 Configurando banco de dados...');

  // Criar tabela carriers
  db.run(`CREATE TABLE IF NOT EXISTS carriers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('paletizados', 'bag')),
    active BOOLEAN DEFAULT 1,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Criar tabela truck_types  
  db.run(`CREATE TABLE IF NOT EXISTS truck_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity REAL NOT NULL,
    baseRate REAL NOT NULL,
    modality TEXT NOT NULL CHECK(modality IN ('paletizados', 'bag')),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Verificar se já existem dados antes de inserir
  db.get("SELECT COUNT(*) as count FROM carriers", (err, row) => {
    if (!err && row.count === 0) {
      // Inserir transportadoras iniciais
      const carriers = [
        { name: 'Transportes ABC Ltda', type: 'paletizados', active: 1 },
        { name: 'Logística XYZ Express', type: 'bag', active: 1 }
      ];

      carriers.forEach(carrier => {
        db.run(
          "INSERT INTO carriers (name, type, active) VALUES (?, ?, ?)",
          [carrier.name, carrier.type, carrier.active],
          function(err) {
            if (err) {
              console.error('❌ Erro ao inserir carrier:', err);
            } else {
              console.log(`✅ Transportadora criada: ${carrier.name}`);
            }
          }
        );
      });
    }
  });

  db.get("SELECT COUNT(*) as count FROM truck_types", (err, row) => {
    if (!err && row.count === 0) {
      // Inserir tipos de caminhão iniciais
      const truckTypes = [
        { name: 'Truck Paletizado Grande', capacity: 15.0, baseRate: 3.50, modality: 'paletizados' },
        { name: 'Truck BAG Médio', capacity: 12.0, baseRate: 3.20, modality: 'bag' }
      ];

      truckTypes.forEach(truck => {
        db.run(
          "INSERT INTO truck_types (name, capacity, baseRate, modality) VALUES (?, ?, ?, ?)",
          [truck.name, truck.capacity, truck.baseRate, truck.modality],
          function(err) {
            if (err) {
              console.error('❌ Erro ao inserir truck type:', err);
            } else {
              console.log(`✅ Tipo de caminhão criado: ${truck.name}`);
            }
          }
        );
      });
    }
  });

  console.log('✅ Configuração do banco concluída');
};
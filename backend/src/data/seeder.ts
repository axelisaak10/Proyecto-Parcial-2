import bcrypt from 'bcryptjs';
import type { DatabaseSync } from 'node:sqlite';

interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
}

const INITIAL_TOYS: SeedProduct[] = [
  {
    sku: 'SKU-CON-001',
    name: 'Nave Espacial Galaxia 1200 Piezas',
    description:
      'Set de construcción espacial con cabina abatible, propulsores articulados y 3 figuras de astronauta.',
    category: 'Construcción',
    price: 1490.0,
    stock: 28,
  },
  {
    sku: 'SKU-FIG-002',
    name: 'Robot Mecha Articulado Titan-X',
    description:
      'Figura coleccionable de 28 cm con más de 24 puntos de articulación y accesorios luminosos.',
    category: 'Muñecos y Figuras',
    price: 890.0,
    stock: 42,
  },
  {
    sku: 'SKU-MES-003',
    name: 'Aventura en la Isla del Tesoro',
    description:
      'Juego de mesa familiar de estrategia y exploración para 2 a 6 jugadores con tablero modular.',
    category: 'Juegos de Mesa',
    price: 650.0,
    stock: 6,
  },
  {
    sku: 'SKU-VEH-004',
    name: 'Auto Todoterreno 4x4 Radio Control',
    description:
      'Vehículo RC todo terreno escala 1:14 con suspensión independiente y batería recargable USB-C.',
    category: 'Vehículos RC',
    price: 1890.0,
    stock: 15,
  },
  {
    sku: 'SKU-EDU-005',
    name: 'Kit Laboratorio de Robótica Solar',
    description:
      'Juego educativo STEM 12-en-1 impulsado por panel solar para ensamblar robots y mecanismos reales.',
    category: 'Educativos STEM',
    price: 1190.0,
    stock: 34,
  },
  {
    sku: 'SKU-PEL-006',
    name: 'Oso Cósmico Ultrasuave 45cm',
    description:
      'Peluche hipoalergénico de felpa aterciopelada con detalles bordados y capa estelar removible.',
    category: 'Peluches',
    price: 490.0,
    stock: 8,
  },
  {
    sku: 'SKU-CON-007',
    name: 'Castillo Medieval de Bloques Magnéticos',
    description:
      'Set de 110 piezas translúcidas magnéticas para construir torres, puentes levadizos y fortalezas.',
    category: 'Construcción',
    price: 1650.0,
    stock: 19,
  },
  {
    sku: 'SKU-AIR-008',
    name: 'Scooter Plegable con Luces LED',
    description:
      'Patineta infantil de 3 ruedas estables con manubrio ajustable y ruedas iluminadas por movimiento.',
    category: 'Aire Libre',
    price: 1290.0,
    stock: 25,
  },
];

export function seedDatabase(db: DatabaseSync): void {
  const roleEpoch = '2026-01-01T00:00:00.000Z';
  const insertRole = db.prepare('INSERT OR IGNORE INTO Roles (id, name, created_at) VALUES (?, ?, ?)');
  insertRole.run(1, 'Admin', roleEpoch);
  insertRole.run(2, 'Customer', roleEpoch);

  const now = new Date().toISOString();

  // 1. Seed Admin FIRST so Admin always retains id = 1
  const existingAdmin = db
    .prepare('SELECT id FROM Users WHERE email = ?')
    .get('admin@toystore.com') as { id: number } | undefined;

  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('Admin123!', 10);
    const adminInsert = db
      .prepare(
        'INSERT INTO Users (email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run('admin@toystore.com', adminHash, 1, 1, now, now);

    db.prepare(
      'INSERT INTO Profiles (user_id, first_name, last_name, city, country, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(Number(adminInsert.lastInsertRowid), 'Admin', 'ToyStore', 'Ciudad de México', 'México', now);
  }

  // 2. Seed Demo Customer
  const existingCustomer = db
    .prepare('SELECT id FROM Users WHERE email = ?')
    .get('customer@toystore.com') as { id: number } | undefined;

  if (!existingCustomer) {
    const customerHash = bcrypt.hashSync('Customer123!', 10);
    const custInsert = db
      .prepare(
        'INSERT INTO Users (email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run('customer@toystore.com', customerHash, 2, 1, now, now);

    db.prepare(
      'INSERT INTO Profiles (user_id, first_name, last_name, phone, city, country, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      Number(custInsert.lastInsertRowid),
      'Carlos',
      'Mendoza',
      '+52 55 1234 5678',
      'Monterrey',
      'México',
      now
    );
  }

  // 3. Seed ToyStore Catalog Products
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM Products').get() as { count: number };
  if (countRow.count === 0) {
    const insertProduct = db.prepare(
      `INSERT INTO Products (sku, name, description, category, price, stock, image_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)`
    );

    for (const toy of INITIAL_TOYS) {
      insertProduct.run(
        toy.sku,
        toy.name,
        toy.description,
        toy.category,
        toy.price,
        toy.stock,
        now,
        now
      );
    }
  }
}

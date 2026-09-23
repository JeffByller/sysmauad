import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool, query, initDb } from './db';
import { 
  SystemUser, 
  Client, 
  ChemicalStockItem, 
  GarmentProcessCatalogItem, 
  Passador, 
  Order, 
  InsumoEntry, 
  Supplier, 
  ReceitaLavado 
} from './types';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SUPER_ADMIN = {
  id: 'super-admin-root',
  name: 'Super Admin',
  username: 'superadmin',
  passwords: ['m51IqWR48pYNeg', 'admin123', 'mauad2026'],
  role: 'admin' as const,
  allowedMenus: ['dashboard', 'orders', 'stock', 'clients', 'garment-catalog', 'finance', 'passador-report', 'users', 'passador-mobile', 'client-portal'],
  active: true
};

export function normalizeLogin(val: string): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
}

// Mappers from SQL rows to CamelCase frontend models
function mapUser(row: any): SystemUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    password: row.password,
    phone: row.phone || undefined,
    role: row.role,
    allowedMenus: Array.isArray(row.allowed_menus) ? row.allowed_menus : [],
    active: Boolean(row.active)
  };
}

function mapClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name || undefined,
    phone: row.phone,
    cnpjCpf: row.cnpj_cpf || undefined,
    address: row.address || undefined,
    totalOrders: Number(row.total_orders || 0),
    portalStatus: row.portal_status || 'ativo',
    passwordHash: row.password_hash || undefined
  };
}

function mapStock(row: any): ChemicalStockItem {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    currentStock: Number(row.current_stock || 0),
    minStockAlert: Number(row.min_stock_alert || 0),
    defaultDosagePerKg: Number(row.default_dosage_per_kg || 0),
    category: row.category,
    notes: row.notes || undefined
  };
}

function mapGarment(row: any): GarmentProcessCatalogItem {
  return {
    id: row.id,
    clothingType: row.clothing_type,
    processName: row.process_name,
    unitPrice: Number(row.unit_price || 0),
    defaultRefWeightGrams: Number(row.default_ref_weight_grams || 0),
    category: row.category || undefined,
    notes: row.notes || undefined
  };
}

function mapPassador(row: any): Passador {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    totalPiecesIroned: Number(row.total_pieces_ironed || 0),
    createdAt: row.created_at,
    active: Boolean(row.active)
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    osNumber: row.os_number,
    corteOs: row.corte_os || (Array.isArray(row.items) && row.items[0]?.corteOs) || undefined,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone || undefined,
    clientAddress: row.client_address || undefined,
    createdAt: row.created_at,
    operatorName: row.operator_name || 'Operador',
    refPieceWeightGrams: Number(row.ref_piece_weight_grams || 0),
    totalWeightKg: Number(row.total_weight_kg || 0),
    estimatedPieceCount: Number(row.estimated_piece_count || 0),
    totalServiceValue: Number(row.total_service_value || 0),
    paymentStatus: row.payment_status || 'aberto',
    paymentMethod: row.payment_method || undefined,
    discountAmount: Number(row.discount_amount || 0),
    items: Array.isArray(row.items) ? row.items : [],
    chemicalRecipe: Array.isArray(row.chemical_recipe) ? row.chemical_recipe : [],
    status: row.status || 'recebido',
    totalIronedPieces: Number(row.total_ironed_pieces || 0),
    ironingLogs: Array.isArray(row.ironing_logs) ? row.ironing_logs : [],
    history: Array.isArray(row.history) ? row.history : [],
    notes: row.notes || undefined
  };
}

function mapSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    contactPerson: row.contact_person || undefined,
    notes: row.notes || undefined
  };
}

function mapInsumoEntry(row: any): InsumoEntry {
  return {
    id: row.id,
    stockItemId: row.stock_item_id,
    productName: row.product_name,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    quantity: Number(row.quantity || 0),
    unit: row.unit || 'kg',
    unitPrice: Number(row.unit_price || 0),
    totalValue: Number(row.total_value || 0),
    enteredAt: row.entered_at,
    operatorName: row.operator_name,
    invoiceRef: row.invoice_ref || undefined
  };
}

function mapReceita(row: any): ReceitaLavado {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    fases: Array.isArray(row.fases) ? row.fases : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


// ----------------------------------------------------
// HEALTHCHECK
// ----------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT NOW()');
    res.json({
      status: 'ok',
      service: 'Sysmauad PostgreSQL API',
      dbConnected: true,
      timestamp: dbCheck.rows[0].now
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      service: 'Sysmauad API',
      dbConnected: false,
      error: err.message
    });
  }
});

// ----------------------------------------------------
// 1. USUÁRIOS & AUTENTICAÇÃO
// ----------------------------------------------------
app.get('/users', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.users ORDER BY created_at ASC');
    res.json(result.rows.map(mapUser));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, username, password, phone, role, allowedMenus, active } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nome, usuário e senha são obrigatórios.' });
    }

    const cleanUser = normalizeLogin(username);
    const check = await query('SELECT id FROM sysmauad.users WHERE LOWER(username) = LOWER($1)', [cleanUser]);
    if (check.rows.length > 0 || cleanUser === 'superadmin') {
      return res.status(400).json({ success: false, message: 'Já existe um usuário com este login no sistema.' });
    }

    const id = `usr-${Date.now()}`;
    const menus = Array.isArray(allowedMenus) && allowedMenus.length > 0
      ? allowedMenus
      : ['dashboard', 'orders', 'stock', 'clients', 'garment-catalog'];
    const isActive = active !== undefined ? Boolean(active) : true;

    const insert = await query(
      `INSERT INTO sysmauad.users (id, name, username, password, phone, role, allowed_menus, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name.trim(), cleanUser, String(password).trim(), phone ? String(phone).trim() : null, role || 'operador', JSON.stringify(menus), isActive]
    );

    res.status(201).json({ success: true, user: mapUser(insert.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, username, phone, role, allowedMenus, active, password } = req.body;

    if (id === 'super-admin-root') {
      return res.status(400).json({ success: false, message: 'Não é permitido modificar o Super Admin.' });
    }

    const current = await query('SELECT * FROM sysmauad.users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    let cleanUsername = current.rows[0].username;
    if (username) {
      cleanUsername = normalizeLogin(username);
      const conflict = await query('SELECT id FROM sysmauad.users WHERE id != $1 AND LOWER(username) = LOWER($2)', [id, cleanUsername]);
      if (conflict.rows.length > 0 || cleanUsername === 'superadmin') {
        return res.status(400).json({ success: false, message: 'Este login já está em uso por outro usuário.' });
      }
    }

    const updatedName = name ? name.trim() : current.rows[0].name;
    const updatedPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : current.rows[0].phone;
    const updatedRole = role || current.rows[0].role;
    const updatedMenus = Array.isArray(allowedMenus) ? allowedMenus : current.rows[0].allowed_menus;
    const updatedActive = active !== undefined ? Boolean(active) : current.rows[0].active;
    const updatedPass = password && String(password).trim() ? String(password).trim() : current.rows[0].password;

    const result = await query(
      `UPDATE sysmauad.users 
       SET name = $1, username = $2, phone = $3, role = $4, allowed_menus = $5, active = $6, password = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [updatedName, cleanUsername, updatedPhone, updatedRole, JSON.stringify(updatedMenus), updatedActive, updatedPass, id]
    );

    res.json({ success: true, user: mapUser(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/users/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (id === 'super-admin-root') {
      return res.status(400).json({ success: false, message: 'Senha do Super Admin é protegida.' });
    }
    if (!password || !String(password).trim()) {
      return res.status(400).json({ success: false, message: 'Informe a nova senha.' });
    }

    const result = await query('UPDATE sysmauad.users SET password = $1, updated_at = NOW() WHERE id = $2', [String(password).trim(), id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    res.json({ success: true, message: 'Senha atualizada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === 'super-admin-root') {
      return res.status(400).json({ success: false, message: 'Não é permitido excluir o Super Admin.' });
    }
    const result = await query('DELETE FROM sysmauad.users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const rawUser = String(username || '').trim();
    const rawPass = String(password || '').trim();

    if (!rawUser || !rawPass) {
      return res.status(400).json({ success: false, message: 'Informe o usuário e a senha.' });
    }

    const normUser = normalizeLogin(rawUser);

    // 1. Super Admin
    if (normUser === 'superadmin' || normUser === 'admin') {
      if (SUPER_ADMIN.passwords.includes(rawPass)) {
        return res.json({
          success: true,
          user: {
            id: SUPER_ADMIN.id,
            name: SUPER_ADMIN.name,
            username: SUPER_ADMIN.username,
            role: SUPER_ADMIN.role,
            allowedMenus: SUPER_ADMIN.allowedMenus,
            active: SUPER_ADMIN.active
          }
        });
      }
    }

    // 2. Banco de Dados PostgreSQL
    const usersResult = await query('SELECT * FROM sysmauad.users');
    const users = usersResult.rows.map(mapUser);

    const found = users.find(u => {
      const uNorm = normalizeLogin(u.username);
      const uRaw = u.username.toLowerCase();
      const nameNorm = normalizeLogin(u.name);
      return uNorm === normUser || uRaw === rawUser.toLowerCase() || nameNorm === normUser;
    });

    if (!found) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado no sistema.' });
    }

    if (!found.active) {
      return res.status(403).json({ success: false, message: 'Este usuário está inativo.' });
    }

    const expectedPass = found.password || 'teste';
    if (rawPass !== expectedPass) {
      return res.status(401).json({ success: false, message: 'Senha incorreta.' });
    }

    res.json({ success: true, user: found });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 2. CLIENTES & CENTRAL DO ASSINANTE
// ----------------------------------------------------
app.get('/clients', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.clients ORDER BY name ASC');
    res.json(result.rows.map(mapClient));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/clients', async (req: Request, res: Response) => {
  try {
    const { name, companyName, phone, cnpjCpf, address, portalStatus, passwordHash } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios.' });
    }

    const id = `cli-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.clients (id, name, company_name, phone, cnpj_cpf, address, total_orders, portal_status, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
       RETURNING *`,
      [id, name.trim(), companyName || null, phone.trim(), cnpjCpf || null, address || null, portalStatus || 'ativo', passwordHash || null]
    );

    res.status(201).json(mapClient(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, companyName, phone, cnpjCpf, address, totalOrders, portalStatus, passwordHash } = req.body;

    const current = await query('SELECT * FROM sysmauad.clients WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const row = current.rows[0];
    const updated = await query(
      `UPDATE sysmauad.clients
       SET name = $1, company_name = $2, phone = $3, cnpj_cpf = $4, address = $5,
           total_orders = $6, portal_status = $7, password_hash = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        companyName !== undefined ? companyName : row.company_name,
        phone !== undefined ? phone.trim() : row.phone,
        cnpjCpf !== undefined ? cnpjCpf : row.cnpj_cpf,
        address !== undefined ? address : row.address,
        totalOrders !== undefined ? Number(totalOrders) : row.total_orders,
        portalStatus !== undefined ? portalStatus : row.portal_status,
        passwordHash !== undefined ? passwordHash : row.password_hash,
        id
      ]
    );

    res.json(mapClient(updated.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.clients WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE sysmauad.clients
       SET password_hash = NULL, portal_status = 'pendente', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(mapClient(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id/toggle-block', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await query('SELECT * FROM sysmauad.clients WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const c = current.rows[0];
    const isBlocked = c.portal_status === 'bloqueado';
    const newStatus = isBlocked ? (c.password_hash ? 'ativo' : 'pendente') : 'bloqueado';

    const result = await query(
      `UPDATE sysmauad.clients
       SET portal_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, id]
    );
    res.json(mapClient(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id/set-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rawPassword } = req.body;
    const passwordHash = `hash-${Buffer.from(String(rawPassword || '')).toString('base64')}`;

    const result = await query(
      `UPDATE sysmauad.clients
       SET password_hash = $1, portal_status = 'ativo', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [passwordHash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json({ success: true, client: mapClient(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Login do Assinante / Portal do Cliente
app.post('/client-auth/login', async (req: Request, res: Response) => {
  try {
    const { phoneOrCnpj } = req.body;
    const term = String(phoneOrCnpj || '').replace(/\D/g, '');
    if (!term) {
      return res.status(400).json({ success: false, message: 'Informe o Telefone ou CNPJ/CPF.' });
    }

    const result = await query('SELECT * FROM sysmauad.clients');
    const clients = result.rows.map(mapClient);

    const found = clients.find(c => {
      const pClean = (c.phone || '').replace(/\D/g, '');
      const dClean = (c.cnpjCpf || '').replace(/\D/g, '');
      return pClean.includes(term) || dClean.includes(term);
    });

    if (found) {
      return res.json({ success: true, client: found });
    }

    // Cria cliente de teste caso ainda não exista para facilitar testes
    const fallbackId = `cli-${Date.now()}`;
    const insert = await query(
      `INSERT INTO sysmauad.clients (id, name, company_name, phone, cnpj_cpf, address, total_orders, portal_status)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'ativo')
       RETURNING *`,
      [fallbackId, 'Cliente Cadastrado', 'CONFECÇÕES PARCEIRA', phoneOrCnpj, '12.345.678/0001-99', 'Surubim - PE']
    );

    res.json({ success: true, client: mapClient(insert.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 3. INSUMOS QUÍMICOS / ESTOQUE
// ----------------------------------------------------
app.get('/stock', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.stock_items ORDER BY name ASC');
    res.json(result.rows.map(mapStock));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/stock', async (req: Request, res: Response) => {
  try {
    const { name, unit, currentStock, minStockAlert, defaultDosagePerKg, category, notes } = req.body;
    const id = `stk-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.stock_items (id, name, unit, current_stock, min_stock_alert, default_dosage_per_kg, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name.trim(), unit || 'kg', Number(currentStock || 0), Number(minStockAlert || 0), Number(defaultDosagePerKg || 0), category || 'outros', notes || null]
    );
    res.status(201).json(mapStock(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, unit, currentStock, minStockAlert, defaultDosagePerKg, category, notes } = req.body;

    const current = await query('SELECT * FROM sysmauad.stock_items WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo não encontrado.' });
    }

    const row = current.rows[0];
    const result = await query(
      `UPDATE sysmauad.stock_items
       SET name = $1, unit = $2, current_stock = $3, min_stock_alert = $4, default_dosage_per_kg = $5,
           category = $6, notes = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        unit !== undefined ? unit : row.unit,
        currentStock !== undefined ? Number(currentStock) : row.current_stock,
        minStockAlert !== undefined ? Number(minStockAlert) : row.min_stock_alert,
        defaultDosagePerKg !== undefined ? Number(defaultDosagePerKg) : row.default_dosage_per_kg,
        category !== undefined ? category : row.category,
        notes !== undefined ? notes : row.notes,
        id
      ]
    );

    res.json(mapStock(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/stock/:id/quantity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const result = await query('UPDATE sysmauad.stock_items SET current_stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [Number(quantity), id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insumo não encontrado.' });
    res.json(mapStock(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.stock_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. TABELA DE PEÇAS & LAVAGEM (GARMENT CATALOG)
// ----------------------------------------------------
app.get('/garment-catalog', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.garment_catalog ORDER BY clothing_type ASC');
    res.json(result.rows.map(mapGarment));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/garment-catalog', async (req: Request, res: Response) => {
  try {
    const { clothingType, processName, unitPrice, defaultRefWeightGrams, category, notes } = req.body;
    const id = `gcat-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.garment_catalog (id, clothing_type, process_name, unit_price, default_ref_weight_grams, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, clothingType.trim(), processName.trim(), Number(unitPrice || 0), Number(defaultRefWeightGrams || 0), category || null, notes || null]
    );
    res.status(201).json(mapGarment(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/garment-catalog/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clothingType, processName, unitPrice, defaultRefWeightGrams, category, notes } = req.body;

    const current = await query('SELECT * FROM sysmauad.garment_catalog WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.garment_catalog
       SET clothing_type = $1, process_name = $2, unit_price = $3, default_ref_weight_grams = $4, category = $5, notes = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        clothingType !== undefined ? clothingType.trim() : row.clothing_type,
        processName !== undefined ? processName.trim() : row.process_name,
        unitPrice !== undefined ? Number(unitPrice) : row.unit_price,
        defaultRefWeightGrams !== undefined ? Number(defaultRefWeightGrams) : row.default_ref_weight_grams,
        category !== undefined ? category : row.category,
        notes !== undefined ? notes : row.notes,
        id
      ]
    );
    res.json(mapGarment(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/garment-catalog/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.garment_catalog WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. PASSADORES
// ----------------------------------------------------
app.get('/passadores', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.passadores ORDER BY name ASC');
    res.json(result.rows.map(mapPassador));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/passadores', async (req: Request, res: Response) => {
  try {
    const { id, name, phone, totalPiecesIroned, active } = req.body;
    const pId = id || `pas-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.passadores (id, name, phone, total_pieces_ironed, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
       RETURNING *`,
      [pId, name.trim(), phone || null, Number(totalPiecesIroned || 0), active !== undefined ? Boolean(active) : true]
    );
    res.status(201).json(mapPassador(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/passadores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, totalPiecesIroned, active } = req.body;
    const current = await query('SELECT * FROM sysmauad.passadores WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Passador não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.passadores 
       SET name = $1, phone = $2, total_pieces_ironed = $3, active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        phone !== undefined ? phone : row.phone,
        totalPiecesIroned !== undefined ? Number(totalPiecesIroned) : row.total_pieces_ironed,
        active !== undefined ? Boolean(active) : row.active,
        id
      ]
    );
    res.json(mapPassador(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/passadores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.passadores WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. PEDIDOS / ORDENS DE SERVIÇO (OS)
// ----------------------------------------------------
app.get('/orders', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
    res.json(result.rows.map(mapOrder));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders', async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    const id = orderData.id || `ord-${Date.now()}`;
    
    let osNumber = orderData.osNumber;
    if (!osNumber) {
      const countResult = await query('SELECT count(*) FROM sysmauad.orders');
      const seq = parseInt(countResult.rows[0].count, 10) + 1;
      osNumber = `OS-${String(seq).padStart(4, '0')}`;
    }

    const now = orderData.createdAt || new Date().toISOString();
    const history = Array.isArray(orderData.history) && orderData.history.length > 0
      ? orderData.history
      : [
          { timestamp: now, status: 'recebido', operator: orderData.operatorName || 'Operador', note: 'Entrada da ordem de serviço registrada.' }
        ];

    const corteOs = orderData.corteOs || (Array.isArray(orderData.items) && orderData.items[0]?.corteOs) || null;

    const result = await query(
      `INSERT INTO sysmauad.orders (
         id, os_number, corte_os, client_id, client_name, client_phone, client_address,
         created_at, operator_name, ref_piece_weight_grams, total_weight_kg,
         estimated_piece_count, total_service_value, payment_status, payment_method, discount_amount,
         items, chemical_recipe, status, total_ironed_pieces, ironing_logs, history, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING *`,
      [
        id,
        osNumber,
        corteOs,
        orderData.clientId,
        orderData.clientName,
        orderData.clientPhone || null,
        orderData.clientAddress || null,
        now,
        orderData.operatorName || 'Operador',
        Number(orderData.refPieceWeightGrams || 0),
        Number(orderData.totalWeightKg || 0),
        Number(orderData.estimatedPieceCount || 0),
        Number(orderData.totalServiceValue || 0),
        orderData.paymentStatus || 'aberto',
        orderData.paymentMethod || null,
        Number(orderData.discountAmount || 0),
        JSON.stringify(orderData.items || []),
        JSON.stringify(orderData.chemicalRecipe || []),
        'recebido',
        0,
        JSON.stringify([]),
        JSON.stringify(history),
        orderData.notes || null
      ]
    );

    // Atualiza contagem de pedidos do cliente
    if (orderData.clientId) {
      await query('UPDATE sysmauad.clients SET total_orders = total_orders + 1 WHERE id = $1', [orderData.clientId]);
    }

    res.status(201).json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.orders
       SET client_id = $1, client_name = $2, client_phone = $3, client_address = $4,
           operator_name = $5, ref_piece_weight_grams = $6, total_weight_kg = $7,
           estimated_piece_count = $8, total_service_value = $9, payment_status = $10,
           payment_method = $11, discount_amount = $12, items = $13, chemical_recipe = $14,
           status = $15, total_ironed_pieces = $16, ironing_logs = $17, history = $18,
           notes = $19, updated_at = NOW()
       WHERE id = $20
       RETURNING *`,
      [
        body.clientId !== undefined ? body.clientId : row.client_id,
        body.clientName !== undefined ? body.clientName : row.client_name,
        body.clientPhone !== undefined ? body.clientPhone : row.client_phone,
        body.clientAddress !== undefined ? body.clientAddress : row.client_address,
        body.operatorName !== undefined ? body.operatorName : row.operator_name,
        body.refPieceWeightGrams !== undefined ? Number(body.refPieceWeightGrams) : row.ref_piece_weight_grams,
        body.totalWeightKg !== undefined ? Number(body.totalWeightKg) : row.total_weight_kg,
        body.estimatedPieceCount !== undefined ? Number(body.estimatedPieceCount) : row.estimated_piece_count,
        body.totalServiceValue !== undefined ? Number(body.totalServiceValue) : row.total_service_value,
        body.paymentStatus !== undefined ? body.paymentStatus : row.payment_status,
        body.paymentMethod !== undefined ? body.paymentMethod : row.payment_method,
        body.discountAmount !== undefined ? Number(body.discountAmount) : row.discount_amount,
        body.items !== undefined ? JSON.stringify(body.items) : JSON.stringify(row.items),
        body.chemicalRecipe !== undefined ? JSON.stringify(body.chemicalRecipe) : JSON.stringify(row.chemical_recipe),
        body.status !== undefined ? body.status : row.status,
        body.totalIronedPieces !== undefined ? Number(body.totalIronedPieces) : row.total_ironed_pieces,
        body.ironingLogs !== undefined ? JSON.stringify(body.ironingLogs) : JSON.stringify(row.ironing_logs),
        body.history !== undefined ? JSON.stringify(body.history) : JSON.stringify(row.history),
        body.notes !== undefined ? body.notes : row.notes,
        id
      ]
    );

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, operatorName, note } = req.body;
    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const history = Array.isArray(row.history) ? row.history : [];
    history.push({
      timestamp: new Date().toISOString(),
      status,
      operator: operatorName || 'Operador',
      note: note || `Status alterado para ${status}`
    });

    const result = await query(
      `UPDATE sysmauad.orders SET status = $1, history = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, JSON.stringify(history), id]
    );

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders/:id/ironing', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { passadorId, passadorName, piecesIroned, count: bodyCount } = req.body;

    const count = Number(piecesIroned !== undefined ? piecesIroned : (bodyCount || 0));
    if (count <= 0) return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero.' });

    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const currentIroned = Number(row.total_ironed_pieces || 0);
    const estimated = Number(row.estimated_piece_count || 0);
    const newTotal = currentIroned + count;

    const logs = Array.isArray(row.ironing_logs) ? row.ironing_logs : [];
    const newLog = {
      id: `log-${Date.now()}`,
      orderId: id,
      osNumber: row.os_number,
      passadorId,
      passadorName,
      piecesIroned: count,
      timestamp: new Date().toISOString()
    };
    logs.push(newLog);

    const history = Array.isArray(row.history) ? row.history : [];
    history.push({
      timestamp: new Date().toISOString(),
      status: row.status,
      operator: passadorName,
      note: `Passadoria: +${count} peças passadas (Total: ${newTotal}/${estimated})`
    });

    const updated = await query(
      `UPDATE sysmauad.orders SET total_ironed_pieces = $1, ironing_logs = $2, history = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [newTotal, JSON.stringify(logs), JSON.stringify(history), id]
    );

    // Atualiza estatística do passador
    if (passadorId) {
      await query('UPDATE sysmauad.passadores SET total_pieces_ironed = total_pieces_ironed + $1 WHERE id = $2', [count, passadorId]);
    }

    res.json({ success: true, message: `Registradas ${count} peças para ${passadorName}!`, order: mapOrder(updated.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/orders/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { discountAmount, paymentMethod, operatorName } = req.body;

    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const history = Array.isArray(row.history) ? row.history : [];
    history.push({
      timestamp: new Date().toISOString(),
      status: row.status,
      operator: operatorName || 'Caixa',
      note: `Pagamento recebido (${paymentMethod || 'PIX'}). Desconto: R$ ${(Number(discountAmount || 0)).toFixed(2)}`
    });

    const result = await query(
      `UPDATE sysmauad.orders 
       SET payment_status = 'pago', payment_method = $1, discount_amount = $2, history = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [paymentMethod || 'Dinheiro', Number(discountAmount || 0), JSON.stringify(history), id]
    );

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.orders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. FORNECEDORES
// ----------------------------------------------------
app.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.suppliers ORDER BY name ASC');
    res.json(result.rows.map(mapSupplier));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const { name, cnpj, phone, email, contactPerson, notes } = req.body;
    const id = `sup-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.suppliers (id, name, cnpj, phone, email, contact_person, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name.trim(), cnpj || null, phone || null, email || null, contactPerson || null, notes || null]
    );
    res.status(201).json(mapSupplier(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cnpj, phone, email, contactPerson, notes } = req.body;
    const current = await query('SELECT * FROM sysmauad.suppliers WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.suppliers 
       SET name = $1, cnpj = $2, phone = $3, email = $4, contact_person = $5, notes = $6
       WHERE id = $7
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        cnpj !== undefined ? cnpj : row.cnpj,
        phone !== undefined ? phone : row.phone,
        email !== undefined ? email : row.email,
        contactPerson !== undefined ? contactPerson : row.contact_person,
        notes !== undefined ? notes : row.notes,
        id
      ]
    );
    res.json(mapSupplier(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.suppliers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. ENTRADAS DE INSUMOS (NOTAS / ESTOQUE)
// ----------------------------------------------------
app.get('/insumo-entries', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.insumo_entries ORDER BY created_at DESC');
    res.json(result.rows.map(mapInsumoEntry));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/insumo-entries', async (req: Request, res: Response) => {
  try {
    const entryData = req.body;
    const id = entryData.id || `ent-${Date.now()}`;
    const enteredAt = entryData.enteredAt || new Date().toISOString();
    const totalValue = Number(entryData.totalValue || (entryData.quantity * entryData.unitPrice) || 0);

    const result = await query(
      `INSERT INTO sysmauad.insumo_entries (
        id, stock_item_id, product_name, supplier_id, supplier_name,
        quantity, unit, unit_price, total_value, entered_at, operator_name, invoice_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        entryData.stockItemId,
        entryData.productName,
        entryData.supplierId,
        entryData.supplierName,
        Number(entryData.quantity || 0),
        entryData.unit || 'kg',
        Number(entryData.unitPrice || 0),
        totalValue,
        enteredAt,
        entryData.operatorName || 'Operador',
        entryData.invoiceRef || null
      ]
    );

    // Incrementa estoque automaticamente para o produto
    if (entryData.stockItemId && Number(entryData.quantity) > 0) {
      await query(
        'UPDATE sysmauad.stock_items SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
        [Number(entryData.quantity), entryData.stockItemId]
      );
    }

    res.status(201).json(mapInsumoEntry(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. RECEITAS DE LAVADO
// ----------------------------------------------------
app.get('/receitas-lavado', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.receitas_lavado ORDER BY name ASC');
    res.json(result.rows.map(mapReceita));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/receitas-lavado', async (req: Request, res: Response) => {
  try {
    const { name, description, fases } = req.body;
    const id = req.body.id || `rec-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await query(
      `INSERT INTO sysmauad.receitas_lavado (id, name, description, fases, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name.trim(), description || null, JSON.stringify(fases || []), now, now]
    );

    res.status(201).json(mapReceita(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/receitas-lavado/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, fases } = req.body;
    const current = await query('SELECT * FROM sysmauad.receitas_lavado WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Receita não encontrada.' });
    const row = current.rows[0];

    const now = new Date().toISOString();
    const result = await query(
      `UPDATE sysmauad.receitas_lavado
       SET name = $1, description = $2, fases = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        description !== undefined ? description : row.description,
        fases !== undefined ? JSON.stringify(fases) : JSON.stringify(row.fases),
        now,
        id
      ]
    );

    res.json(mapReceita(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/receitas-lavado/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.receitas_lavado WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR COM CONEXÃO POSTGRESQL
// ----------------------------------------------------
async function startServer() {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`[Sysmauad Backend API] Conectado ao PostgreSQL e ouvindo na porta ${port}`);
    });
  } catch (err) {
    console.error('[Sysmauad Backend API] Falha crítica ao inicializar banco de dados:', err);
    process.exit(1);
  }
}

startServer();

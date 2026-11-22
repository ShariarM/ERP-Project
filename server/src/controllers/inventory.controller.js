import pool from '../config/db.js';
import { notifyUsersByRole } from '../services/notification.service.js';

export async function getProducts(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, sku, name, category, unit, cost_price, selling_price,
              stock_quantity, reorder_level, is_active, created_at
       FROM products WHERE is_active = 1 ORDER BY name`
    );
    res.json(rows);
  } catch (error) {
    console.error('getProducts:', error);
    res.status(500).json({ error: 'Could not load products' });
  }
}

export async function getLowStock(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, sku, name, category, unit, stock_quantity, reorder_level
       FROM products
       WHERE is_active = 1 AND stock_quantity <= reorder_level
       ORDER BY stock_quantity ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('getLowStock:', error);
    res.status(500).json({ error: 'Could not load low-stock alerts' });
  }
}

export async function createProduct(req, res) {
  try {
    const { sku, name, category, unit, cost_price, selling_price, reorder_level } = req.body;

    const costPrice = Number(cost_price ?? 0);
    const sellingPrice = Number(selling_price ?? 0);
    const reorderLevel = Number(reorder_level ?? 5);

    if (typeof sku !== 'string' || !sku.trim() ||
        typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'SKU and product name are required' });
    }

    if (![costPrice, sellingPrice, reorderLevel].every(Number.isFinite) ||
        costPrice < 0 || sellingPrice < 0 || reorderLevel < 0) {
      return res.status(400).json({
        error: 'Prices and reorder level must be valid non-negative numbers'
      });
    }
    const [result] = await pool.query(
      `INSERT INTO products
       (sku, name, category, unit, cost_price, selling_price, reorder_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sku.trim(), name.trim(), category || null, unit || 'pcs',
        costPrice, sellingPrice, reorderLevel
      ]
    );

    try {
      await notifyUsersByRole({
        roles: ['admin'],
        excludeUserId: req.user.id,
        eventType: 'inventory.product_created',
        title: 'New Product Added',
        message: `Product ${name.trim()} (${sku.trim()}) was added to inventory.`,
        link: '/pages/inventory/'
      });
    } catch (notificationError) {
      console.error('Product notification failed:', notificationError);
    }

    res.status(201).json({ message: 'Product created successfully', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This SKU already exists' });
    }
    console.error('createProduct:', error);
    res.status(500).json({ error: 'Could not create product' });
  }
}

export async function addStockMovement(req, res) {
  const { product_id, movement_type, quantity, note } = req.body;
  const amount = Number(quantity);

  if (!product_id || !['IN', 'OUT', 'ADJUSTMENT'].includes(movement_type) ||
      !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid product, movement type and positive quantity' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      'SELECT id, name, sku, stock_quantity, reorder_level FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
      [product_id]
    );

    if (!products.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const current = Number(products[0].stock_quantity);
    let next = current;

    if (movement_type === 'IN') next = current + amount;
    if (movement_type === 'OUT') next = current - amount;
    if (movement_type === 'ADJUSTMENT') next = amount;

    if (next < 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient stock for this operation' });
    }

    await connection.query(
      'UPDATE products SET stock_quantity = ? WHERE id = ?',
      [next, product_id]
    );

    await connection.query(
      `INSERT INTO stock_movements
       (product_id, movement_type, quantity, stock_after, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, movement_type, amount, next, note || null, req.user.id]
    );

    await connection.commit();

    const crossedReorderLevel =
      Number(products[0].stock_quantity) > Number(products[0].reorder_level) &&
      next <= Number(products[0].reorder_level);

    try {
      await notifyUsersByRole({
        roles: ['admin'],
        excludeUserId: req.user.id,
        eventType: crossedReorderLevel ? 'inventory.low_stock' : 'inventory.stock_updated',
        title: crossedReorderLevel ? 'Low Stock Alert' : 'Stock Updated',
        message: crossedReorderLevel
          ? `${products[0].name} (${products[0].sku}) has reached its reorder level. Current stock: ${next}.`
          : `Stock for ${products[0].name} (${products[0].sku}) was updated. Current stock: ${next}.`,
        link: '/pages/inventory/'
      });
    } catch (notificationError) {
      console.error('Stock notification failed:', notificationError);
    }

    res.status(201).json({ message: 'Stock updated successfully', stock_quantity: next });
  } catch (error) {
    await connection.rollback();
    console.error('addStockMovement:', error);
    res.status(500).json({ error: 'Could not update stock' });
  } finally {
    connection.release();
  }
}

export async function getStockMovements(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT sm.id, sm.product_id, p.name AS product_name, p.sku,
              sm.movement_type, sm.quantity, sm.stock_after, sm.note,
              sm.created_at, u.username AS created_by_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       LEFT JOIN users u ON u.id = sm.created_by
       ORDER BY sm.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    console.error('getStockMovements:', error);
    res.status(500).json({ error: 'Could not load stock history' });
  }
}
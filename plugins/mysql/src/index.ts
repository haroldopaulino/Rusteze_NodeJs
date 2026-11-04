import mysql, { type Pool } from 'mysql2/promise';
import type { Plugin, PluginContext, JsonObject } from '@upp/sdk';
export class MySqlPlugin implements Plugin {
  id = 'mysql'; name = 'MySQL Database'; description = 'Persist and retrieve notes with parameterized SQL'; version = '1.0.0'; operations = ['listNotes', 'addNote'] as const;
  private pool?: Pool;
  async start(context: PluginContext) {
    const pool = mysql.createPool({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER || 'rusteze', password: process.env.MYSQL_PASSWORD || '', database: process.env.MYSQL_DATABASE || 'Rusteze', waitForConnections: true, connectionLimit: 5 });
    try { await pool.query('CREATE TABLE IF NOT EXISTS demo_notes (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, text VARCHAR(500) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'); }
    catch (error) { await pool.end(); throw error; }
    this.pool = pool; context.log('MySQL connected and demo_notes table ready');
  }
  async stop() { if (this.pool) { await this.pool.end(); this.pool = undefined; } }
  async execute(operation: string, input: JsonObject) {
    if (!this.pool) throw new Error('Database is not connected');
    if (operation === 'listNotes') { const [rows] = await this.pool.query('SELECT id, text, created_at FROM demo_notes ORDER BY id DESC LIMIT 50'); return rows; }
    if (operation === 'addNote') {
      if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 500) throw new Error('text must be 1–500 characters');
      const [result] = await this.pool.execute<import('mysql2').ResultSetHeader>('INSERT INTO demo_notes (text) VALUES (?)', [input.text.trim()]);
      return { id: result.insertId, text: input.text.trim() };
    }
    throw new Error('Unsupported operation');
  }
}

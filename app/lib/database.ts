import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export interface LocalizationEntry {
  id: string;
  key: string;
  en: string;
  es: string;
  fr: string;
  de: string;
  ja: string;
  zh: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ComponentEntry {
  id: string;
  name: string;
  code: string;
  chat_history: ChatMessage[];
  created_at?: string;
  updated_at?: string;
}

// Simple database class for CRUD operations
export class LocalizationDB {
  private static instance: LocalizationDB;
  
  static getInstance(): LocalizationDB {
    if (!LocalizationDB.instance) {
      LocalizationDB.instance = new LocalizationDB();
    }
    return LocalizationDB.instance;
  }

  async init(): Promise<void> {
    if (db) return;
    await initializeDatabase();
  }

  async getAll(): Promise<LocalizationEntry[]> {
    await this.init();
    return getAllLocalizations();
  }

  async update(id: string, field: string, value: string): Promise<void> {
    await this.init();
    return updateLocalization(id, field, value);
  }

  async create(entry: Omit<LocalizationEntry, 'created_at' | 'updated_at'>): Promise<void> {
    await this.init();
    return createLocalization(entry);
  }

  async delete(id: string): Promise<void> {
    await this.init();
    return deleteLocalization(id);
  }

  async getTranslations(locale: string): Promise<Record<string, string>> {
    await this.init();
    return getTranslations(locale);
  }
}

// Component database class for CRUD operations
export class ComponentDB {
  private static instance: ComponentDB;

  static getInstance(): ComponentDB {
    if (!ComponentDB.instance) {
      ComponentDB.instance = new ComponentDB();
    }
    return ComponentDB.instance;
  }

  async init(): Promise<void> {
    if (db) return;
    await initializeDatabase();
  }

  async getAll(): Promise<ComponentEntry[]> {
    await this.init();
    return getAllComponents();
  }

  async getById(id: string): Promise<ComponentEntry | null> {
    await this.init();
    return getComponentById(id);
  }

  async create(entry: Omit<ComponentEntry, 'created_at' | 'updated_at'>): Promise<void> {
    await this.init();
    return createComponent(entry);
  }

  async update(id: string, updates: Partial<Pick<ComponentEntry, 'name' | 'code' | 'chat_history'>>): Promise<void> {
    await this.init();
    return updateComponent(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.init();
    return deleteComponent(id);
  }
}

export async function initializeDatabase(): Promise<void> {
  if (db) return; // Already initialized

  try {
    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('localizations_db');
    if (savedDb) {
      const uint8Array = new Uint8Array(savedDb.split(',').map(Number));
      db = new SQL.Database(uint8Array);
      console.log('Loaded existing database from localStorage');

      // Run migrations for existing databases
      await runMigrations();
    } else {
      // Create new database
      db = new SQL.Database();

      // Create the localization table
      db.run(`
        CREATE TABLE localizations (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          en TEXT DEFAULT '',
          es TEXT DEFAULT '',
          fr TEXT DEFAULT '',
          de TEXT DEFAULT '',
          ja TEXT DEFAULT '',
          zh TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create the components table
      db.run(`
        CREATE TABLE components (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL,
          chat_history TEXT DEFAULT '[]',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Insert initial data
      await seedInitialData();
      console.log('Created new database with initial data');
    }

    // Save database to localStorage
    saveDatabaseToLocalStorage();

  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  if (!db) return;

  // Check if components table exists, if not create it
  const tableCheck = db.exec(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='components'
  `);

  if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
    console.log('Running migration: Creating components table');
    db.run(`
      CREATE TABLE components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        chat_history TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    saveDatabaseToLocalStorage();
  }
}

async function seedInitialData(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const initialData = [
    {
      id: '1',
      key: 'welcome.title',
      en: 'Welcome to our app',
      es: 'Bienvenido a nuestra aplicación',
      fr: 'Bienvenue dans notre application',
      de: 'Willkommen in unserer App',
      ja: '私たちのアプリへようこそ',
      zh: '欢迎使用我们的应用'
    },
    {
      id: '2',
      key: 'button.submit',
      en: 'Submit',
      es: 'Enviar',
      fr: 'Soumettre',
      de: 'Absenden',
      ja: '送信',
      zh: '提交'
    },
    {
      id: '3',
      key: 'error.validation',
      en: 'Please check your input',
      es: 'Por favor verifica tu entrada',
      fr: 'Veuillez vérifier votre saisie',
      de: 'Bitte überprüfen Sie Ihre Eingabe',
      ja: '入力内容を確認してください',
      zh: '请检查您的输入'
    },
    {
      id: '4',
      key: 'navigation.home',
      en: 'Home',
      es: 'Inicio',
      fr: 'Accueil',
      de: 'Startseite',
      ja: 'ホーム',
      zh: '首页'
    },
    {
      id: '5',
      key: 'form.email',
      en: 'Email Address',
      es: 'Dirección de correo',
      fr: 'Adresse e-mail',
      de: 'E-Mail-Adresse',
      ja: 'メールアドレス',
      zh: '电子邮件地址'
    }
  ];

  for (const entry of initialData) {
    db.run(`
      INSERT INTO localizations (id, key, en, es, fr, de, ja, zh)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [entry.id, entry.key, entry.en, entry.es, entry.fr, entry.de, entry.ja, entry.zh]);
  }
}

function saveDatabaseToLocalStorage(): void {
  if (!db) return;
  
  try {
    const data = db.export();
    const array = Array.from(data);
    localStorage.setItem('localizations_db', array.toString());
  } catch (error) {
    console.error('Failed to save database to localStorage:', error);
  }
}

export async function getAllLocalizations(): Promise<LocalizationEntry[]> {
  if (!db) {
    await initializeDatabase();
  }
  
  const result = db!.exec('SELECT * FROM localizations ORDER BY key');
  if (result.length === 0) return [];
  
  return result[0].values.map((row: (string | number | null | Uint8Array)[]) => ({
    id: row[0] as string,
    key: row[1] as string,
    en: row[2] as string,
    es: row[3] as string,
    fr: row[4] as string,
    de: row[5] as string,
    ja: row[6] as string,
    zh: row[7] as string,
    created_at: row[8] as string,
    updated_at: row[9] as string
  }));
}

export async function updateLocalization(id: string, field: string, value: string): Promise<void> {
  if (!db) {
    await initializeDatabase();
  }

  // Validate field to prevent SQL injection
  const validFields = ['key', 'en', 'es', 'fr', 'de', 'ja', 'zh'];
  if (!validFields.includes(field)) {
    throw new Error(`Invalid field: ${field}`);
  }

  db!.run(`
    UPDATE localizations 
    SET ${field} = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [value, id]);
  
  saveDatabaseToLocalStorage();
}

export async function createLocalization(entry: Omit<LocalizationEntry, 'created_at' | 'updated_at'>): Promise<void> {
  if (!db) {
    await initializeDatabase();
  }

  db!.run(`
    INSERT INTO localizations (id, key, en, es, fr, de, ja, zh)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [entry.id, entry.key, entry.en, entry.es, entry.fr, entry.de, entry.ja, entry.zh]);
  
  saveDatabaseToLocalStorage();
}

export async function deleteLocalization(id: string): Promise<void> {
  if (!db) {
    await initializeDatabase();
  }

  db!.run('DELETE FROM localizations WHERE id = ?', [id]);
  saveDatabaseToLocalStorage();
}

export async function getTranslations(locale: string): Promise<Record<string, string>> {
  if (!db) {
    await initializeDatabase();
  }

  // Validate locale to prevent SQL injection
  const validLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
  if (!validLocales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  const result = db!.exec(`SELECT key, ${locale} as translation FROM localizations`);
  if (result.length === 0) return {};
  
  return result[0].values.reduce((acc: Record<string, string>, row: (string | number | null | Uint8Array)[]) => {
    acc[row[0] as string] = (row[1] as string) || '';
    return acc;
  }, {} as Record<string, string>);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Component CRUD operations

export async function getAllComponents(): Promise<ComponentEntry[]> {
  if (!db) {
    await initializeDatabase();
  }

  const result = db!.exec('SELECT * FROM components ORDER BY updated_at DESC');
  if (result.length === 0) return [];

  return result[0].values.map((row: (string | number | null | Uint8Array)[]) => ({
    id: row[0] as string,
    name: row[1] as string,
    code: row[2] as string,
    chat_history: JSON.parse((row[3] as string) || '[]') as ChatMessage[],
    created_at: row[4] as string,
    updated_at: row[5] as string
  }));
}

export async function getComponentById(id: string): Promise<ComponentEntry | null> {
  if (!db) {
    await initializeDatabase();
  }

  const result = db!.exec('SELECT * FROM components WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    name: row[1] as string,
    code: row[2] as string,
    chat_history: JSON.parse((row[3] as string) || '[]') as ChatMessage[],
    created_at: row[4] as string,
    updated_at: row[5] as string
  };
}

export async function createComponent(entry: Omit<ComponentEntry, 'created_at' | 'updated_at'>): Promise<void> {
  if (!db) {
    await initializeDatabase();
  }

  db!.run(`
    INSERT INTO components (id, name, code, chat_history)
    VALUES (?, ?, ?, ?)
  `, [entry.id, entry.name, entry.code, JSON.stringify(entry.chat_history)]);

  saveDatabaseToLocalStorage();
}

export async function updateComponent(
  id: string,
  updates: Partial<Pick<ComponentEntry, 'name' | 'code' | 'chat_history'>>
): Promise<void> {
  if (!db) {
    await initializeDatabase();
  }

  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.code !== undefined) {
    setClauses.push('code = ?');
    values.push(updates.code);
  }
  if (updates.chat_history !== undefined) {
    setClauses.push('chat_history = ?');
    values.push(JSON.stringify(updates.chat_history));
  }

  if (setClauses.length === 0) return;

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  db!.run(`
    UPDATE components
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `, values);

  saveDatabaseToLocalStorage();
}

export async function deleteComponent(id: string): Promise<void> {
  if (!db) {
    await initializeDatabase();
  }

  db!.run('DELETE FROM components WHERE id = ?', [id]);
  saveDatabaseToLocalStorage();
} 
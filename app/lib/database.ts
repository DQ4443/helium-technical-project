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
  
  return result[0].values.map(row => ({
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
  
  return result[0].values.reduce((acc, row) => {
    acc[row[0] as string] = row[1] as string || '';
    return acc;
  }, {} as Record<string, string>);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
} 
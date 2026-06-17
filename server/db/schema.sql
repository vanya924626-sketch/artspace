sql


-- ===== ArtSpace Dance Lviv =====
-- База даних
-- Користувачі
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','choreographer','dancer','renter')),
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Зали
CREATE TABLE IF NOT EXISTS halls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  price_per_hour REAL DEFAULT 0
);
-- Заняття в розкладі
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hall_id INTEGER NOT NULL REFERENCES halls(id),
  choreographer_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Пн, 6=Нд
  start_time TEXT NOT NULL,     -- '10:00'
  end_time TEXT NOT NULL,
  is_recurring INTEGER DEFAULT 1, -- 1=щотижня
  date_specific TEXT,            -- для разових
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Абонементи
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('single','8','16','unlimited')),
  total_classes INTEGER,         -- NULL для безліміт
  used_classes INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 0,        -- 0=не оплачено, 1=оплачено
  payment_method TEXT CHECK(payment_method IN ('online','cash','card')),
  liqpay_order_id TEXT,
  valid_from DATE,
  valid_to DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Журнал відвідувань
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES schedule(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  present INTEGER DEFAULT 0,
  subscription_id INTEGER REFERENCES subscriptions(id),
  amount_paid REAL DEFAULT 0,
  marked_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Бронювання залів (орендарі)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hall_id INTEGER NOT NULL REFERENCES halls(id),
  renter_id INTEGER NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','cancelled')),
  total_price REAL,
  paid INTEGER DEFAULT 0,
  liqpay_order_id TEXT,
  admin_note TEXT,
  confirmed_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Журнал всіх змін
CREATE TABLE IF NOT EXISTS changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,          -- 'schedule','booking','subscription' тощо
  entity_id INTEGER,
  old_value TEXT,                -- JSON
  new_value TEXT,                -- JSON
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Email сповіщення (черга)
CREATE TABLE IF NOT EXISTS email_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent INTEGER DEFAULT 0,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Початкові дані: 4 зали
INSERT OR IGNORE INTO halls (id, name, description, capacity, price_per_hour) VALUES
  (1, 'Зал 1', 'Великий зал з дзеркалами', 30, 500),
  (2, 'Зал 2', 'Зал для дитячих груп', 20, 400),
  (3, 'Зал 3', 'Зал для індивідуальних занять', 10, 300),
  (4, 'Зал 4', 'Зал з паркетом', 25, 450);
-- Адмін за замовчуванням (пароль: admin123 — змінити після першого входу!)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Адміністратор', 'admin@artspace.lviv', '$2b$10$YourHashHere', 'admin');
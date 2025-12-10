-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'guest' CHECK (role IN ('admin', 'guest')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    couple_names VARCHAR(255) NOT NULL,
    wedding_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    dress_code VARCHAR(50) DEFAULT 'Elegante' CHECK (dress_code IN ('Elegante', 'Formal', 'Casual', 'Otro')),
    dress_code_description TEXT,
    banner_image_url VARCHAR(500),
    additional_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de regalos
CREATE TABLE IF NOT EXISTS gifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) DEFAULT 'PEN',
    category VARCHAR(100) DEFAULT 'Otro' CHECK (category IN ('Luna de Miel', 'Arte y Deco', 'Otro')),
    available INTEGER DEFAULT 1 CHECK (available >= 0),
    total INTEGER DEFAULT 1 CHECK (total >= 1),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_contributed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de contribuciones a regalos
CREATE TABLE IF NOT EXISTS gift_contributions (
    id SERIAL PRIMARY KEY,
    gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    contributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_gifts_category ON gifts(category);
CREATE INDEX IF NOT EXISTS idx_gifts_is_active ON gifts(is_active);
CREATE INDEX IF NOT EXISTS idx_gift_contributions_gift_id ON gift_contributions(gift_id);
CREATE INDEX IF NOT EXISTS idx_gift_contributions_user_id ON gift_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gifts_updated_at BEFORE UPDATE ON gifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

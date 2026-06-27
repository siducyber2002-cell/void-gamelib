-- ============================================================
--  GameLib — PostgreSQL Database Schema (Supabase)
--  Reference only — tables are created automatically by
--  SQLAlchemy (Base.metadata.create_all) on backend startup.
--  This file mirrors models.py for documentation purposes.
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────
CREATE TYPE gamestatus AS ENUM ('playing', 'completed', 'wishlist', 'dropped');
CREATE TYPE friendstatus AS ENUM ('pending', 'accepted', 'blocked');

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    email            VARCHAR(120) NOT NULL UNIQUE,
    hashed_password  VARCHAR(255) NOT NULL,
    bio              TEXT         DEFAULT '',
    avatar_url       VARCHAR(500) DEFAULT '',
    banner_url       VARCHAR(500) DEFAULT '',
    country          VARCHAR(100) DEFAULT '',
    favorite_game    VARCHAR(100) DEFAULT '',
    level            INTEGER      DEFAULT 1,
    xp               INTEGER      DEFAULT 0,
    is_active        BOOLEAN      DEFAULT TRUE,
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);

-- ─── Games ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
    id             SERIAL PRIMARY KEY,
    title          VARCHAR(200) NOT NULL,
    description    TEXT         DEFAULT '',
    genre          VARCHAR(50)  DEFAULT '',
    platform       VARCHAR(50)  DEFAULT '',
    release_year   INTEGER,
    developer      VARCHAR(100) DEFAULT '',
    publisher      VARCHAR(100) DEFAULT '',
    rating         DOUBLE PRECISION DEFAULT 0.0,
    cover_url      VARCHAR(500) DEFAULT '',
    trailer_url    VARCHAR(500) DEFAULT '',
    is_free        BOOLEAN      DEFAULT FALSE,
    is_multiplayer BOOLEAN      DEFAULT FALSE,
    created_at     TIMESTAMP    DEFAULT NOW()
);

-- ─── User Games (Library) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_games (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    game_id      INTEGER NOT NULL REFERENCES games(id),
    status       gamestatus DEFAULT 'wishlist',
    hours_played DOUBLE PRECISION DEFAULT 0.0,
    is_favorite  BOOLEAN DEFAULT FALSE,
    user_rating  DOUBLE PRECISION DEFAULT 0.0,
    added_at     TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP
);

-- ─── Achievements ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    description TEXT         DEFAULT '',
    emoji       VARCHAR(10)  DEFAULT '🏆',
    rarity      VARCHAR(20)  DEFAULT 'Common',
    xp_reward   INTEGER      DEFAULT 100
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    progress       INTEGER DEFAULT 0,
    unlocked_at    TIMESTAMP
);

-- ─── Friendships ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
    id           SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id),
    addressee_id INTEGER NOT NULL REFERENCES users(id),
    status       friendstatus DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT NOW()
);

-- ─── Reviews ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    game_id    INTEGER NOT NULL REFERENCES games(id),
    rating     DOUBLE PRECISION NOT NULL,
    body       TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Messages (Community Chat) ───────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    author_id  INTEGER NOT NULL REFERENCES users(id),
    channel    VARCHAR(50) DEFAULT 'general',
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── News Articles (cache store) ─────────────────────────────
CREATE TABLE IF NOT EXISTS news_articles (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(300) NOT NULL,
    summary      TEXT         DEFAULT '',
    body         TEXT         DEFAULT '',
    category     VARCHAR(50)  DEFAULT 'Industry News',
    cover_url    VARCHAR(500) DEFAULT '',
    source_url   VARCHAR(500) UNIQUE DEFAULT '',
    source_name  VARCHAR(200) DEFAULT '',
    author       VARCHAR(200) DEFAULT '',
    published_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── News Cache Tracker ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_cache (
    id         SERIAL PRIMARY KEY,
    cache_key  VARCHAR(300) NOT NULL UNIQUE,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Direct Messages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
    id          SERIAL PRIMARY KEY,
    sender_id   INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    room_id     VARCHAR(50) NOT NULL,
    content     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User Activity (XP/Gamification) ─────────────────────────
CREATE TABLE IF NOT EXISTS user_activities (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    detail     VARCHAR(300) DEFAULT '',
    xp_earned  INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  Indexes (matching index=True columns in models.py)
-- ============================================================
CREATE INDEX IF NOT EXISTS ix_users_username        ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS ix_games_title           ON games(title);
CREATE INDEX IF NOT EXISTS ix_news_articles_category    ON news_articles(category);
CREATE INDEX IF NOT EXISTS ix_news_articles_source_url  ON news_articles(source_url);
CREATE INDEX IF NOT EXISTS ix_news_articles_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS ix_news_cache_cache_key   ON news_cache(cache_key);
CREATE INDEX IF NOT EXISTS ix_direct_messages_room_id ON direct_messages(room_id);

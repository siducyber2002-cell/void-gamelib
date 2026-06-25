-- ============================================================
--  GameLib — MySQL Database Setup Script
--  Run this in MySQL Workbench before starting the backend
-- ============================================================

CREATE DATABASE IF NOT EXISTS gamelib CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gamelib;

-- ─── Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    email            VARCHAR(120) NOT NULL UNIQUE,
    hashed_password  VARCHAR(255) NOT NULL,
    bio              TEXT         DEFAULT '',
    avatar_url       VARCHAR(500) DEFAULT '',
    banner_url       VARCHAR(500) DEFAULT '',
    country          VARCHAR(100) DEFAULT '',
    favorite_game    VARCHAR(100) DEFAULT '',
    level            INT          DEFAULT 1,
    xp               INT          DEFAULT 0,
    is_active        BOOLEAN      DEFAULT TRUE,
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email    (email),
    INDEX idx_username (username)
) ENGINE=InnoDB;

-- ─── Games ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(200) NOT NULL,
    description    TEXT         DEFAULT '',
    genre          VARCHAR(50)  DEFAULT '',
    platform       VARCHAR(50)  DEFAULT '',
    release_year   INT,
    developer      VARCHAR(100) DEFAULT '',
    publisher      VARCHAR(100) DEFAULT '',
    rating         FLOAT        DEFAULT 0.0,
    cover_url      VARCHAR(500) DEFAULT '',
    trailer_url    VARCHAR(500) DEFAULT '',
    is_free        BOOLEAN      DEFAULT FALSE,
    is_multiplayer BOOLEAN      DEFAULT FALSE,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_title  (title),
    INDEX idx_genre  (genre),
    INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- ─── User Games (Library) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_games (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT          NOT NULL,
    game_id      INT          NOT NULL,
    status       ENUM('playing','completed','wishlist','dropped') DEFAULT 'wishlist',
    hours_played FLOAT        DEFAULT 0.0,
    is_favorite  BOOLEAN      DEFAULT FALSE,
    user_rating  FLOAT        DEFAULT 0.0,
    added_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_game (user_id, game_id)
) ENGINE=InnoDB;

-- ─── Achievements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    description TEXT         DEFAULT '',
    emoji       VARCHAR(10)  DEFAULT '🏆',
    rarity      VARCHAR(20)  DEFAULT 'Common',
    xp_reward   INT          DEFAULT 100
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_achievements (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    achievement_id INT NOT NULL,
    progress       INT DEFAULT 0,
    unlocked_at    DATETIME,
    FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_achievement (user_id, achievement_id)
) ENGINE=InnoDB;

-- ─── Friendships ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status       ENUM('pending','accepted','blocked') DEFAULT 'pending',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_friendship (requester_id, addressee_id)
) ENGINE=InnoDB;

-- ─── Reviews ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT   NOT NULL,
    game_id    INT   NOT NULL,
    rating     FLOAT NOT NULL,
    body       TEXT  DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_game_review (user_id, game_id)
) ENGINE=InnoDB;

-- ─── Messages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    author_id  INT         NOT NULL,
    channel    VARCHAR(50) DEFAULT 'general',
    content    TEXT        NOT NULL,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_channel (channel)
) ENGINE=InnoDB;

-- ─── News Articles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_articles (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(300) NOT NULL,
    summary      TEXT         DEFAULT '',
    body         TEXT         DEFAULT '',
    category     VARCHAR(50)  DEFAULT 'Industry News',
    cover_url    VARCHAR(500) DEFAULT '',
    source_url   VARCHAR(500) DEFAULT '',
    published_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- ─── Seed: Sample Games ─────────────────────────────────
INSERT IGNORE INTO games (title, description, genre, platform, release_year, developer, rating, is_free, is_multiplayer) VALUES
('GTA VI',             'Return to Vice City in the most ambitious GTA yet.',           'Action',     'PC',             2025, 'Rockstar Games',  9.8, FALSE, TRUE),
('Cyberpunk 2077',     'Open-world RPG set in Night City.',                            'RPG',        'PC',             2024, 'CD Projekt Red',  9.2, FALSE, FALSE),
('Black Myth: Wukong', 'Action RPG rooted in Chinese mythology.',                      'Action',     'PC',             2024, 'Game Science',    9.5, FALSE, FALSE),
('Valorant',           'Free-to-play 5v5 tactical shooter.',                           'Shooter',    'PC',             2020, 'Riot Games',      8.8, TRUE,  TRUE),
('Fortnite',           'Battle royale with building mechanics.',                        'Shooter',    'Xbox',           2020, 'Epic Games',      8.5, TRUE,  TRUE),
('Elden Ring',         'Open-world action RPG from FromSoftware.',                     'RPG',        'PS5',            2022, 'FromSoftware',    9.6, FALSE, TRUE),
('Minecraft',          'Sandbox survival and creativity game.',                         'Simulation', 'Nintendo Switch', 2020, 'Mojang',          9.0, FALSE, TRUE),
('Hades II',           'Roguelite dungeon crawler sequel.',                             'Action',     'PC',             2024, 'Supergiant Games', 9.3, FALSE, FALSE),
('Hollow Knight',      'Atmospheric metroidvania adventure.',                           'Adventure',  'Nintendo Switch', 2020, 'Team Cherry',     9.4, FALSE, FALSE),
('Civilization VII',   'Turn-based strategy spanning history.',                         'Strategy',   'PC',             2025, 'Firaxis',         8.7, FALSE, TRUE);

-- ─── Seed: Achievements ─────────────────────────────────
INSERT IGNORE INTO achievements (title, description, emoji, rarity, xp_reward) VALUES
('Master Explorer',  'Discover all regions in any open world game',    '🗺️', 'Legendary', 500),
('Speed Runner',     'Complete any game in under 2 hours',             '⚡',  'Rare',      300),
('Library Giant',    'Own more than 20 games',                         '📚', 'Common',    100),
('Social Butterfly', 'Add 10 friends to your list',                    '🦋', 'Common',    100),
('Night Owl',        'Play for more than 5 hours in a single session', '🦉', 'Rare',      250),
('Completionist',    'Complete 5 games at 100%',                       '✅', 'Legendary', 500),
('Genre Hopper',     'Play games from 5 different genres',             '🎯', 'Common',    150),
('RPG King',         'Spend over 200 hours in RPG games',              '⚔️', 'Rare',      300),
('Legendary Gamer',  'Earn 10 Legendary achievements',                 '👑', 'Legendary', 1000),
('Early Adopter',    'Play a game on its release day',                 '🚀', 'Rare',      200);

-- ─── Seed: News ─────────────────────────────────────────
INSERT IGNORE INTO news_articles (title, summary, category) VALUES
('GTA VI Breaks Pre-Order Records Worldwide',  'Rockstar Games announces GTA VI has surpassed all previous pre-order records with over 20M units in the first 24 hours.', 'Industry News'),
('Sony Reveals New PS6 Specs',                 'Sony officially revealed PlayStation 6 hardware specs, confirming an 18 TFLOP GPU and custom SSD technology.',            'Industry News'),
('Cyberpunk 2077 Patch 3.0 Released',          'CD Projekt Red drops the largest free update ever, adding new districts and 20+ hours of new story content.',             'Updates'),
('Valorant v8.2 — Weapon Rebalance & Agent',   'Riot Games releases major weapon rebalance alongside a new controller agent.',                                            'Patch Notes'),
('Team Liquid Wins The International 2025',    'Team Liquid claims the Dota 2 World Championship with a stunning 3-1 victory.',                                           'Esports'),
('Elden Ring 2 Officially Confirmed for 2026', 'FromSoftware and Bandai Namco announce the sequel to Elden Ring.',                                                        'Upcoming Releases');

SELECT 'GameLib database setup complete! 🎮' AS status;

-- 群聊功能表
CREATE TABLE IF NOT EXISTS group_features (
    group_id BIGINT NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (group_id, feature_name)
);
CREATE INDEX IF NOT EXISTS idx_group_features_id ON group_features(group_id);

---

-- AmiaChat 历史记录表
CREATE TABLE IF NOT EXISTS amia_chat_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_nick VARCHAR(100) NOT NULL,
    time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_group_time ON amia_chat_history(group_id, time);

---

-- AmiaChat 好感度、记忆表
CREATE TABLE IF NOT EXISTS amia_chat_user (
    user_id BIGINT NOT NULL PRIMARY KEY,
    favor INT NOT NULL DEFAULT 0,
    memory TEXT
);

---

-- 游戏状态表
CREATE TABLE IF NOT EXISTS amia_game_state (
    group_id BIGINT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    answer_data JSONB NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, game_type)
);

---

-- 社交与好感度系统 (SFS)

-- 用户关系表 (双向好感度)
CREATE TABLE IF NOT EXISTS user_relationships (
    id SERIAL PRIMARY KEY,
    user_id_a BIGINT NOT NULL,
    user_id_b BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    favorability INT DEFAULT 0,
    tags JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (user_id_a < user_id_b)
);

-- 唯一性约束：确保每对用户在每个群组只有一条记录，且强制 A < B
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rel_unique ON user_relationships (user_id_a, user_id_b, group_id);
-- 索引优化查询特定用户的所有关系
CREATE INDEX IF NOT EXISTS idx_user_rel_a ON user_relationships (user_id_a, group_id);
CREATE INDEX IF NOT EXISTS idx_user_rel_b ON user_relationships (user_id_b, group_id);

-- 每日互动状态表
CREATE TABLE IF NOT EXISTS user_daily_interactions (
    id SERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    interaction_type VARCHAR(20) NOT NULL,
    target_id BIGINT,
    record_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引优化每日查询
CREATE INDEX IF NOT EXISTS idx_user_daily_query ON user_daily_interactions (group_id, user_id, interaction_type, record_date);

---

-- 睡眠追踪统计表
CREATE TABLE IF NOT EXISTS user_sleep_stats (
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    wake_count INT DEFAULT 0,
    sleep_count INT DEFAULT 0,
    last_wake_time TIMESTAMP,
    last_sleep_time TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_group_user ON user_sleep_stats(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_wake_count ON user_sleep_stats(wake_count);
CREATE INDEX IF NOT EXISTS idx_sleep_count ON user_sleep_stats(sleep_count);

---

-- 回应功能表 - 存储用户设置的回应表情
CREATE TABLE IF NOT EXISTS user_reply_faces (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    face_id VARCHAR(10) NOT NULL,  -- 表情ID（字符串格式）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_reply_faces_user ON user_reply_faces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reply_faces_face ON user_reply_faces(face_id);

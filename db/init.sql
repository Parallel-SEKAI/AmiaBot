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

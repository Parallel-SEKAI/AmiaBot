CREATE TABLE IF NOT EXISTS group_features (
    group_id BIGINT NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (group_id, feature_name)
);
CREATE INDEX IF NOT EXISTS idx_group_features_id ON group_features(group_id);

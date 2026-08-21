-- 三张表通过 user_email / email 逻辑关联（未使用 FOREIGN KEY）
-- 对应 types/*.d.ts 与 models/ 下的读写函数

-- 壁纸表：gen-wallpaper 写入，get-wallpapers 读取，积分统计也会 COUNT 此表
CREATE TABLE wallpapers (
    id SERIAL PRIMARY KEY,              -- 自增主键，插入时不用手动填
    user_email VARCHAR(255) NOT NULL,   -- 关联用户，对应 Clerk 登录邮箱
    img_description TEXT,
    img_size VARCHAR(255),
    img_url TEXT,                       -- S3 上的永久图片地址
    llm_name VARCHAR(100),
    llm_params JSON,
    created_at timestamptz
);

-- 用户表：补充存昵称/头像（登录本身由 Clerk 负责）
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL, -- 同一邮箱只能有一条
    nickname VARCHAR(255),
    avatar_url VARCHAR(255),
    created_at timestamptz
);

-- 订单表：checkout 创建，pay-success 更新状态；order_status: 1=待支付, 2=已支付
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(255) UNIQUE NOT NULL,
    created_at timestamptz,
    user_email VARCHAR(255) NOT NULL,   -- 关联用户
    amount INT NOT NULL,
    plan VARCHAR(50),
    expired_at timestamptz,
    order_status SMALLINT NOT NULL,
    paied_at timestamptz,
    stripe_session_id VARCHAR(255),
    credits INT NOT NULL                -- 本单购买的积分数
);

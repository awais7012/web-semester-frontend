-- ============================================================
--  Multi-Tenant E-Commerce  — MySQL 8.0 Schema
--  Run:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecommerce_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecommerce_db;

-- ── Tenants ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                       INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  name                     VARCHAR(255)     NOT NULL,
  slug                     VARCHAR(100)     NOT NULL UNIQUE,
  domain                   VARCHAR(255)     NULL,
  stripe_account_id        VARCHAR(255)     NULL,
  stripe_details_submitted TINYINT(1)       NOT NULL DEFAULT 0,
  logo_url                 VARCHAR(500)     NULL,
  description              TEXT             NULL,
  is_active                TINYINT(1)       NOT NULL DEFAULT 1,
  created_at               TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug      (slug),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  username                    VARCHAR(100)  NOT NULL UNIQUE,
  email                       VARCHAR(255)  NOT NULL UNIQUE,
  password_hash               VARCHAR(255)  NOT NULL,
  role                        ENUM('admin','vendor','user') NOT NULL DEFAULT 'user',
  tenant_id                   INT UNSIGNED  NULL,
  status                      ENUM('active','pending','blocked') NOT NULL DEFAULT 'active',
  email_verified              TINYINT(1)    NOT NULL DEFAULT 0,
  email_verification_token    VARCHAR(255)  NULL,
  email_verification_expiry   TIMESTAMP     NULL,
  password_reset_token        VARCHAR(255)  NULL,
  password_reset_expiry       TIMESTAMP     NULL,
  avatar_url                  VARCHAR(500)  NULL,
  created_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  INDEX idx_email     (email),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_role      (role),
  INDEX idx_status    (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  slug        VARCHAR(255)  NOT NULL UNIQUE,
  color       VARCHAR(50)   NULL,
  parent_id   INT UNSIGNED  NULL,
  description TEXT          NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_slug      (slug),
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Tags ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255)    NOT NULL,
  description   TEXT            NULL,
  price         DECIMAL(10,2)   NOT NULL,
  tenant_id     INT UNSIGNED    NOT NULL,
  category_id   INT UNSIGNED    NULL,
  image_url     VARCHAR(500)    NULL,
  cover_url     VARCHAR(500)    NULL,
  refund_policy ENUM('30-day','14-day','7-day','3-day','1-day','no-refunds')
                                NOT NULL DEFAULT '30-day',
  content       TEXT            NULL,
  is_private    TINYINT(1)      NOT NULL DEFAULT 0,
  is_archived   TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_tenant
    FOREIGN KEY (tenant_id)   REFERENCES tenants(id)    ON DELETE CASCADE,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_tenant_id   (tenant_id),
  INDEX idx_category_id (category_id),
  INDEX idx_is_archived (is_archived),
  INDEX idx_is_private  (is_private),
  INDEX idx_price       (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Product ↔ Tags  (M:N) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_tags (
  product_id INT UNSIGNED NOT NULL,
  tag_id     INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, tag_id),
  CONSTRAINT fk_pt_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tag     FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                        INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  user_id                   INT UNSIGNED   NOT NULL,
  tenant_id                 INT UNSIGNED   NOT NULL,
  status                    ENUM('pending','processing','completed','cancelled','refunded')
                                           NOT NULL DEFAULT 'pending',
  total_amount              DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  stripe_payment_intent_id  VARCHAR(255)   NULL,
  stripe_checkout_session_id VARCHAR(255)  NULL,
  notes                     TEXT           NULL,
  created_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_orders_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_tenant_id  (tenant_id),
  INDEX idx_status     (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Order Items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED  NOT NULL,
  product_id INT UNSIGNED  NOT NULL,
  quantity   INT UNSIGNED  NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal   DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_order_id   (order_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id        INT UNSIGNED NOT NULL,
  user_id           INT UNSIGNED NOT NULL,
  rating            TINYINT UNSIGNED NOT NULL,
  comment           TEXT         NULL,
  vendor_reply      TEXT         NULL,
  vendor_replied_at TIMESTAMP    NULL,
  is_approved       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE KEY uq_review (product_id, user_id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_user_id    (user_id),
  INDEX idx_rating     (rating),
  INDEX idx_is_approved(is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  Seed Data
-- ============================================================

-- Platform tenant (id=1, used for the admin account)
INSERT INTO tenants (id, name, slug, is_active)
VALUES (1, 'Platform', 'platform', 1)
ON DUPLICATE KEY UPDATE name = 'Platform';

-- Demo vendor tenant
INSERT INTO tenants (id, name, slug, is_active)
VALUES (2, 'Demo Store', 'demo', 1)
ON DUPLICATE KEY UPDATE name = 'Demo Store';

-- Admin user  (password: Admin@123)
-- Hash generated with bcrypt rounds=12; regenerate with: node -e "console.log(require('bcrypt').hashSync('Admin@123',12))"
INSERT INTO users (id, username, email, password_hash, role, tenant_id, status, email_verified)
VALUES (
  1,
  'admin',
  'admin@platform.com',
  '$2b$12$placeholder_replace_this_with_real_bcrypt_hash_Admin123',
  'admin',
  1,
  'active',
  1
)
ON DUPLICATE KEY UPDATE username = 'admin';

-- Demo vendor user  (password: Vendor@123)
INSERT INTO users (id, username, email, password_hash, role, tenant_id, status, email_verified)
VALUES (
  2,
  'demovendor',
  'vendor@demo.com',
  '$2b$12$placeholder_replace_this_with_real_bcrypt_hash_Vendor123',
  'vendor',
  2,
  'active',
  1
)
ON DUPLICATE KEY UPDATE username = 'demovendor';

-- Default categories
INSERT INTO categories (name, slug) VALUES
  ('Software',       'software'),
  ('Education',      'education'),
  ('Design',         'design'),
  ('Finance',        'finance'),
  ('Health',         'health'),
  ('Entertainment',  'entertainment')
ON DUPLICATE KEY UPDATE name = VALUES(name);

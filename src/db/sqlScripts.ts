export const DDL_SQL = `-- =====================================================================
-- PROJETO PRATICO INTEGRADOR - BANCO DE DADOS
-- Lanchonete (Gustavo Lanches)
-- Etapa 03 - DDL: criacao das tabelas (PostgreSQL / Supabase)
-- =====================================================================

DROP TABLE IF EXISTS item_compra CASCADE;
DROP TABLE IF EXISTS compra CASCADE;
DROP TABLE IF EXISTS item_pedido_adicional CASCADE;
DROP TABLE IF EXISTS item_pedido CASCADE;
DROP TABLE IF EXISTS pedido CASCADE;
DROP TABLE IF EXISTS produto_ingrediente CASCADE;
DROP TABLE IF EXISTS ingrediente CASCADE;
DROP TABLE IF EXISTS produto CASCADE;
DROP TABLE IF EXISTS cliente CASCADE;
DROP TABLE IF EXISTS fornecedor CASCADE;
DROP TABLE IF EXISTS categoria CASCADE;

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nome         VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE produto (
    id_produto   SERIAL PRIMARY KEY,
    id_categoria INT NOT NULL,
    nome         VARCHAR(80) NOT NULL UNIQUE,
    descricao    VARCHAR(255),
    preco        NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    CONSTRAINT fk_produto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria)
);

CREATE TABLE fornecedor (
    id_fornecedor SERIAL PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    telefone      VARCHAR(20)
);

CREATE TABLE ingrediente (
    id_ingrediente  SERIAL PRIMARY KEY,
    id_fornecedor   INT NOT NULL,
    nome            VARCHAR(80) NOT NULL UNIQUE,
    preco_adicional NUMERIC(10,2) CHECK (preco_adicional >= 0),
    estoque_atual   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
    estoque_minimo  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    CONSTRAINT fk_ingrediente_fornecedor FOREIGN KEY (id_fornecedor)
        REFERENCES fornecedor (id_fornecedor)
);

CREATE TABLE produto_ingrediente (
    id_produto     INT NOT NULL,
    id_ingrediente INT NOT NULL,
    PRIMARY KEY (id_produto, id_ingrediente),
    CONSTRAINT fk_pi_produto FOREIGN KEY (id_produto)
        REFERENCES produto (id_produto) ON DELETE CASCADE,
    CONSTRAINT fk_pi_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente (id_ingrediente)
);

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    telefone   VARCHAR(20),
    endereco   VARCHAR(200)
);

CREATE TABLE pedido (
    id_pedido       SERIAL PRIMARY KEY,
    id_cliente      INT,
    data_hora       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo            VARCHAR(10) NOT NULL
                    CHECK (tipo IN ('BALCAO', 'ENTREGA')),
    status          VARCHAR(15) NOT NULL DEFAULT 'RECEBIDO'
                    CHECK (status IN ('RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO')),
    forma_pagamento VARCHAR(10) NOT NULL
                    CHECK (forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO')),
    valor_total     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente),
    CONSTRAINT ck_entrega_com_cliente CHECK (tipo = 'BALCAO' OR id_cliente IS NOT NULL)
);

CREATE TABLE item_pedido (
    id_item_pedido SERIAL PRIMARY KEY,
    id_pedido      INT NOT NULL,
    id_produto     INT NOT NULL,
    quantidade     INT NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    observacao     VARCHAR(200),
    CONSTRAINT fk_item_pedido_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_item_pedido_produto FOREIGN KEY (id_produto)
        REFERENCES produto (id_produto)
);

CREATE TABLE item_pedido_adicional (
    id_item_pedido INT NOT NULL,
    id_ingrediente INT NOT NULL,
    quantidade     INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    valor          NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    PRIMARY KEY (id_item_pedido, id_ingrediente),
    CONSTRAINT fk_ipa_item FOREIGN KEY (id_item_pedido)
        REFERENCES item_pedido (id_item_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_ipa_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente (id_ingrediente)
);

CREATE TABLE compra (
    id_compra     SERIAL PRIMARY KEY,
    id_fornecedor INT NOT NULL,
    data_compra   DATE NOT NULL DEFAULT CURRENT_DATE,
    valor_total   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
    CONSTRAINT fk_compra_fornecedor FOREIGN KEY (id_fornecedor)
        REFERENCES fornecedor (id_fornecedor)
);

CREATE TABLE item_compra (
    id_compra      INT NOT NULL,
    id_ingrediente INT NOT NULL,
    quantidade     NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(10,2) NOT NULL CHECK (valor_unitario >= 0),
    PRIMARY KEY (id_compra, id_ingrediente),
    CONSTRAINT fk_ic_compra FOREIGN KEY (id_compra)
        REFERENCES compra (id_compra) ON DELETE CASCADE,
    CONSTRAINT fk_ic_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente (id_ingrediente)
);`;

export const SEED_SQL = `-- =====================================================================
-- PROJETO PRATICO INTEGRADOR - BANCO DE DADOS
-- Lanchonete (Gustavo Lanches)
-- Etapa 03 - DML: carga de registros (PostgreSQL / Supabase)
-- =====================================================================

INSERT INTO categoria (nome) VALUES
    ('Lanches Tradicionais'),
    ('Lanches Artesanais'),
    ('Lanches com Frango'),
    ('Lanches com Lombo'),
    ('Lanches com Filé'),
    ('Omeletes'),
    ('Batata Frita');

INSERT INTO produto (id_categoria, nome, descricao, preco)
SELECT c.id_categoria, v.nome, v.descricao, v.preco
FROM (VALUES
    ('Lanches Tradicionais', 'X-Tudo',         'Pão, hambúrguer, presunto, muçarela, bacon, catupiry, ovo, salsicha, milho, tomate e alface', 24.00),
    ('Lanches Tradicionais', 'X-Especial 2000','Pão, hambúrguer, filé, lombo, frango, presunto, muçarela, bacon, catupiry, ovo, milho, salsicha, tomate e alface', 46.00),
    ('Lanches Tradicionais', 'X-Bacon',        'Pão, hambúrguer, presunto, muçarela, bacon, ovo, tomate e alface', 23.00),
    ('Lanches Tradicionais', 'X-Egg Catupiry', 'Pão, hambúrguer, presunto, muçarela, ovo, catupiry, tomate e alface', 23.00),
    ('Lanches Tradicionais', 'X-Egg Salada',   'Pão, hambúrguer, presunto, muçarela, ovo, tomate e alface', 20.00),
    ('Lanches Tradicionais', 'X-Burguer',      'Pão, hambúrguer, presunto e muçarela', 15.00),
    ('Lanches Tradicionais', 'X-Catupa',       'Pão, hambúrguer, presunto, muçarela e catupiry', 20.00),
    ('Lanches Tradicionais', 'X-Salada',       'Pão, hambúrguer, presunto, muçarela, tomate e alface', 18.00),
    ('Lanches Tradicionais', 'X-Bauru',        'Pão, presunto, muçarela e tomate', 13.00),
    ('Lanches Artesanais',   'Especial da Casa',     'Pão, hambúrguer 170g de fraldinha, cheddar americano, barbecue, catupiry, bacon e cebola roxa', 32.00),
    ('Lanches Artesanais',   'Duplo Cheddar Bacon',  'Pão, 2x hambúrguer 170g, 2x cheddar americano, 2x bacon e 2x catupiry', 38.00),
    ('Lanches Artesanais',   'Insano',               'Pão, hambúrguer 170g de fraldinha, presunto, muçarela, catupiry, bacon, ovo, tomate e alface', 35.00),
    ('Lanches Artesanais',   'Big Saboritos',        'Pão, hambúrguer 170g de fraldinha, cheddar americano, doritos, cebola empanada, bacon e barbecue', 34.00),
    ('Lanches Artesanais',   'Especial Salada',      'Pão, hambúrguer 170g de fraldinha, catupiry, cheddar americano, bacon, tomate, alface e cebola roxa', 33.00),
    ('Lanches com Frango',   'X-Frango',       'Pão, frango, presunto, muçarela, tomate e alface', 25.00),
    ('Lanches com Frango',   'X-Frango Tudo',  'Pão, frango, presunto, muçarela, ovo, bacon, catupiry, tomate e alface', 32.00),
    ('Lanches com Lombo',    'X-Lombo',        'Pão, lombo, presunto, muçarela, tomate e alface', 25.00),
    ('Lanches com Lombo',    'X-Lombo Tudo',   'Pão, lombo, presunto, muçarela, catupiry, bacon, ovo, tomate e alface', 32.00),
    ('Lanches com Filé',     'X-Filé',         'Pão, filé mignon, presunto, muçarela, tomate e alface', 35.00),
    ('Lanches com Filé',     'X-Filé Tudo',    'Pão, filé mignon, presunto, muçarela, bacon, catupiry, ovo, tomate e alface', 43.00),
    ('Omeletes',             'Omelete de Frango', 'Frango, presunto, muçarela, bacon, catupiry, milho e batata palha', 40.00),
    ('Omeletes',             'Omelete de Filé',   'Filé mignon, presunto, muçarela, bacon, catupiry, milho e batata palha', 50.00),
    ('Omeletes',             'Omelete de Lombo',  'Lombo, presunto, muçarela, bacon, catupiry, milho e batata palha', 40.00),
    ('Batata Frita',         'Batata Frita Grande', 'Porção grande. Sabores: cheddar e bacon ou catupiry e bacon', 36.00),
    ('Batata Frita',         'Batata Frita Média',  'Porção média. Sabores: cheddar e bacon ou catupiry e bacon', 30.00)
) AS v(categoria, nome, descricao, preco)
JOIN categoria c ON c.nome = v.categoria;

INSERT INTO fornecedor (nome, telefone) VALUES
    ('Frigorífico Boa Carne',      '(35) 3000-1001'),
    ('Laticínios Serra Azul',      '(35) 3000-1002'),
    ('Panificadora Bom Pão',       '(35) 3000-1003'),
    ('Hortifruti do Vale',         '(35) 3000-1004'),
    ('Granja Ovos Frescos',        '(35) 3000-1005'),
    ('Distribuidora Doce Sabor',   '(35) 3000-1006');

INSERT INTO ingrediente (id_fornecedor, nome, preco_adicional, estoque_atual, estoque_minimo)
SELECT f.id_fornecedor, v.nome, v.preco_adicional, v.estoque_atual, v.estoque_minimo
FROM (VALUES
    ('Panificadora Bom Pão',     'Pão',                           NULL,  120, 40),
    ('Frigorífico Boa Carne',    'Hambúrguer',                    6.00,   90, 30),
    ('Frigorífico Boa Carne',    'Hambúrguer de fraldinha 170g',  NULL,   60, 20),
    ('Frigorífico Boa Carne',    'Presunto',                      2.50,    8,  3),
    ('Laticínios Serra Azul',    'Muçarela',                      3.00,   10,  4),
    ('Frigorífico Boa Carne',    'Bacon',                         4.00,    6,  3),
    ('Laticínios Serra Azul',    'Catupiry',                      3.00,    5,  2),
    ('Granja Ovos Frescos',      'Ovo',                           2.00,  180, 60),
    ('Frigorífico Boa Carne',    'Salsicha',                      NULL,    4,  2),
    ('Distribuidora Doce Sabor', 'Milho',                         1.50,    6,  2),
    ('Hortifruti do Vale',       'Tomate',                        1.00,    5,  2),
    ('Hortifruti do Vale',       'Alface',                        1.00,    8,  3),
    ('Frigorífico Boa Carne',    'Frango',                        NULL,    7,  3),
    ('Frigorífico Boa Carne',    'Lombo',                         NULL,    7,  3),
    ('Frigorífico Boa Carne',    'Filé mignon',                   NULL,    5,  2),
    ('Laticínios Serra Azul',    'Cheddar americano',             3.00,    4,  2),
    ('Distribuidora Doce Sabor', 'Barbecue',                      2.00,    3,  1),
    ('Hortifruti do Vale',       'Cebola roxa',                   1.50,    3,  1),
    ('Distribuidora Doce Sabor', 'Cebola empanada',               NULL,    1,  1),
    ('Distribuidora Doce Sabor', 'Doritos',                       NULL,   12,  4),
    ('Distribuidora Doce Sabor', 'Batata palha',                  NULL,    2,  2),
    ('Hortifruti do Vale',       'Batata',                        NULL,   20,  8)
) AS v(fornecedor, nome, preco_adicional, estoque_atual, estoque_minimo)
JOIN fornecedor f ON f.nome = v.fornecedor;

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela','Bacon','Catupiry','Ovo','Salsicha','Milho','Tomate','Alface'])
WHERE p.nome = 'X-Tudo';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Filé mignon','Lombo','Frango','Presunto','Muçarela','Bacon','Catupiry','Ovo','Milho','Salsicha','Tomate','Alface'])
WHERE p.nome = 'X-Especial 2000';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela','Bacon','Ovo','Tomate','Alface'])
WHERE p.nome = 'X-Bacon';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela','Ovo','Catupiry','Tomate','Alface'])
WHERE p.nome = 'X-Egg Catupiry';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela','Ovo','Tomate','Alface'])
WHERE p.nome = 'X-Egg Salada';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela'])
WHERE p.nome = 'X-Burguer';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela','Catupiry'])
WHERE p.nome = 'X-Catupa';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer','Presunto','Muçarela','Tomate','Alface'])
WHERE p.nome = 'X-Salada';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Presunto','Muçarela','Tomate'])
WHERE p.nome = 'X-Bauru';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer de fraldinha 170g','Cheddar americano','Barbecue','Catupiry','Bacon','Cebola roxa'])
WHERE p.nome = 'Especial da Casa';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer de fraldinha 170g','Cheddar americano','Bacon','Catupiry'])
WHERE p.nome = 'Duplo Cheddar Bacon';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer de fraldinha 170g','Presunto','Muçarela','Catupiry','Bacon','Ovo','Tomate','Alface'])
WHERE p.nome = 'Insano';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer de fraldinha 170g','Cheddar americano','Doritos','Cebola empanada','Bacon','Barbecue'])
WHERE p.nome = 'Big Saboritos';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Hambúrguer de fraldinha 170g','Catupiry','Cheddar americano','Bacon','Tomate','Alface','Cebola roxa'])
WHERE p.nome = 'Especial Salada';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Frango','Presunto','Muçarela','Tomate','Alface'])
WHERE p.nome = 'X-Frango';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Frango','Presunto','Muçarela','Ovo','Bacon','Catupiry','Tomate','Alface'])
WHERE p.nome = 'X-Frango Tudo';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Lombo','Presunto','Muçarela','Tomate','Alface'])
WHERE p.nome = 'X-Lombo';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Lombo','Presunto','Muçarela','Catupiry','Bacon','Ovo','Tomate','Alface'])
WHERE p.nome = 'X-Lombo Tudo';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Filé mignon','Presunto','Muçarela','Tomate','Alface'])
WHERE p.nome = 'X-Filé';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Pão','Filé mignon','Presunto','Muçarela','Bacon','Catupiry','Ovo','Tomate','Alface'])
WHERE p.nome = 'X-Filé Tudo';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Ovo','Frango','Presunto','Muçarela','Bacon','Catupiry','Milho','Batata palha'])
WHERE p.nome = 'Omelete de Frango';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Ovo','Filé mignon','Presunto','Muçarela','Bacon','Catupiry','Milho','Batata palha'])
WHERE p.nome = 'Omelete de Filé';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Ovo','Lombo','Presunto','Muçarela','Bacon','Catupiry','Milho','Batata palha'])
WHERE p.nome = 'Omelete de Lombo';

INSERT INTO produto_ingrediente (id_produto, id_ingrediente)
SELECT p.id_produto, i.id_ingrediente
FROM produto p
JOIN ingrediente i ON i.nome = ANY (ARRAY['Batata','Bacon','Cheddar americano','Catupiry'])
WHERE p.nome IN ('Batata Frita Grande', 'Batata Frita Média');

INSERT INTO cliente (nome, telefone, endereco) VALUES
    ('Mariana Souza',         '(35) 99100-0001', 'Rua das Flores, 120 - Centro'),
    ('Carlos Eduardo Lima',   '(35) 99100-0002', 'Av. Brasil, 845 - Jardim América'),
    ('Fernanda Alves',        '(35) 99100-0003', 'Rua Minas Gerais, 77 - Vila Nova'),
    ('João Pedro Santos',     '(35) 99100-0004', 'Rua Sete de Setembro, 310 - Centro'),
    ('Patrícia Oliveira',     '(35) 99100-0005', 'Rua das Acácias, 59 - Jardim Primavera'),
    ('Rafael Mendes',         '(35) 99100-0006', 'Rua Tiradentes, 402 - Bela Vista'),
    ('Juliana Costa',         '(35) 99100-0007', 'Av. Getúlio Vargas, 1500 - Centro'),
    ('Lucas Ferreira',        '(35) 99100-0008', 'Rua dos Ipês, 88 - Jardim Europa'),
    ('Camila Rocha',          '(35) 99100-0009', 'Rua Santa Luzia, 215 - Vila Santa Cruz'),
    ('Bruno Carvalho',        '(35) 99100-0010', 'Rua Dom Pedro II, 640 - Centro'),
    ('Aline Martins',         '(35) 99100-0011', 'Rua das Palmeiras, 33 - Jardim Planalto'),
    ('Thiago Ribeiro',        '(35) 99100-0012', 'Rua São José, 190 - Vila Operária');

INSERT INTO pedido (id_cliente, data_hora, tipo, status, forma_pagamento) VALUES
    (1,    '2026-11-02 19:10', 'ENTREGA', 'ENTREGUE',   'PIX'),
    (NULL, '2026-11-02 19:40', 'BALCAO',  'ENTREGUE',   'DINHEIRO'),
    (2,    '2026-11-02 20:15', 'ENTREGA', 'ENTREGUE',   'CARTAO'),
    (3,    '2026-11-03 19:05', 'ENTREGA', 'ENTREGUE',   'PIX'),
    (11,   '2026-11-03 20:30', 'BALCAO',  'ENTREGUE',   'CARTAO'),
    (4,    '2026-11-04 19:20', 'ENTREGA', 'ENTREGUE',   'DINHEIRO'),
    (5,    '2026-11-04 21:00', 'BALCAO',  'ENTREGUE',   'PIX'),
    (6,    '2026-11-05 19:45', 'ENTREGA', 'ENTREGUE',   'PIX'),
    (NULL, '2026-11-05 20:10', 'BALCAO',  'ENTREGUE',   'DINHEIRO'),
    (7,    '2026-11-06 19:30', 'ENTREGA', 'ENTREGUE',   'CARTAO'),
    (1,    '2026-11-06 20:50', 'ENTREGA', 'ENTREGUE',   'PIX'),
    (8,    '2026-11-07 19:15', 'ENTREGA', 'ENTREGUE',   'DINHEIRO'),
    (12,   '2026-11-07 20:00', 'BALCAO',  'ENTREGUE',   'PIX'),
    (9,    '2026-11-08 19:35', 'ENTREGA', 'EM_PREPARO', 'PIX'),
    (10,   '2026-11-08 20:20', 'ENTREGA', 'RECEBIDO',   'CARTAO');

INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, observacao)
SELECT v.id_pedido, p.id_produto, v.quantidade, p.preco, v.observacao
FROM (VALUES
    (1,  'X-Tudo',               2, 'Sem milho'),
    (1,  'Batata Frita Grande',  1, 'Sabor cheddar e bacon'),
    (2,  'X-Bacon',              1, NULL),
    (3,  'X-Frango Tudo',        1, NULL),
    (3,  'X-Salada',             1, NULL),
    (4,  'Especial da Casa',     1, NULL),
    (4,  'Insano',               1, NULL),
    (4,  'Batata Frita Média',   1, 'Sabor catupiry e bacon'),
    (5,  'X-Burguer',            2, NULL),
    (5,  'X-Bauru',              1, NULL),
    (6,  'X-Egg Salada',         1, NULL),
    (6,  'X-Egg Catupiry',       1, NULL),
    (7,  'X-Filé Tudo',          1, NULL),
    (7,  'X-Tudo',               1, NULL),
    (8,  'Omelete de Frango',    1, NULL),
    (8,  'X-Lombo',              1, NULL),
    (9,  'X-Salada',             2, 'Sem tomate'),
    (10, 'Duplo Cheddar Bacon',  2, NULL),
    (10, 'Batata Frita Grande',  1, 'Sabor cheddar e bacon'),
    (11, 'X-Tudo',               1, NULL),
    (11, 'X-Catupa',             1, NULL),
    (12, 'Big Saboritos',        1, NULL),
    (12, 'Especial Salada',      1, NULL),
    (12, 'Batata Frita Média',   1, 'Sabor catupiry e bacon'),
    (13, 'X-Especial 2000',      1, NULL),
    (14, 'X-Lombo Tudo',         1, NULL),
    (14, 'Omelete de Lombo',     1, NULL),
    (15, 'X-Filé',               1, NULL),
    (15, 'Omelete de Filé',      1, NULL)
) AS v(id_pedido, produto, quantidade, observacao)
JOIN produto p ON p.nome = v.produto;

INSERT INTO item_pedido_adicional (id_item_pedido, id_ingrediente, quantidade, valor)
SELECT ip.id_item_pedido, i.id_ingrediente, v.quantidade, v.quantidade * i.preco_adicional
FROM (VALUES
    (2,  'X-Bacon',              'Ovo',               1),
    (3,  'X-Frango Tudo',        'Cheddar americano', 1),
    (4,  'Insano',               'Bacon',             1),
    (6,  'X-Egg Salada',         'Bacon',             1),
    (7,  'X-Tudo',               'Catupiry',          1),
    (10, 'Duplo Cheddar Bacon',  'Cebola roxa',       2),
    (12, 'Big Saboritos',        'Muçarela',          1),
    (15, 'X-Filé',               'Ovo',               1)
) AS v(id_pedido, produto, ingrediente, quantidade)
JOIN produto p        ON p.nome = v.produto
JOIN item_pedido ip   ON ip.id_pedido = v.id_pedido AND ip.id_produto = p.id_produto
JOIN ingrediente i    ON i.nome = v.ingrediente;

UPDATE pedido p
SET valor_total =
      COALESCE((SELECT SUM(ip.quantidade * ip.preco_unitario)
                FROM item_pedido ip
                WHERE ip.id_pedido = p.id_pedido), 0)
    + COALESCE((SELECT SUM(a.valor)
                FROM item_pedido_adicional a
                JOIN item_pedido ip ON ip.id_item_pedido = a.id_item_pedido
                WHERE ip.id_pedido = p.id_pedido), 0);

INSERT INTO compra (id_fornecedor, data_compra)
SELECT f.id_fornecedor, v.data_compra::date
FROM (VALUES
    ('Frigorífico Boa Carne',    '2026-10-26'),
    ('Laticínios Serra Azul',    '2026-10-26'),
    ('Panificadora Bom Pão',     '2026-10-27'),
    ('Hortifruti do Vale',       '2026-10-28'),
    ('Granja Ovos Frescos',      '2026-10-28'),
    ('Distribuidora Doce Sabor', '2026-10-30'),
    ('Frigorífico Boa Carne',    '2026-11-02'),
    ('Panificadora Bom Pão',     '2026-11-03'),
    ('Hortifruti do Vale',       '2026-11-05'),
    ('Laticínios Serra Azul',    '2026-11-06')
) AS v(fornecedor, data_compra)
JOIN fornecedor f ON f.nome = v.fornecedor;

INSERT INTO item_compra (id_compra, id_ingrediente, quantidade, valor_unitario)
SELECT v.id_compra, i.id_ingrediente, v.quantidade, v.valor_unitario
FROM (VALUES
    (1,  'Hambúrguer',                   100,  2.80),
    (1,  'Bacon',                          8, 38.00),
    (1,  'Presunto',                      10, 32.00),
    (1,  'Frango',                        10, 22.00),
    (2,  'Muçarela',                      12, 42.00),
    (2,  'Catupiry',                       6, 28.00),
    (2,  'Cheddar americano',              5, 35.00),
    (3,  'Pão',                          150,  0.90),
    (4,  'Tomate',                         6,  7.00),
    (4,  'Alface',                        10,  3.50),
    (4,  'Batata',                        25,  5.00),
    (5,  'Ovo',                          200,  0.60),
    (6,  'Doritos',                       12,  9.00),
    (6,  'Batata palha',                   5, 18.00),
    (6,  'Barbecue',                       4, 14.00),
    (7,  'Hambúrguer de fraldinha 170g',  60,  6.50),
    (7,  'Filé mignon',                    5, 65.00),
    (7,  'Lombo',                          8, 30.00),
    (8,  'Pão',                          100,  0.95),
    (9,  'Cebola roxa',                    3,  6.00),
    (9,  'Tomate',                         5,  7.50),
    (10, 'Muçarela',                      10, 43.00),
    (10, 'Catupiry',                       5, 28.50)
) AS v(id_compra, ingrediente, quantidade, valor_unitario)
JOIN ingrediente i ON i.nome = v.ingrediente;

UPDATE compra c
SET valor_total = COALESCE((SELECT SUM(ic.quantidade * ic.valor_unitario)
                            FROM item_compra ic
                            WHERE ic.id_compra = c.id_compra), 0);`;

export const TABLE_COUNTS_SQL = `SELECT 'categoria' AS tabela, COUNT(*)::int AS registros FROM categoria
UNION ALL SELECT 'produto', COUNT(*)::int FROM produto
UNION ALL SELECT 'fornecedor', COUNT(*)::int FROM fornecedor
UNION ALL SELECT 'ingrediente', COUNT(*)::int FROM ingrediente
UNION ALL SELECT 'produto_ingrediente', COUNT(*)::int FROM produto_ingrediente
UNION ALL SELECT 'cliente', COUNT(*)::int FROM cliente
UNION ALL SELECT 'pedido', COUNT(*)::int FROM pedido
UNION ALL SELECT 'item_pedido', COUNT(*)::int FROM item_pedido
UNION ALL SELECT 'item_pedido_adicional', COUNT(*)::int FROM item_pedido_adicional
UNION ALL SELECT 'compra', COUNT(*)::int FROM compra
UNION ALL SELECT 'item_compra', COUNT(*)::int FROM item_compra;`;

export interface AnalyticalQueryDef {
  id: number;
  title: string;
  question: string;
  concepts: string[];
  sql: string;
}

export const ANALYTICAL_QUERIES: AnalyticalQueryDef[] = [
  {
    id: 1,
    title: 'Vendas por dia',
    question: 'Quanto vende por dia? Faturamento, número de pedidos e ticket médio de cada dia.',
    concepts: ['GROUP BY', 'COUNT', 'SUM', 'ROUND(AVG)', '::date'],
    sql: `SELECT
    p.data_hora::date                AS dia,
    COUNT(p.id_pedido)               AS total_pedidos,
    SUM(p.valor_total)               AS faturamento,
    ROUND(AVG(p.valor_total), 2)     AS ticket_medio
FROM pedido p
WHERE p.status <> 'CANCELADO'
GROUP BY p.data_hora::date
ORDER BY dia;`,
  },
  {
    id: 2,
    title: 'Dias de maior movimento (> R$ 150)',
    question: 'Dias de maior movimento: faturamento diário acima de R$ 150,00.',
    concepts: ['GROUP BY', 'HAVING', 'SUM', 'ORDER BY DESC'],
    sql: `SELECT
    p.data_hora::date  AS dia,
    SUM(p.valor_total) AS faturamento
FROM pedido p
WHERE p.status <> 'CANCELADO'
GROUP BY p.data_hora::date
HAVING SUM(p.valor_total) > 150
ORDER BY faturamento DESC;`,
  },
  {
    id: 3,
    title: 'Total de compras por mês',
    question: 'Quanto gastou? Total de compras de insumos agrupado por mês.',
    concepts: ['TO_CHAR', 'GROUP BY', 'COUNT', 'SUM'],
    sql: `SELECT
    TO_CHAR(c.data_compra, 'YYYY-MM') AS mes,
    COUNT(c.id_compra)                AS total_compras,
    SUM(c.valor_total)                AS total_gasto
FROM compra c
GROUP BY TO_CHAR(c.data_compra, 'YYYY-MM')
ORDER BY mes;`,
  },
  {
    id: 4,
    title: 'Fornecedores que mais receberam (> R$ 500)',
    question: 'Fornecedores cujo total gasto em compras ultrapassa R$ 500,00.',
    concepts: ['INNER JOIN', 'GROUP BY', 'HAVING', 'SUM'],
    sql: `SELECT
    f.nome             AS fornecedor,
    COUNT(c.id_compra) AS total_compras,
    SUM(c.valor_total) AS total_gasto
FROM fornecedor f
INNER JOIN compra c ON c.id_fornecedor = f.id_fornecedor
GROUP BY f.id_fornecedor, f.nome
HAVING SUM(c.valor_total) > 500
ORDER BY total_gasto DESC;`,
  },
  {
    id: 5,
    title: 'Ranking de produtos mais vendidos',
    question: 'Qual lanche vende mais? Top 10 produtos por unidades vendidas e faturamento.',
    concepts: ['INNER JOIN', 'SUM', 'LIMIT 10', 'ORDER BY'],
    sql: `SELECT
    pr.nome                                   AS produto,
    SUM(ip.quantidade)                        AS unidades_vendidas,
    SUM(ip.quantidade * ip.preco_unitario)    AS faturamento
FROM produto pr
INNER JOIN item_pedido ip ON ip.id_produto = pr.id_produto
INNER JOIN pedido p       ON p.id_pedido   = ip.id_pedido
WHERE p.status <> 'CANCELADO'
GROUP BY pr.id_produto, pr.nome
ORDER BY unidades_vendidas DESC, faturamento DESC
LIMIT 10;`,
  },
  {
    id: 6,
    title: 'Faturamento por categoria',
    question: 'Faturamento e unidades vendidas por categoria do cardápio.',
    concepts: ['4 Tabelas JOIN', 'GROUP BY', 'SUM'],
    sql: `SELECT
    ca.nome                                   AS categoria,
    SUM(ip.quantidade)                        AS unidades_vendidas,
    SUM(ip.quantidade * ip.preco_unitario)    AS faturamento
FROM categoria ca
INNER JOIN produto pr     ON pr.id_categoria = ca.id_categoria
INNER JOIN item_pedido ip ON ip.id_produto   = pr.id_produto
INNER JOIN pedido p       ON p.id_pedido     = ip.id_pedido
WHERE p.status <> 'CANCELADO'
GROUP BY ca.id_categoria, ca.nome
ORDER BY faturamento DESC;`,
  },
  {
    id: 7,
    title: 'Ticket médio: Balcão x Entrega',
    question: 'Comparativo de volume, ticket médio e faturamento entre BALCAO e ENTREGA.',
    concepts: ['GROUP BY', 'ROUND(AVG)', 'COUNT', 'SUM'],
    sql: `SELECT
    p.tipo                         AS tipo_pedido,
    COUNT(p.id_pedido)             AS total_pedidos,
    ROUND(AVG(p.valor_total), 2)   AS ticket_medio,
    SUM(p.valor_total)             AS faturamento
FROM pedido p
WHERE p.status <> 'CANCELADO'
GROUP BY p.tipo
ORDER BY faturamento DESC;`,
  },
  {
    id: 8,
    title: 'Entradas por forma de pagamento',
    question: 'Quanto entra por forma de pagamento (DINHEIRO, PIX, CARTAO).',
    concepts: ['GROUP BY', 'COUNT', 'SUM'],
    sql: `SELECT
    p.forma_pagamento     AS pagamento,
    COUNT(p.id_pedido)    AS total_pedidos,
    SUM(p.valor_total)    AS faturamento
FROM pedido p
WHERE p.status <> 'CANCELADO'
GROUP BY p.forma_pagamento
ORDER BY faturamento DESC;`,
  },
  {
    id: 9,
    title: 'Clientes frequentes (2+ pedidos)',
    question: 'Clientes que realizaram 2 ou mais pedidos válidos.',
    concepts: ['INNER JOIN', 'GROUP BY', 'HAVING COUNT >= 2'],
    sql: `SELECT
    c.nome                      AS cliente,
    COUNT(p.id_pedido)          AS total_pedidos,
    SUM(p.valor_total)          AS total_gasto,
    ROUND(AVG(p.valor_total), 2) AS ticket_medio
FROM cliente c
INNER JOIN pedido p ON p.id_cliente = c.id_cliente
WHERE p.status <> 'CANCELADO'
GROUP BY c.id_cliente, c.nome
HAVING COUNT(p.id_pedido) >= 2
ORDER BY total_gasto DESC;`,
  },
  {
    id: 10,
    title: 'Ingredientes no estoque mínimo',
    question: 'O que está acabando? Ingredientes com estoque_atual <= estoque_minimo e contato do fornecedor.',
    concepts: ['INNER JOIN', 'WHERE <=', 'ORDER BY expressão'],
    sql: `SELECT
    i.nome            AS ingrediente,
    i.estoque_atual,
    i.estoque_minimo,
    f.nome            AS fornecedor,
    f.telefone
FROM ingrediente i
INNER JOIN fornecedor f ON f.id_fornecedor = i.id_fornecedor
WHERE i.estoque_atual <= i.estoque_minimo
ORDER BY i.estoque_atual - i.estoque_minimo, i.nome;`,
  },
  {
    id: 11,
    title: 'Adicionais mais pedidos',
    question: 'Quais ingredientes extras os clientes mais adicionam nos lanches.',
    concepts: ['INNER JOIN', 'SUM', 'ORDER BY DESC'],
    sql: `SELECT
    i.nome                 AS adicional,
    SUM(a.quantidade)      AS vezes_pedido,
    SUM(a.valor)           AS receita_adicionais
FROM item_pedido_adicional a
INNER JOIN ingrediente i ON i.id_ingrediente = a.id_ingrediente
GROUP BY i.id_ingrediente, i.nome
ORDER BY vezes_pedido DESC, receita_adicionais DESC;`,
  },
  {
    id: 12,
    title: 'Produtos nunca vendidos',
    question: 'Produtos do cardápio que nunca apareceram em item_pedido.',
    concepts: ['LEFT JOIN', 'IS NULL'],
    sql: `SELECT
    pr.nome  AS produto,
    pr.preco
FROM produto pr
LEFT JOIN item_pedido ip ON ip.id_produto = pr.id_produto
WHERE ip.id_item_pedido IS NULL
ORDER BY pr.nome;`,
  },
  {
    id: 13,
    title: 'Pedidos em andamento (tela do dono)',
    question: 'Pedidos RECEBIDO, EM_PREPARO ou PRONTO com cliente (ou Balcão) e total de itens.',
    concepts: ['LEFT JOIN', 'INNER JOIN', 'COALESCE', 'WHERE IN'],
    sql: `SELECT
    p.id_pedido,
    p.data_hora,
    COALESCE(c.nome, 'Balcão (sem cadastro)') AS cliente,
    p.tipo,
    p.status,
    SUM(ip.quantidade)                        AS total_itens,
    p.valor_total
FROM pedido p
LEFT JOIN cliente c       ON c.id_cliente = p.id_cliente
INNER JOIN item_pedido ip ON ip.id_pedido = p.id_pedido
WHERE p.status IN ('RECEBIDO', 'EM_PREPARO', 'PRONTO')
GROUP BY p.id_pedido, p.data_hora, c.nome, p.tipo, p.status, p.valor_total
ORDER BY p.data_hora;`,
  },
];

export interface SchemaColumnMeta {
  name: string;
  type: string;
  constraints: string[];
  fkTarget?: string;
}

export interface SchemaTableMeta {
  name: string;
  group: 'Cardápio' | 'Estoque & Fornecedores' | 'Clientes & Pedidos' | 'Compras';
  description: string;
  columns: SchemaColumnMeta[];
  tableConstraints?: string[];
}

export const SCHEMA_TABLES: SchemaTableMeta[] = [
  {
    name: 'categoria',
    group: 'Cardápio',
    description: 'Categorias do cardápio da lanchonete.',
    columns: [
      { name: 'id_categoria', type: 'SERIAL', constraints: ['PK'] },
      { name: 'nome', type: 'VARCHAR(50)', constraints: ['NOT NULL', 'UNIQUE'] },
    ],
  },
  {
    name: 'produto',
    group: 'Cardápio',
    description: 'Lanches, omeletes e porções disponíveis para venda.',
    columns: [
      { name: 'id_produto', type: 'SERIAL', constraints: ['PK'] },
      { name: 'id_categoria', type: 'INT', constraints: ['NOT NULL', 'FK'], fkTarget: 'categoria(id_categoria)' },
      { name: 'nome', type: 'VARCHAR(80)', constraints: ['NOT NULL', 'UNIQUE'] },
      { name: 'descricao', type: 'VARCHAR(255)', constraints: [] },
      { name: 'preco', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'CHECK >= 0'] },
    ],
  },
  {
    name: 'produto_ingrediente',
    group: 'Cardápio',
    description: 'Tabela associativa N:N com a composição padrão de cada produto.',
    columns: [
      { name: 'id_produto', type: 'INT', constraints: ['PK', 'FK (CASCADE)'], fkTarget: 'produto(id_produto)' },
      { name: 'id_ingrediente', type: 'INT', constraints: ['PK', 'FK'], fkTarget: 'ingrediente(id_ingrediente)' },
    ],
  },
  {
    name: 'fornecedor',
    group: 'Estoque & Fornecedores',
    description: 'Fornecedores de insumos e matérias-primas.',
    columns: [
      { name: 'id_fornecedor', type: 'SERIAL', constraints: ['PK'] },
      { name: 'nome', type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
      { name: 'telefone', type: 'VARCHAR(20)', constraints: [] },
    ],
  },
  {
    name: 'ingrediente',
    group: 'Estoque & Fornecedores',
    description: 'Ingredientes em estoque e preço opcional como adicional.',
    columns: [
      { name: 'id_ingrediente', type: 'SERIAL', constraints: ['PK'] },
      { name: 'id_fornecedor', type: 'INT', constraints: ['NOT NULL', 'FK'], fkTarget: 'fornecedor(id_fornecedor)' },
      { name: 'nome', type: 'VARCHAR(80)', constraints: ['NOT NULL', 'UNIQUE'] },
      { name: 'preco_adicional', type: 'NUMERIC(10,2)', constraints: ['CHECK >= 0'] },
      { name: 'estoque_atual', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'DEFAULT 0', 'CHECK >= 0'] },
      { name: 'estoque_minimo', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'DEFAULT 0', 'CHECK >= 0'] },
    ],
  },
  {
    name: 'cliente',
    group: 'Clientes & Pedidos',
    description: 'Cadastro de clientes para pedidos com entrega ou identificação.',
    columns: [
      { name: 'id_cliente', type: 'SERIAL', constraints: ['PK'] },
      { name: 'nome', type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
      { name: 'telefone', type: 'VARCHAR(20)', constraints: [] },
      { name: 'endereco', type: 'VARCHAR(200)', constraints: [] },
    ],
  },
  {
    name: 'pedido',
    group: 'Clientes & Pedidos',
    description: 'Cabeçalho dos pedidos de balcão e entrega.',
    columns: [
      { name: 'id_pedido', type: 'SERIAL', constraints: ['PK'] },
      { name: 'id_cliente', type: 'INT', constraints: ['FK (NULL p/ BALCAO)'], fkTarget: 'cliente(id_cliente)' },
      { name: 'data_hora', type: 'TIMESTAMP', constraints: ['NOT NULL', 'DEFAULT CURRENT_TIMESTAMP'] },
      { name: 'tipo', type: 'VARCHAR(10)', constraints: ['NOT NULL', "IN ('BALCAO','ENTREGA')"] },
      { name: 'status', type: 'VARCHAR(15)', constraints: ['NOT NULL', "DEFAULT 'RECEBIDO'"] },
      { name: 'forma_pagamento', type: 'VARCHAR(10)', constraints: ['NOT NULL', "IN ('DINHEIRO','PIX','CARTAO')"] },
      { name: 'valor_total', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'DEFAULT 0', 'CHECK >= 0'] },
    ],
    tableConstraints: ["CONSTRAINT ck_entrega_com_cliente CHECK (tipo = 'BALCAO' OR id_cliente IS NOT NULL)"],
  },
  {
    name: 'item_pedido',
    group: 'Clientes & Pedidos',
    description: 'Itens de cada pedido com snapshot de preco_unitario.',
    columns: [
      { name: 'id_item_pedido', type: 'SERIAL', constraints: ['PK'] },
      { name: 'id_pedido', type: 'INT', constraints: ['NOT NULL', 'FK (CASCADE)'], fkTarget: 'pedido(id_pedido)' },
      { name: 'id_produto', type: 'INT', constraints: ['NOT NULL', 'FK'], fkTarget: 'produto(id_produto)' },
      { name: 'quantidade', type: 'INT', constraints: ['NOT NULL', 'CHECK > 0'] },
      { name: 'preco_unitario', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'CHECK >= 0'] },
      { name: 'observacao', type: 'VARCHAR(200)', constraints: [] },
    ],
  },
  {
    name: 'item_pedido_adicional',
    group: 'Clientes & Pedidos',
    description: 'Ingredientes extras adicionados a um item_pedido.',
    columns: [
      { name: 'id_item_pedido', type: 'INT', constraints: ['PK', 'FK (CASCADE)'], fkTarget: 'item_pedido(id_item_pedido)' },
      { name: 'id_ingrediente', type: 'INT', constraints: ['PK', 'FK'], fkTarget: 'ingrediente(id_ingrediente)' },
      { name: 'quantidade', type: 'INT', constraints: ['NOT NULL', 'DEFAULT 1', 'CHECK > 0'] },
      { name: 'valor', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'CHECK >= 0'] },
    ],
  },
  {
    name: 'compra',
    group: 'Compras',
    description: 'Compras de reposição de insumos junto a fornecedores.',
    columns: [
      { name: 'id_compra', type: 'SERIAL', constraints: ['PK'] },
      { name: 'id_fornecedor', type: 'INT', constraints: ['NOT NULL', 'FK'], fkTarget: 'fornecedor(id_fornecedor)' },
      { name: 'data_compra', type: 'DATE', constraints: ['NOT NULL', 'DEFAULT CURRENT_DATE'] },
      { name: 'valor_total', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'DEFAULT 0', 'CHECK >= 0'] },
    ],
  },
  {
    name: 'item_compra',
    group: 'Compras',
    description: 'Itens e custos unitários de cada compra de estoque.',
    columns: [
      { name: 'id_compra', type: 'INT', constraints: ['PK', 'FK (CASCADE)'], fkTarget: 'compra(id_compra)' },
      { name: 'id_ingrediente', type: 'INT', constraints: ['PK', 'FK'], fkTarget: 'ingrediente(id_ingrediente)' },
      { name: 'quantidade', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'CHECK > 0'] },
      { name: 'valor_unitario', type: 'NUMERIC(10,2)', constraints: ['NOT NULL', 'CHECK >= 0'] },
    ],
  },
];

export const ALLOWED_TABLE_NAMES = SCHEMA_TABLES.map((t) => t.name);

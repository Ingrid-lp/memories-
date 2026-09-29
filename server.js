const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const multer = require('multer');
const path = require('path');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração do armazenamento do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// MIDDLEWARES
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.json());

app.use(express.static(__dirname));

// Configurações do banco de dados MySQL
const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT
});

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }

    console.log('Conectado ao MySQL com sucesso!');

    // =====================================================
    // TABELA DE USUÁRIOS
    // Nome correto: memories_users
    // =====================================================

    const createUsersTable = `CREATE TABLE IF NOT EXISTS memories_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    )`;

    // =====================================================
    // TABELA DE ÁLBUNS
    // Nome correto: memories_albums
    // =====================================================

    const createAlbumsTable = `CREATE TABLE IF NOT EXISTS memories_albums (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        userId INT,
        FOREIGN KEY (userId) REFERENCES memories_users(id) ON DELETE CASCADE
    )`;

    // =====================================================
    // TABELA DE MEMÓRIAS
    // Nome correto: memories
    // =====================================================

    const createMemoriesTable = `CREATE TABLE IF NOT EXISTS memories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        date VARCHAR(255),
        imageUrl TEXT,
        userId INT,
        sentiment VARCHAR(255) NOT NULL,
        FOREIGN KEY (userId) REFERENCES memories_users(id) ON DELETE CASCADE
    )`;

    // =====================================================
    // TABELA DE LIGAÇÃO
    // Nome correto: memory_albums
    // =====================================================

    const createMemoryAlbumsTable = `CREATE TABLE IF NOT EXISTS memory_albums (
        memoryId INT,
        albumId INT,
        PRIMARY KEY (memoryId, albumId),
        FOREIGN KEY (memoryId) REFERENCES memories(id) ON DELETE CASCADE,
        FOREIGN KEY (albumId) REFERENCES memories_albums(id) ON DELETE CASCADE
    )`;

    db.query(createUsersTable, err => {
        if (err) {
            console.error(
                'Erro ao criar tabela memories_users:',
                err
            );
        }
    });

    db.query(createAlbumsTable, err => {
        if (err) {
            console.error(
                'Erro ao criar tabela memories_albums:',
                err
            );
        }
    });

    db.query(createMemoriesTable, err => {
        if (err) {
            console.error(
                'Erro ao criar tabela memories:',
                err
            );
        }
    });

    db.query(createMemoryAlbumsTable, err => {
        if (err) {
            console.error(
                'Erro ao criar tabela memory_albums:',
                err
            );
        }
    });
});

// =====================================================
// AUTENTICAÇÃO
// =====================================================

// CADASTRO DE USUÁRIO
// Tabela: memories_users

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    const query = `
        INSERT INTO memories_users
        (name, email, password)
        VALUES (?, ?, ?)
    `;

    db.query(
        query,
        [name, email, password],
        (err, result) => {

            if (err) {

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        message: 'Email já cadastrado.'
                    });
                }

                return res.status(500).json({
                    error: err.message
                });
            }

            res.status(201).json({
                message: 'Conta criada com sucesso!'
            });
        }
    );
});

// LOGIN
// Tabela: memories_users

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `
        SELECT id, name
        FROM memories_users
        WHERE email = ?
        AND password = ?
    `;

    db.query(
        query,
        [email, password],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (results.length > 0) {

                res.json({
                    user: {
                        id: results[0].id,
                        name: results[0].name
                    }
                });

            } else {

                res.status(401).json({
                    message: 'Email ou senha incorretos.'
                });
            }
        }
    );
});

// =====================================================
// MEMÓRIAS
// =====================================================

// BUSCAR MEMÓRIAS
// Tabelas:
// memories
// memory_albums

app.get('/memories/:userId', (req, res) => {

    const { userId } = req.params;

    const query = `
        SELECT
            m.*,
            GROUP_CONCAT(ma.albumId) AS albumIds

        FROM memories m

        LEFT JOIN memory_albums ma
            ON m.id = ma.memoryId

        WHERE m.userId = ?

        GROUP BY m.id
    `;

    db.query(
        query,
        [userId],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            const formattedResults = results.map(m => ({
                ...m,

                albumIds: m.albumIds
                    ? m.albumIds
                        .split(',')
                        .map(id => Number(id))
                    : []
            }));

            res.json(formattedResults);
        }
    );
});

// CADASTRAR MEMÓRIA
// Tabela: memories

app.post(
    '/memories',
    upload.single('memoryImage'),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                message:
                    'O ficheiro da memória (imagem) é obrigatório.'
            });
        }

        const imageUrl =
            `/uploads/${req.file.filename}`;

        const {
            title,
            description,
            date,
            userId,
            sentiment
        } = req.body;

        if (
            !sentiment ||
            sentiment.trim() === ''
        ) {
            return res.status(400).json({
                message:
                    'O campo Sentimento é obrigatório.'
            });
        }

        const query = `
            INSERT INTO memories
            (
                title,
                description,
                date,
                imageUrl,
                userId,
                sentiment
            )

            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            query,
            [
                title,
                description,
                date,
                imageUrl,
                userId,
                sentiment
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        'Erro ao inserir no banco de dados:',
                        err
                    );

                    return res.status(500).json({
                        error: err.message
                    });
                }

                res.status(201).json({
                    id: result.insertId,
                    imageUrl: imageUrl,
                    message:
                        'Memória adicionada com sucesso!'
                });
            }
        );
    }
);

// ATUALIZAR MEMÓRIA
// Tabela: memories

app.put('/memories/:id', (req, res) => {

    const { id } = req.params;

    const {
        title,
        description,
        date,
        sentiment
    } = req.body;

    if (
        !sentiment ||
        sentiment.trim() === ''
    ) {
        return res.status(400).json({
            message:
                'O campo Sentimento é obrigatório.'
        });
    }

    const query = `
        UPDATE memories

        SET
            title = ?,
            description = ?,
            date = ?,
            sentiment = ?

        WHERE id = ?
    `;

    const params = [
        title,
        description,
        date,
        sentiment,
        id
    ];

    db.query(
        query,
        params,
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message:
                        'Memória não encontrada.'
                });
            }

            res.json({
                message:
                    'Memória atualizada com sucesso!'
            });
        }
    );
});

// EXCLUIR MEMÓRIA
// Tabela: memories

app.delete('/memories/:id', (req, res) => {

    const { id } = req.params;

    const query = `
        DELETE FROM memories
        WHERE id = ?
    `;

    db.query(
        query,
        [id],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message:
                        'Memória não encontrada.'
                });
            }

            res.json({
                message:
                    'Memória excluída com sucesso!'
            });
        }
    );
});

// =====================================================
// RELACIONAMENTO MEMÓRIA / ÁLBUM
// =====================================================

// ADICIONAR MEMÓRIA AO ÁLBUM
// Tabela: memory_albums

app.post('/memory_albums', (req, res) => {

    const {
        memoryId,
        albumId
    } = req.body;

    const query = `
        INSERT INTO memory_albums
        (memoryId, albumId)
        VALUES (?, ?)
    `;

    db.query(
        query,
        [memoryId, albumId],
        (err, result) => {

            if (err) {

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        message:
                            'Memória já está neste álbum.'
                    });
                }

                return res.status(500).json({
                    error: err.message
                });
            }

            res.status(201).json({
                message:
                    'Memória adicionada ao álbum com sucesso!'
            });
        }
    );
});

// REMOVER MEMÓRIA DO ÁLBUM
// Tabela: memory_albums

app.delete(
    '/memory_albums/:memoryId/:albumId',
    (req, res) => {

        const {
            memoryId,
            albumId
        } = req.params;

        const query = `
            DELETE FROM memory_albums

            WHERE memoryId = ?
            AND albumId = ?
        `;

        db.query(
            query,
            [memoryId, albumId],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message:
                            'Ligação não encontrada.'
                    });
                }

                res.json({
                    message:
                        'Memória removida do álbum com sucesso!'
                });
            }
        );
    }
);

// =====================================================
// ÁLBUNS
// =====================================================

// BUSCAR ÁLBUNS
// Tabela: memories_albums

app.get('/albums/:userId', (req, res) => {

    const { userId } = req.params;

    const query = `
        SELECT *
        FROM memories_albums
        WHERE userId = ?
    `;

    db.query(
        query,
        [userId],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(results);
        }
    );
});

// CRIAR ÁLBUM
// Tabela: memories_albums

app.post('/albums', (req, res) => {

    const {
        title,
        userId
    } = req.body;

    const query = `
        INSERT INTO memories_albums
        (title, userId)
        VALUES (?, ?)
    `;

    db.query(
        query,
        [title, userId],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.status(201).json({
                id: result.insertId,
                message:
                    'Álbum criado com sucesso!'
            });
        }
    );
});

// ATUALIZAR ÁLBUM
// Tabela: memories_albums

app.put('/albums/:id', (req, res) => {

    const { id } = req.params;

    const { title } = req.body;

    const query = `
        UPDATE memories_albums

        SET title = ?

        WHERE id = ?
    `;

    db.query(
        query,
        [title, id],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message:
                        'Álbum não encontrado.'
                });
            }

            res.json({
                message:
                    'Álbum atualizado com sucesso!'
            });
        }
    );
});

// EXCLUIR ÁLBUM
// Tabela: memories_albums

app.delete('/albums/:id', (req, res) => {

    const { id } = req.params;

    const query = `
        DELETE FROM memories_albums
        WHERE id = ?
    `;

    db.query(
        query,
        [id],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message:
                        'Álbum excluída com sucesso!'
                });
            }

            res.json({
                message:
                    'Álbum excluído com sucesso!'
            });
        }
    );
});

// =====================================================
// SENTIMENTOS
// =====================================================

// Tabela: memories

app.get('/sentiments/:userId', (req, res) => {

    const { userId } = req.params;

    const query = `
        SELECT
            sentiment,
            COUNT(*) AS count

        FROM memories

        WHERE userId = ?

        GROUP BY sentiment
    `;

    db.query(
        query,
        [userId],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(results);
        }
    );
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(port, () => {
    console.log(
        `Servidor rodando em http://localhost:${port}`
    );
});
